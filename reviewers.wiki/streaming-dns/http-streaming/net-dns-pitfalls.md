---
id: net-dns-pitfalls
type: primary
depth_role: leaf
focus: Detect DNS resolution issues including caching beyond TTL, resolution in hot paths, missing failover, DNS rebinding, and hardcoded IP addresses
parents:
  - index.md
covers:
  - DNS results cached beyond TTL causing traffic to stale endpoints
  - Missing DNS failover when primary resolver is unreachable
  - DNS resolution on every request in a hot path with no caching
  - CNAME chain too deep causing resolution latency and fragility
  - Missing DNSSEC validation allowing spoofed records
  - Hardcoded IP addresses bypassing DNS and breaking on infrastructure changes
  - DNS rebinding not prevented allowing internal network access from browsers
  - Missing SRV record usage for service discovery
  - IPv6 AAAA records not handled causing connectivity failures on dual-stack networks
  - DNS timeout not configured causing indefinite hangs
  - "/etc/hosts reliance in production bypassing DNS failover"
  - No failover testing -- region failover has never been validated
  - "DNS TTL too long -- clients cache the failed region's IP for minutes or hours"
  - Data replication lag not accounted for -- reads in secondary see stale data
  - Split-brain not handled -- both regions accept writes simultaneously after partition
  - Missing health-based routing -- traffic not redirected when a region is unhealthy
  - Failover is manual only -- requires human intervention to redirect traffic
  - Failback procedure undefined -- returning to the primary region is ad-hoc
  - Cross-region latency not accounted for in timeout budgets
  - Session state or cache not replicated -- users lose state on failover
  - Region-specific configuration hardcoded -- secondary cannot assume primary role
tags:
  - dns
  - resolution
  - ttl
  - caching
  - rebinding
  - dnssec
  - srv
  - ipv6
  - failover
  - timeout
  - multi-region
  - disaster-recovery
  - DNS
  - replication-lag
  - split-brain
  - health-routing
  - resilience
aliases:
  - reliability-multi-region-failover
activation:
  file_globs:
    - "**/*dns*"
    - "**/*resolv*"
    - "**/*hosts*"
    - "**/*lookup*"
    - "**/*discover*"
  keyword_matches:
    - DNS
    - dns
    - resolve
    - lookup
    - hostname
    - TTL
    - CNAME
    - SRV
    - A record
    - AAAA
    - resolver
    - getaddrinfo
    - nslookup
    - dig
  structural_signals:
    - DNS resolver or lookup configuration
    - Hostname resolution call
    - Service discovery configuration
source:
  origin: file
  path: net-dns-pitfalls.md
  hash: "sha256:95a469e858d3b477fdf8a9d4ddd7ad7d07d990d5c56ae0a3e9706a1fa72d3993"
---
# DNS Pitfalls

## When This Activates

Activates when diffs touch DNS resolution, hostname lookups, service discovery, resolver configuration, or Host header handling. DNS is the first network operation in almost every connection, yet it is frequently misconfigured. Caching beyond TTL sends traffic to decommissioned servers. Resolving on every request adds 10-100ms of latency. Hardcoded IPs break on infrastructure changes. DNS rebinding bypasses same-origin protections. Missing DNSSEC allows cache poisoning. This reviewer detects DNS-related issues that cause outages, latency, and security vulnerabilities.

## Audit Surface

- [ ] DNS resolver cache TTL set higher than the record's actual TTL
- [ ] Application code with no DNS failover or secondary resolver
- [ ] DNS lookup called per-request in a hot path without result caching
- [ ] CNAME chain exceeding 5 levels deep
- [ ] No DNSSEC validation on resolver handling sensitive lookups
- [ ] Hardcoded IP address where a hostname should be used
- [ ] HTTP server not validating Host header (DNS rebinding vector)
- [ ] Service discovery using A records instead of SRV records
- [ ] getaddrinfo or equivalent not handling AAAA records on IPv6-capable hosts
- [ ] DNS resolution timeout not configured or set above 5 seconds
- [ ] /etc/hosts entries used for production service routing
- [ ] DNS-based load balancing without client-side record shuffling

## Detailed Checks

### DNS Caching and TTL
<!-- activation: keywords=["TTL", "ttl", "cache", "stale", "expire", "refresh", "resolve", "lookup", "dns.lookup", "InetAddress", "getaddrinfo", "gethostbyname"] -->

- [ ] **Cached beyond TTL**: flag DNS resolver configurations or application-level caches that hold DNS results beyond the record TTL -- when infrastructure changes (IP migration, failover, blue-green deploy), stale cached addresses route traffic to dead endpoints. Java's `InetAddress` caches results forever by default (`networkaddress.cache.ttl`); set it to 30-60 seconds
- [ ] **No caching at all**: flag DNS resolution on every request in a hot code path (e.g., calling `dns.lookup()` or `getaddrinfo()` per HTTP request) -- each resolution adds 1-100ms of latency and puts load on the resolver. Use connection pooling (which reuses resolved addresses) or an application-level DNS cache with TTL-aware expiry
- [ ] **JVM infinite DNS caching**: flag Java applications running with security manager that sets `networkaddress.cache.ttl=-1` (cache forever) or applications that do not explicitly configure DNS caching -- Java caches DNS results indefinitely when a security manager is present, which is the default in many container runtimes

### Hardcoded IPs and Service Discovery
<!-- activation: keywords=["IP", "address", "hardcode", "hard-code", "10.", "172.", "192.168", "127.0", "SRV", "service discovery", "consul", "etcd", "hostname"] -->

