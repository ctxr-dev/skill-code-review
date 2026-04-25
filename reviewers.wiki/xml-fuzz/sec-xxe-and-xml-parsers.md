---
id: sec-xxe-and-xml-parsers
type: primary
depth_role: leaf
focus: Detect XML External Entity injection and XML parser misconfigurations that enable file disclosure, SSRF, or denial of service
parents:
  - index.md
covers:
  - XML parser with external entity processing enabled on untrusted input
  - DTD processing not disabled in XML parser configuration
  - XML parser accepting user-supplied XML without disabling external entities
  - XSLT processing with user-controlled stylesheets enabling code execution
  - XInclude enabled on XML parser processing untrusted documents
  - "XML bomb (billion laughs / exponential entity expansion) not mitigated"
  - SVG files processed with XML parser retaining XXE attack surface
  - SOAP endpoints parsing untrusted XML without entity restrictions
  - XML signature wrapping attacks due to permissive parser configuration
  - Server-side XML generation from user input without entity encoding
  - XML signature wrapping attacks that move the signed assertion and inject a forged one
  - SAML response not validated for XML digital signature
  - Assertion not validated for issuer, audience, or conditions
  - "SAML assertions accepted without checking NotBefore/NotOnOrAfter time conditions"
  - XML comment injection in NameID causing truncation and identity confusion
  - SAML relay state not validated, enabling open redirect
  - SAMLResponse parsed with vulnerable XML parser enabling XXE
  - Signature covering only part of the assertion, leaving unsigned elements exploitable
  - Missing encryption on assertions containing sensitive attributes
  - SAML metadata fetched over HTTP or without signature verification
  - Certificate rollover not handled, causing authentication outages or accepting stale keys
tags:
  - XXE
  - XML
  - external-entity
  - DTD
  - billion-laughs
  - XSLT
  - XInclude
  - SOAP
  - SVG
  - CWE-611
  - CWE-776
  - CWE-827
  - saml
  - sso
  - authentication
  - xml
  - signature
  - CWE-347
  - CWE-290
aliases:
  - crypto-saml-pitfalls
activation:
  file_globs:
    - "**/*.xml"
    - "**/*.xsl"
    - "**/*.xslt"
    - "**/*.svg"
    - "**/*.wsdl"
    - "**/*.xsd"
    - "**/*.java"
    - "**/*.py"
    - "**/*.php"
    - "**/*.cs"
    - "**/*.rb"
    - "**/*.go"
    - "**/*.js"
    - "**/*.ts"
  keyword_matches:
    - XML
    - xml
    - parse
    - parser
    - SAX
    - DOM
    - StAX
    - JAXB
    - JAXP
    - etree
    - lxml
    - libxml
    - XmlReader
    - XDocument
    - XmlDocument
    - DTD
    - entity
    - ENTITY
    - DOCTYPE
    - SYSTEM
    - PUBLIC
    - XInclude
    - XSLT
    - SVG
    - SOAP
    - DocumentBuilder
    - SAXParser
    - XMLInputFactory
    - simplexml
    - DOMDocument
    - Nokogiri
    - REXML
    - libxmljs
    - fast-xml-parser
    - xml2js
    - resolve_entities
    - external_entities
  structural_signals:
    - XML parser instantiation or factory creation
    - XML parsing of user-uploaded or network-fetched content
    - XSLT transformation with external stylesheet
    - SVG file processing pipeline
    - SOAP service endpoint handler
    - XML deserialization from HTTP request body
source:
  origin: file
  path: sec-xxe-and-xml-parsers.md
  hash: "sha256:620030babe86962c756f1141c73e17044548fae03b2a48b15777b789cb8b096d"
---
# XML External Entity Injection and XML Parser Misconfiguration

## When This Activates

Activates when diffs contain XML parsing code, XML parser configuration, XSLT transformations, SVG processing, SOAP endpoint handlers, or any pattern where untrusted XML is consumed. XXE exploits the XML specification's entity feature: external entities instruct the parser to fetch content from URIs (file://, http://, ftp://), enabling file disclosure, SSRF, and port scanning. Internal entity expansion (billion laughs) enables denial of service. Most XML parsers ship with insecure defaults that process entities -- the fix requires explicit opt-out configuration that varies by language and library.

**Primary CWEs**: CWE-611 (Improper Restriction of XML External Entity Reference), CWE-776 (Improper Restriction of Recursive Entity References in DTDs).

## Audit Surface

