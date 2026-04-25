---
id: net-tls-configuration
type: primary
depth_role: leaf
focus: Detect network-level TLS deployment issues in reverse proxies and load balancers including weak cipher suites in server config, missing OCSP stapling, certificate management gaps, and TLS termination at wrong layer
parents:
  - index.md
covers:
  - TLS 1.0 or 1.1 enabled in nginx, haproxy, envoy, or traefik configuration
  - Weak cipher suites in reverse proxy or load balancer TLS configuration
  - Missing OCSP stapling on TLS-terminating proxy
  - Certificate expiry not monitored or automated
  - Missing certificate transparency logging
  - "TLS termination at wrong layer (proxy vs service mismatch)"
  - SNI not configured for multi-domain proxy deployments
  - Cipher suite preference not server-controlled
  - Missing session ticket rotation enabling passive decryption
  - "Incomplete certificate chain (missing intermediate) in proxy config"
  - Client certificate validation disabled, allowing any client to connect
  - Certificate chain not verified to a trusted root CA
  - "Certificate revocation not checked (no CRL or OCSP)"
  - "CN/SAN not validated against expected client identity"
  - Self-signed certificates used in production without certificate pinning
  - Certificate rotation not planned, leading to expiry-driven outages
  - mTLS bypassed by intermediary proxy that terminates TLS and forwards plaintext
  - Client certificate extracted from proxy header without verifying proxy trust boundary
  - "Weak key in client certificate (RSA < 2048, EC < 256)"
  - "Private key stored without adequate protection (unencrypted on disk, in source control)"
  - "TLS 1.0/1.1 enabled, exposing connections to BEAST, POODLE, and other protocol attacks"
  - SSLv3 enabled, vulnerable to POODLE and other critical attacks
  - "Weak cipher suites selected (NULL, EXPORT, DES, RC4, MD5-based MACs)"
  - Certificate with SHA-1 signature, vulnerable to collision attacks
  - Missing HSTS header, allowing SSL stripping attacks
  - TLS certificate verification disabled in HTTP clients
  - Self-signed certificates used in production without pinning
  - Certificate transparency not configured
  - Missing OCSP stapling increasing revocation check latency and privacy exposure
  - Wildcard certificates overused across trust boundaries
  - SNI not configured, causing certificate mismatch errors
  - Cipher suite order not server-preferred, allowing clients to negotiate weak ciphers
  - TLS session tickets with static keys, enabling passive decryption of recorded traffic
tags:
  - tls
  - ssl
  - nginx
  - haproxy
  - envoy
  - traefik
  - caddy
  - certificate
  - ocsp
  - sni
  - cipher
  - proxy
  - termination
  - mtls
  - certificates
  - authentication
  - mutual-auth
  - CWE-295
  - CWE-296
  - CWE-297
  - configuration
  - transport-security
  - CWE-326
  - CWE-327
aliases:
  - crypto-mtls
  - crypto-tls-configuration
activation:
  file_globs:
    - "**/*nginx*"
    - "**/*haproxy*"
    - "**/*envoy*"
    - "**/*traefik*"
    - "**/*caddy*"
    - "**/*ssl*"
    - "**/*tls*"
    - "**/*cert*"
    - "**/*proxy*"
    - "**/Caddyfile"
  keyword_matches:
    - TLS
    - tls
    - SSL
    - ssl
    - cipher
    - certificate
    - cert
    - HTTPS
    - nginx
    - haproxy
    - envoy
    - traefik
    - caddy
    - termination
    - OCSP
    - stapling
    - SNI
    - ALPN
  structural_signals:
    - Reverse proxy or load balancer TLS configuration
    - Certificate file path or chain specification
    - Cipher suite directive in server config
source:
  origin: file
  path: net-tls-configuration.md
  hash: "sha256:5ffea05f2b8a5b4c694a1cf65b03795cdf44c16a1691b8a7ede82300f7a1ead9"
---
# Network TLS Configuration

## When This Activates

Activates when diffs touch reverse proxy TLS configuration (nginx, haproxy, envoy, traefik, caddy), load balancer TLS settings, certificate file references, or TLS termination architecture. This reviewer focuses on **network-level TLS deployment** -- the configuration of TLS in infrastructure components that terminate or originate TLS connections. It complements `crypto-tls-configuration`, which covers **code-level TLS API usage** (client libraries, verify flags, programmatic TLS context). The distinction matters because network-level TLS is configured in proxy config files with different syntax and different defaults than application code, and the certificate management lifecycle (issuance, renewal, chain assembly) is an operational concern separate from code-level TLS usage.

## Audit Surface