- [ ] **Hardcoded IP addresses**: flag IP addresses hardcoded in application code, configuration files, or connection strings where a hostname should be used -- hardcoded IPs bypass DNS failover, load balancing, and require code changes on infrastructure migration. Exceptions: loopback (127.0.0.1/::1), Docker bridge (172.17.0.1), and metadata endpoints (169.254.169.254)
- [ ] **A records for service discovery**: flag service discovery relying on plain A/AAAA records instead of SRV records when port or priority information is needed -- SRV records provide port, priority, and weight, enabling proper load balancing and failover without hardcoding ports
- [ ] **/etc/hosts for production routing**: flag production deployments that rely on `/etc/hosts` entries for service routing -- hosts file entries bypass DNS entirely, have no TTL, and must be manually updated on every host when addresses change. Use DNS or a service discovery system

### DNS Security
<!-- activation: keywords=["rebind", "rebinding", "Host", "header", "DNSSEC", "spoof", "poison", "cache poison", "validate", "verify", "origin"] -->

- [ ] **DNS rebinding not prevented**: flag HTTP servers that do not validate the `Host` header against an allowlist of expected hostnames -- DNS rebinding attacks resolve an attacker-controlled domain to an internal IP address, bypassing same-origin policy. Validate that the `Host` header matches expected values and reject requests with unexpected hosts
- [ ] **Missing DNSSEC validation**: flag resolver configurations for security-sensitive applications (financial, healthcare, infrastructure) that do not enable DNSSEC validation -- without DNSSEC, DNS responses can be spoofed via cache poisoning, redirecting traffic to attacker-controlled servers
- [ ] **DNS over plaintext for sensitive lookups**: flag applications making DNS queries over unencrypted UDP port 53 for sensitive hostname resolutions when DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT) is available -- plaintext DNS exposes which services the application communicates with

### DNS Timeout and Failover
<!-- activation: keywords=["timeout", "failover", "secondary", "resolver", "resolv.conf", "nameserver", "retry", "AAAA", "IPv6", "dual-stack", "CNAME", "chain"] -->

- [ ] **No DNS timeout**: flag DNS resolution calls without an explicit timeout -- if the resolver is unreachable, resolution blocks indefinitely (or for the OS default, which can be 30+ seconds). Set DNS timeouts to 2-5 seconds
- [ ] **No failover resolver**: flag resolver configurations with a single nameserver and no secondary -- if the primary resolver is unreachable, all DNS resolution fails. Configure at least two resolvers
- [ ] **CNAME chain too deep**: flag DNS configurations with CNAME chains exceeding 5 levels -- deep CNAME chains add latency (each level requires a separate resolution), increase fragility (any link breaking kills the whole chain), and some resolvers refuse chains beyond 8 levels
- [ ] **IPv6 not handled**: flag applications on dual-stack networks that only resolve A records and ignore AAAA records -- on IPv6-only or dual-stack infrastructure, failing to resolve AAAA records causes connectivity failures. Use `getaddrinfo` with `AF_UNSPEC` to handle both address families

## Common False Positives

- **Container DNS with short TTL**: Kubernetes CoreDNS and Docker DNS resolve internal service names with short TTLs and automatic updates. Internal DNS caching in these environments is often handled by the runtime. Verify before flagging.
- **Cloud provider metadata endpoints**: hardcoded IPs like `169.254.169.254` (AWS/GCP metadata), `169.254.170.2` (ECS), and `100.100.100.200` (Alibaba Cloud) are stable by specification. Do not flag these.
- **Localhost and loopback**: `127.0.0.1`, `::1`, and `localhost` are safe to hardcode. Do not flag loopback addresses.
- **Build-time DNS resolution**: Dockerfile `RUN` commands that resolve DNS during image build (e.g., `apt-get update`) are expected. Flag only runtime DNS patterns.

## Severity Guidance

| Finding | Severity |
|---|---|
| DNS rebinding not prevented on public-facing server | Critical |
| JVM caching DNS forever in production (stale after failover) | Critical |
| Hardcoded IP for a service that may change (non-loopback) | Important |
| DNS resolution per request on hot path (no caching) | Important |
| No DNS resolution timeout configured | Important |
| No failover resolver configured | Important |
| /etc/hosts used for production service routing | Minor |
| CNAME chain exceeding 5 levels | Minor |
| IPv6 AAAA records not handled on dual-stack network | Minor |
| Missing DNSSEC validation | Minor |

## See Also

- `sec-owasp-a10-ssrf` -- DNS rebinding is a common SSRF vector
- `sec-owasp-a05-misconfiguration` -- missing DNS failover and stale caching are infrastructure misconfigurations
- `perf-network-io` -- DNS resolution is the first network I/O operation in most connections
- `reliability-timeout-deadline-propagation` -- DNS timeout must be part of overall request deadline budget
- `reliability-circuit-breaker` -- DNS resolution failures should trigger circuit breaking

## Authoritative References

- [RFC 1034 -- Domain Names: Concepts and Facilities](https://datatracker.ietf.org/doc/html/rfc1034)
- [RFC 8484 -- DNS Queries over HTTPS (DoH)](https://datatracker.ietf.org/doc/html/rfc8484)
- [RFC 4033 -- DNS Security Introduction and Requirements (DNSSEC)](https://datatracker.ietf.org/doc/html/rfc4033)
- [Dean Jackson, "DNS Rebinding Attacks" (Stanford, 2009)](https://crypto.stanford.edu/dns/)
- [Oracle Java Networking Properties -- networkaddress.cache.ttl](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/InetAddress.html)