- [ ] Java DocumentBuilderFactory without setFeature disallow-doctype-decl
- [ ] Java SAXParserFactory without disabling external entities and DTDs
- [ ] Java XMLInputFactory (StAX) without IS_SUPPORTING_EXTERNAL_ENTITIES=false
- [ ] Java JAXB unmarshaller processing untrusted XML without secure parser
- [ ] Python xml.etree.ElementTree parsing untrusted XML (C accelerator may process entities)
- [ ] Python lxml.etree parsing untrusted XML without resolve_entities=False
- [ ] Python xml.sax without setting feature_external_ges and feature_external_pes to False
- [ ] PHP simplexml_load_string or DOMDocument without LIBXML_NOENT and LIBXML_NONET
- [ ] .NET XmlDocument.Load without XmlResolver set to null
- [ ] .NET XmlReader without DtdProcessing.Prohibit
- [ ] .NET XDocument or XElement parsing untrusted XML with default settings
- [ ] Ruby REXML or Nokogiri parsing untrusted XML without NONET flag
- [ ] Go xml.Decoder processing untrusted XML (standard library is safe by default but custom resolvers may not be)
- [ ] Node.js libxmljs or fast-xml-parser with entity resolution enabled
- [ ] SVG file upload processed by XML parser without entity stripping
- [ ] SOAP endpoint accepting untrusted XML payloads without parser hardening
- [ ] XSLT transformation applied with user-supplied stylesheet
- [ ] XInclude processing enabled on untrusted XML documents
- [ ] XML parser configured with no entity expansion limit (billion laughs)

## Detailed Checks

### Java XML Parser Configuration (CWE-611)
<!-- activation: file_globs=["**/*.java", "**/*.kt", "**/*.scala"], keywords=["DocumentBuilderFactory", "SAXParserFactory", "XMLInputFactory", "TransformerFactory", "SchemaFactory", "XMLReader", "SAXReader", "SAXBuilder", "JAXB", "Unmarshaller", "JAXBContext", "XMLStreamReader"] -->

- [ ] **DocumentBuilderFactory without disallow-doctype-decl**: flag `DocumentBuilderFactory.newInstance()` without `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)` -- this is the single most effective defense; it rejects any XML document containing a DOCTYPE declaration, preventing all entity-based attacks
- [ ] **SAXParserFactory without entity restrictions**: flag `SAXParserFactory.newInstance()` without disabling external general entities (`http://xml.org/sax/features/external-general-entities`, false) and external parameter entities (`http://xml.org/sax/features/external-parameter-entities`, false)
- [ ] **XMLInputFactory (StAX) with default config**: flag `XMLInputFactory.newInstance()` without `factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false)` and `factory.setProperty(XMLInputFactory.SUPPORT_DTD, false)` -- StAX defaults vary by implementation
- [ ] **JAXB unmarshalling untrusted XML**: flag `Unmarshaller.unmarshal(source)` where the XML source is untrusted -- JAXB uses the platform's default XML parser, which may have entities enabled. Create a hardened `SAXSource` or `StreamSource` with a securely configured parser and pass it to the unmarshaller
- [ ] **TransformerFactory without secure processing**: flag `TransformerFactory.newInstance()` without `factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)` when processing untrusted XSLT -- insecure transformers can access the filesystem and execute Java code via extension functions
- [ ] **Dom4j SAXReader**: flag `org.dom4j.io.SAXReader` without `reader.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)` -- dom4j wraps SAX with entity-enabled defaults

### Python XML Parser Configuration (CWE-611)
<!-- activation: file_globs=["**/*.py"], keywords=["etree", "ElementTree", "lxml", "xml.sax", "xml.dom", "minidom", "pulldom", "xmltodict", "defusedxml", "parse(", "fromstring(", "iterparse("] -->

- [ ] **xml.etree.ElementTree on untrusted XML**: flag `ET.parse(file)` or `ET.fromstring(data)` on untrusted input -- Python's standard library `xml.etree` in CPython uses the Expat parser, which does not resolve external entities by default but is vulnerable to billion laughs (entity expansion). Use `defusedxml.ElementTree` instead
- [ ] **lxml without resolve_entities=False**: flag `lxml.etree.parse()`, `lxml.etree.fromstring()`, or `lxml.etree.XMLParser()` without `resolve_entities=False` -- lxml's libxml2 backend resolves external entities by default, enabling file read and SSRF
- [ ] **lxml without DTD prohibition**: flag lxml parsers without `no_network=True` and `dtd_validation=False` when processing untrusted XML -- even with resolve_entities=False, network-accessible DTDs can be fetched
- [ ] **xml.sax without entity disabling**: flag `xml.sax.make_parser()` or `xml.sax.parseString()` without `parser.setFeature(xml.sax.handler.feature_external_ges, False)` -- SAX parsers may resolve external general entities
- [ ] **xmltodict on untrusted XML**: flag `xmltodict.parse(untrusted_xml)` -- xmltodict uses Expat internally and is vulnerable to entity expansion attacks. Use `defusedxml.expatbuilder` or limit input size
- [ ] **Missing defusedxml**: flag any XML parsing of untrusted data in Python that does not use the `defusedxml` library -- defusedxml is the recommended drop-in replacement that disables all entity processing by default