- [ ] Nginx ssl_protocols directive including TLSv1 or TLSv1.1
- [ ] HAProxy ssl-min-ver set below TLSv1.2
- [ ] Envoy TLS context with minimum version below TLS 1.2
- [ ] Weak cipher in ssl_ciphers, ciphers, or cipher_suites directive
- [ ] Proxy TLS config without ssl_stapling or OCSP stapling enabled
- [ ] No certificate renewal automation (certbot, cert-manager, ACME)
- [ ] TLS terminated at edge but re-encrypted to backend without mTLS
- [ ] Multi-domain proxy without SNI-based certificate selection
- [ ] ssl_prefer_server_ciphers off (client chooses cipher)
- [ ] Session ticket keys not rotated (static or no rotation config)
- [ ] ssl_certificate directive pointing to leaf cert only (no chain)
- [ ] Traefik or Caddy TLS config overriding secure defaults with weaker settings
- [ ] Certificate pinning in proxy config (fragile, causes outages on rotation)

## Detailed Checks

### Protocol Version in Proxy Config
<!-- activation: keywords=["ssl_protocols", "ssl-min-ver", "tls_minimum_version", "minimum_protocol_version", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3", "version"] -->

- [ ] **TLS 1.0/1.1 in nginx**: flag `ssl_protocols` directives that include `TLSv1` or `TLSv1.1` -- deprecated by RFC 8996, vulnerable to BEAST (TLS 1.0) and lacking AEAD ciphers. Set `ssl_protocols TLSv1.2 TLSv1.3;`
- [ ] **TLS 1.0/1.1 in HAProxy**: flag `ssl-min-ver TLSv1.0` or `ssl-min-ver TLSv1.1` in HAProxy bind lines -- set `ssl-min-ver TLSv1.2`. Also check for `no-tlsv12` or `no-tlsv13` which disable newer versions
- [ ] **TLS 1.0/1.1 in Envoy**: flag Envoy TLS context with `tls_minimum_protocol_version` set to `TLSv1_0` or `TLSv1_1` -- set to `TLSv1_2` minimum
- [ ] **TLS 1.3 not enabled**: flag proxy configurations that explicitly exclude TLS 1.3 when the runtime supports it -- TLS 1.3 provides improved security (no CBC, mandatory PFS) and faster handshakes (1-RTT). All modern proxies support it

### Cipher Suite Configuration
<!-- activation: keywords=["cipher", "ssl_ciphers", "ciphers", "cipher_suites", "NULL", "EXPORT", "DES", "RC4", "MD5", "aNULL", "eNULL", "kRSA", "prefer_server_ciphers", "ssl-default-bind-ciphers"] -->

- [ ] **Weak ciphers in nginx**: flag `ssl_ciphers` directives containing `NULL`, `EXPORT`, `DES`, `RC4`, `MD5`, `aNULL`, `eNULL`, or `kRSA` -- these provide no encryption, use broken algorithms, or lack forward secrecy. Use the Mozilla SSL Configuration Generator for recommended cipher strings
- [ ] **Weak ciphers in HAProxy**: flag `ssl-default-bind-ciphers` or per-bind `ciphers` containing weak cipher identifiers -- apply the same cipher restrictions as nginx. Use `ssl-default-bind-ciphersuites` for TLS 1.3 suites
- [ ] **Client-preferred cipher order**: flag `ssl_prefer_server_ciphers off` (nginx) or missing `prefer-server-ciphers` (HAProxy) -- when the client controls cipher selection, a downgrade attack can force weak ciphers. The server should control cipher preference to ensure the strongest mutually-supported cipher is selected
- [ ] **Cipher suite too broad**: flag cipher strings like `ALL`, `HIGH`, or `DEFAULT` without explicit exclusions -- these include ciphers the administrator may not intend. Use explicit allowlists (e.g., `ECDHE+AESGCM:ECDHE+CHACHA20:!aNULL:!MD5`) rather than broad keywords

### Certificate Chain and OCSP
<!-- activation: keywords=["certificate", "cert", "chain", "intermediate", "fullchain", "ssl_certificate", "OCSP", "stapling", "ssl_stapling", "ssl_trusted_certificate", "crt-list"] -->

- [ ] **Incomplete certificate chain**: flag `ssl_certificate` (nginx) or `crt` (HAProxy) pointing to a leaf certificate file without intermediate certificates -- clients that do not have the intermediate cached will fail to validate the chain. Use the full chain file (leaf + intermediates)
- [ ] **Missing OCSP stapling**: flag TLS-terminating proxies without OCSP stapling enabled (`ssl_stapling on` in nginx, `ocsp-update on` in HAProxy) -- without stapling, clients must contact the CA's OCSP responder directly, adding latency and leaking which sites the client visits. Stapling also prevents OCSP responder outages from degrading client connections
- [ ] **Missing ssl_trusted_certificate**: flag nginx OCSP stapling enabled without `ssl_trusted_certificate` pointing to the full chain including root -- nginx needs the full chain to verify the OCSP response from the CA
- [ ] **No renewal automation**: flag certificate configurations without evidence of automated renewal (certbot, cert-manager, ACME client, or certificate management platform) -- manual certificate renewal is the leading cause of certificate expiry outages

### TLS Termination Architecture
<!-- activation: keywords=["termination", "terminate", "edge", "proxy", "backend", "re-encrypt", "passthrough", "offload", "mTLS", "upstream", "origin"] -->

- [ ] **Plaintext to backend**: flag TLS termination at the edge proxy with plaintext HTTP to backend services and no compensating control (private network, service mesh encryption) -- an attacker on the internal network can intercept traffic between the proxy and backend. Re-encrypt with TLS to backends or use mTLS
- [ ] **TLS termination at wrong layer**: flag architectures where TLS is terminated at the application (not the proxy) when a reverse proxy sits in front -- double TLS termination wastes CPU, and the proxy cannot inspect headers for routing or security. Terminate at the proxy and use mTLS or private network for the backend hop
- [ ] **Missing SNI for multi-domain**: flag multi-domain proxy configurations without SNI-based certificate selection -- without SNI, the proxy cannot select the correct certificate for each domain, causing certificate mismatch errors for clients requesting non-default domains

### Session Management
<!-- activation: keywords=["session", "ticket", "tickets", "ssl_session", "session_cache", "session_timeout", "rotation", "rotate", "key"] -->

- [ ] **Static session ticket keys**: flag TLS session ticket configurations with no rotation mechanism -- if the session ticket key is compromised, an attacker can decrypt all sessions that used that key. Rotate session ticket keys at least daily. Nginx: use `ssl_session_ticket_key` with multiple keys and rotate the files
- [ ] **Session cache too large or too long**: flag `ssl_session_cache` with very long timeouts (24+ hours) or very large shared caches -- long-lived sessions reduce the effectiveness of certificate revocation and increase the window for session ticket key compromise
- [ ] **Certificate pinning in production**: flag HPKP headers or certificate pinning in proxy configuration -- pinning causes outages when certificates rotate and is officially deprecated. Use Certificate Transparency monitoring instead of pinning

## Common False Positives

- **Caddy and Traefik secure defaults**: Caddy automatically configures TLS 1.2+, strong ciphers, OCSP stapling, and certificate renewal via ACME. Traefik v2+ has similar defaults. Verify before flagging missing explicit configuration -- the secure defaults may be sufficient.
- **Internal service mesh TLS**: Istio, Linkerd, and Consul Connect handle mTLS between services automatically. Plaintext application-to-sidecar communication on localhost is expected in mesh deployments.
- **Development proxy configuration**: nginx or HAProxy configs in development environments may use self-signed certificates and relaxed TLS settings. Verify these do not apply to production.
- **Legacy client support with compensating controls**: some deployments support TLS 1.0 for specific legacy clients with documented justification, IP allowlisting, and migration timeline. Verify before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| TLS 1.0/1.1 enabled in production proxy | Critical |
| NULL, EXPORT, or anonymous ciphers in proxy config | Critical |
| Incomplete certificate chain (missing intermediates) | Important |
| Plaintext to backend with no network-level encryption | Important |
| Missing OCSP stapling on public-facing proxy | Important |
| Client-preferred cipher order (downgrade risk) | Important |
| No certificate renewal automation | Important |
| Static session ticket keys with no rotation | Important |
| Missing SNI for multi-domain deployment | Minor |
| Session cache timeout exceeding 24 hours | Minor |
| TLS 1.3 not enabled when proxy supports it | Minor |
| Certificate pinning in production (outage risk) | Minor |

## See Also

- `crypto-tls-configuration` -- code-level TLS API usage (client libraries, verify flags, programmatic TLS context)
- `sec-owasp-a05-misconfiguration` -- TLS misconfiguration is a top security misconfiguration category
- `sec-owasp-a02-crypto-failures` -- weak ciphers and deprecated protocols are cryptographic failures
- `net-http-1-1-2-3-quic` -- ALPN negotiation during TLS handshake determines HTTP version
- `net-tcp-keepalive-timeouts-retries` -- TLS handshake duration must fit within TCP connect timeout budget

## Authoritative References

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Mozilla Server Side TLS Guidelines](https://wiki.mozilla.org/Security/Server_Side_TLS)
- [RFC 8996 -- Deprecating TLS 1.0 and TLS 1.1](https://datatracker.ietf.org/doc/html/rfc8996)
- [NIST SP 800-52 Rev 2 -- Guidelines for TLS Implementations](https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final)
- [Nginx SSL Module Documentation](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [HAProxy SSL/TLS Configuration](https://docs.haproxy.org/2.8/configuration.html#5.1)