### PHP and .NET XML Parser Configuration (CWE-611)
<!-- activation: keywords=["simplexml_load_string", "simplexml_load_file", "DOMDocument", "loadXML", "load(", "XmlDocument", "XmlReader", "XDocument", "XElement", "XmlTextReader", "LIBXML_NOENT", "LIBXML_NONET", "XmlResolver", "DtdProcessing"] -->

- [ ] **PHP simplexml without LIBXML flags**: flag `simplexml_load_string($xml)` or `simplexml_load_file($file)` on untrusted input without `LIBXML_NOENT` to prevent entity substitution and `LIBXML_NONET` to prevent network access -- PHP 8.0+ disables external entity loading by default, but earlier versions require explicit flags. Additionally, call `libxml_disable_entity_loader(true)` on PHP < 8.0
- [ ] **PHP DOMDocument::loadXML without restrictions**: flag `$doc->loadXML($xml)` on untrusted input without prior `libxml_disable_entity_loader(true)` (PHP < 8.0) or passing `LIBXML_NOENT | LIBXML_NONET` as options
- [ ] **.NET XmlDocument with default XmlResolver**: flag `XmlDocument.Load()` or `XmlDocument.LoadXml()` on untrusted input without setting `doc.XmlResolver = null` -- the default XmlUrlResolver fetches external entities from any URI
- [ ] **.NET XmlReader without DtdProcessing.Prohibit**: flag `XmlReader.Create(stream, settings)` where `settings.DtdProcessing` is not set to `DtdProcessing.Prohibit` -- DtdProcessing.Parse (default in older .NET) allows entity processing
- [ ] **.NET XmlTextReader (legacy)**: flag any use of `XmlTextReader` on untrusted input -- XmlTextReader has insecure defaults and is deprecated. Use `XmlReader.Create()` with explicit `XmlReaderSettings` that set `DtdProcessing = DtdProcessing.Prohibit` and `XmlResolver = null`

### SVG, SOAP, and Indirect XXE Vectors
<!-- activation: keywords=["SVG", "svg", "SOAP", "soap", "WSDL", "wsdl", "upload", "multipart", "image", "convert", "rsvg", "Batik", "ImageMagick", "Inkscape"] -->

- [ ] **SVG upload processed as XML**: flag file upload handlers that accept SVG files and process them with an XML parser (for resizing, conversion, metadata extraction) without stripping entities -- SVG is XML, and a malicious SVG containing `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` will trigger XXE when parsed. Strip DOCTYPE declarations or rasterize SVGs before processing
- [ ] **SVG rendered server-side**: flag server-side SVG rendering libraries (Apache Batik, librsvg, Inkscape, ImageMagick with SVG delegate) processing user-uploaded SVGs -- these tools parse XML and may resolve entities or execute embedded JavaScript
- [ ] **SOAP endpoint without parser hardening**: flag SOAP service implementations that parse incoming XML payloads without securing the underlying XML parser -- SOAP messages are XML documents and are subject to XXE. Harden the parser used by the SOAP framework (Apache CXF, JAX-WS, .NET WCF)
- [ ] **WSDL fetched from untrusted URL**: flag SOAP client code that fetches WSDL from user-controlled URLs -- a malicious WSDL can contain XXE payloads that execute during parsing
- [ ] **Office document XML extraction**: flag code that extracts XML from DOCX, XLSX, PPTX, or ODT files uploaded by users -- these are ZIP archives containing XML files that may include XXE payloads in their internal XML documents

### Billion Laughs and Entity Expansion (CWE-776)
<!-- activation: keywords=["entity", "ENTITY", "DOCTYPE", "expansion", "limit", "maxOccurs", "recursion", "amplification"] -->

- [ ] **No entity expansion limit**: flag XML parsers that do not set an entity expansion limit when processing untrusted XML -- the billion laughs attack defines nested entities that expand exponentially (10^9 or more characters from a few hundred bytes), consuming all available memory
- [ ] **Java without ENTITY_EXPANSION_LIMIT**: flag Java XML parsers without `factory.setAttribute(XMLConstants.ENTITY_EXPANSION_LIMIT, "100")` or `jdk.xml.entityExpansionLimit` system property -- Java's default limit (64,000 in modern JDKs) may still allow significant memory consumption
- [ ] **Schema with unbounded maxOccurs**: flag XSD schemas that specify `maxOccurs="unbounded"` on complex types processed from untrusted input -- this enables XML-level denial of service through extremely large documents that the parser must validate

### XInclude and XSLT Injection
<!-- activation: keywords=["XInclude", "xinclude", "xi:include", "XSLT", "xslt", "transform", "stylesheet", "TransformerFactory", "xsl:value-of", "extension"] -->

- [ ] **XInclude enabled on untrusted XML**: flag XML parsers with XInclude processing enabled (`xinclude()` in lxml, `setXIncludeAware(true)` in Java) when processing untrusted input -- XInclude can fetch and embed content from arbitrary URIs, achieving the same result as external entities even when DOCTYPE is disabled
- [ ] **XSLT from untrusted source**: flag XSLT transformations where the stylesheet is user-controlled or fetched from an untrusted URL -- XSLT 1.0 supports `document()` function for file reads, and many processors support extension functions that enable arbitrary code execution (Java: `xalan:evaluate`, .NET: `msxsl:script`)
- [ ] **XSLT with extension functions enabled**: flag `TransformerFactory` or XSLT processors that do not disable extension functions when processing untrusted stylesheets -- extension functions are the primary XSLT-to-RCE vector

## Common False Positives

- **XML parsing of application-controlled data only**: XML parsers processing configuration files, build files, or other XML generated and controlled entirely by the application or developers are not vulnerable to XXE from external attackers. Verify no user input can influence the parsed XML content.
- **defusedxml already in use**: Python code using `defusedxml.ElementTree`, `defusedxml.minidom`, or `defusedxml.sax` has entity processing disabled by default. No flag needed.
- **Go encoding/xml**: Go's standard library `encoding/xml` does not resolve external entities and does not expand internal entity references beyond character references. It is safe by default unless custom entity resolvers are added.
- **Modern .NET defaults**: .NET Core 3.1+ and .NET 5+ `XmlReader.Create()` defaults to `DtdProcessing.Prohibit` and null resolver. Verify the framework version before flagging.
- **JSON APIs that accept XML for content negotiation**: some frameworks auto-negotiate content types and may parse XML even on endpoints expected to receive JSON. This is a real risk, not a false positive -- verify that XML content types are rejected if not expected.
- **SVG files served as static assets**: SVG files served directly to browsers via `<img>` tags are sandboxed and cannot trigger XXE. Flag only server-side XML parsing of SVG content.

## Severity Guidance

| Finding | Severity |
|---|---|
| XML parser processing untrusted input with external entities enabled | Critical |
| XSLT transformation with user-controlled stylesheet and extension functions enabled | Critical |
| SVG upload processed server-side with entity-resolving XML parser | Critical |
| SOAP endpoint parsing untrusted XML without entity restrictions | Critical |
| .NET XmlDocument.Load on untrusted input with default XmlResolver | Critical |
| lxml.etree parsing untrusted XML without resolve_entities=False | Critical |
| Java DocumentBuilderFactory without disallow-doctype-decl on untrusted XML | Critical |
| XInclude enabled on parser processing untrusted XML documents | Important |
| XML parser without entity expansion limit (billion laughs risk) | Important |
| JAXB unmarshalling untrusted XML without hardened SAXSource | Important |
| PHP DOMDocument or simplexml on untrusted input without LIBXML flags (PHP < 8.0) | Important |
| Office document XML extraction without entity stripping | Important |
| WSDL fetched from user-controlled URL | Important |
| Python xml.etree on untrusted input without defusedxml (expansion DoS) | Minor |
| XSD with unbounded maxOccurs on untrusted input (DoS risk) | Minor |

## See Also

- `sec-owasp-a03-injection` -- XXE is categorized as injection in OWASP; XML parsers are interpreters that process entity directives
- `sec-owasp-a05-misconfiguration` -- insecure XML parser defaults are a form of security misconfiguration
- `sec-owasp-a10-ssrf` -- XXE with external entities pointing to internal URLs is a form of SSRF
- `principle-fail-fast` -- XML parsers should reject DOCTYPE declarations outright rather than attempting to filter dangerous entities

## Authoritative References

- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
- [CWE-776: Improper Restriction of Recursive Entity References in DTDs](https://cwe.mitre.org/data/definitions/776.html)
- [OWASP XXE Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [OWASP XML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html)
- [PortSwigger: XML External Entity (XXE) Injection](https://portswigger.net/web-security/xxe)
- [Timothy Morgan: XML Schema, DTD, and Entity Attacks (OWASP AppSec EU 2015)](https://www.vsecurity.com/download/papers/XMLDTDEntityAttacks.pdf)
- [Python defusedxml documentation](https://pypi.org/project/defusedxml/)
- [Microsoft: XML External Entity attacks and mitigations](https://learn.microsoft.com/en-us/dotnet/standard/security/xml-processing-options)
