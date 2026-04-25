---
id: sec-deserialization
type: primary
depth_role: leaf
focus: Detect insecure deserialization patterns across all major languages where untrusted data is deserialized into executable object graphs
parents:
  - index.md
covers:
  - Java ObjectInputStream and XMLDecoder used on untrusted input without type filtering
  - Kryo deserialization without class registration enforcement
  - Python pickle, shelve, marshal, and yaml.load with unsafe loader on untrusted data
  - PHP unserialize on user-controlled input enabling magic method chains
  - Ruby Marshal.load on untrusted data from network or user uploads
  - .NET BinaryFormatter, SoapFormatter, NetDataContractSerializer, and ObjectStateFormatter on untrusted streams
  - JavaScript node-serialize and funcster with user-controlled input enabling RCE
  - Go gob decoding without registered type constraints
  - Rust serde with tag-based polymorphic deserialization of untrusted input
  - Deserialization of user-controlled class names enabling arbitrary type instantiation
  - Missing type allowlists on deserialization boundaries
  - Gadget chain exposure through overly broad classpath availability
  - "CI/CD pipelines without integrity checks on build artifacts"
  - Deserialization of untrusted data using unsafe deserializers
  - Java ObjectInputStream used on untrusted input
  - "Python pickle/shelve/marshal used on untrusted data"
  - PHP unserialize called on user-controlled input
  - Ruby Marshal.load on untrusted data
  - .NET BinaryFormatter or NetDataContractSerializer on untrusted input
  - "CDN resources loaded without Subresource Integrity (SRI) hashes"
  - Auto-update mechanisms without cryptographic signature verification
  - "CI pipelines using mutable tags (latest) for base images"
  - Missing artifact signing in release pipelines
  - YAML deserialization with unsafe loaders
  - "Mass assignment / object injection via unfiltered deserialization"
tags:
  - deserialization
  - insecure-deserialization
  - RCE
  - gadget-chain
  - pickle
  - ObjectInputStream
  - BinaryFormatter
  - marshal
  - serialize
  - CWE-502
  - owasp
  - a08
  - integrity
  - SRI
  - CDN
  - "CI/CD"
  - artifact
  - signing
  - supply-chain
  - security
aliases:
  - sec-owasp-a08-integrity-failures
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.py"
    - "**/*.rb"
    - "**/*.php"
    - "**/*.cs"
    - "**/*.vb"
    - "**/*.js"
    - "**/*.ts"
    - "**/*.go"
    - "**/*.rs"
  keyword_matches:
    - deserialize
    - serialize
    - ObjectInputStream
    - pickle
    - unpickle
    - marshal
    - unserialize
    - BinaryFormatter
    - yaml.load
    - Kryo
    - XMLDecoder
    - readObject
    - readResolve
    - fromJSON
    - decode
    - unmarshal
    - gob
    - serde
    - readClassAndObject
    - readUnshared
    - XStream
    - NetDataContractSerializer
    - SoapFormatter
    - ObjectStateFormatter
    - LosFormatter
    - node-serialize
    - jsonpickle
    - shelve
    - dill
    - cloudpickle
    - funcster
  structural_signals:
    - Deserialization call with network or user-sourced input
    - Serializable class with custom readObject implementation
    - Type name or class identifier derived from user input
    - Polymorphic type resolver configured on deserialization
    - Missing ObjectInputFilter or type allowlist on deserialization boundary
source:
  origin: file
  path: sec-deserialization.md
  hash: "sha256:2ba4a8b9000161cc9352d0faae8e02db881153da52bb833ea45e9cf552adad21"
---
# Insecure Deserialization

## When This Activates

Activates when diffs contain deserialization calls, serialization library configuration, custom serialization methods (readObject, readResolve, __reduce__), or type-resolution logic that could process untrusted input. This reviewer provides deep, language-specific coverage of insecure deserialization beyond the breadth covered by `sec-owasp-a08-integrity-failures`. The fundamental issue: native serialization formats embed type information that instructs the deserializer to instantiate arbitrary objects and invoke methods. An attacker who controls the serialized data controls which objects are instantiated, what constructor/lifecycle methods are called, and with what field values -- leading to remote code execution via gadget chains.

__Primary CWE__: CWE-502 (Deserialization of Untrusted Data).

## Audit Surface

- [ ] Java ObjectInputStream.readObject() or readUnshared() on untrusted stream without ObjectInputFilter
- [ ] Java XMLDecoder parsing untrusted XML input
- [ ] Java XStream.fromXML() without setupDefaultSecurity() and explicit type permissions
- [ ] Kryo.readObject() or readClassAndObject() without setRegistrationRequired(true)
- [ ] Python pickle.load(), pickle.loads(), shelve.open(), or dill.loads() on untrusted data
- [ ] Python yaml.load() without Loader=SafeLoader or use of yaml.safe_load()
- [ ] Python jsonpickle.decode() on user-controlled JSON
- [ ] PHP unserialize() called with user-controlled input parameter
- [ ] Ruby Marshal.load() on data from cookies, network, or file uploads
- [ ] Ruby YAML.load() on untrusted input (pre-Psych 4.0 allows arbitrary object instantiation)
- [ ] .NET BinaryFormatter.Deserialize() on any untrusted input stream
- [ ] .NET SoapFormatter, NetDataContractSerializer, or ObjectStateFormatter on untrusted data
- [ ] .NET LosFormatter on untrusted ViewState without MAC validation
- [ ] JavaScript node-serialize unserialize() with user input
- [ ] Go gob.Decode() on untrusted input without registered type constraints
- [ ] Rust serde with #[serde(tag)] or #[serde(untagged)] on externally-sourced enums allowing arbitrary variant selection
- [ ] Deserialization method accepting a user-controlled type name or class identifier
- [ ] Custom readObject/readResolve/readExternal in Java without field validation
- [ ] Serialization library configured with polymorphic type handling on untrusted input

## Detailed Checks

### Java Native Serialization (CWE-502)
<!-- activation: file_globs=["**/*.java", "**/*.kt", "**/*.scala"], keywords=["ObjectInputStream", "readObject", "readUnshared", "readResolve", "readExternal", "Serializable", "Externalizable", "ObjectInputFilter", "serialVersionUID"] -->

- [ ] __ObjectInputStream on untrusted input__: flag any `new ObjectInputStream(inputStream)` followed by `readObject()` or `readUnshared()` where `inputStream` originates from network sockets, HTTP request bodies, message queues, or file uploads -- this is the textbook Java deserialization RCE vector via ysoserial gadget chains
- [ ] __Missing ObjectInputFilter__: flag `ObjectInputStream` usage without calling `setObjectInputFilter()` (Java 9+) or wrapping with a look-ahead deserialization library (Apache Commons IO ValidatingObjectInputStream, notsoserial) -- without an allowlist filter, any class on the classpath is instantiable
- [ ] __Custom readObject without validation__: flag `Serializable` classes implementing `private void readObject(ObjectInputStream in)` that call `in.defaultReadObject()` without subsequently validating field invariants -- attacker-controlled field values can put objects into states that constructors would reject
- [ ] __readResolve returning mutable singleton__: flag `readResolve()` implementations that return a cached singleton without defensive copying -- deserialization can replace the singleton's internal state
- [ ] __XMLDecoder on untrusted XML__: flag `java.beans.XMLDecoder` used on any input not hardcoded at compile time -- XMLDecoder's XML format can invoke arbitrary methods, create objects of any class, and set any field
- [ ] __XStream without security configuration__: flag `XStream.fromXML()` without prior calls to `XStream.setupDefaultSecurity(xstream)` and `xstream.allowTypes()` or `allowTypesByWildcard()` -- XStream's default configuration allows instantiation of any class

### Java Kryo and Other Serialization Libraries
<!-- activation: keywords=["Kryo", "kryo", "readObject", "readClassAndObject", "register", "setRegistrationRequired", "Hessian", "hessian", "FST", "fst"] -->

- [ ] __Kryo without registration requirement__: flag `Kryo` instances where `setRegistrationRequired(true)` is not called -- without registration enforcement, Kryo will deserialize any class, enabling gadget chain attacks similar to native serialization
- [ ] __Kryo with setRegistrationRequired(false)__: flag explicit `kryo.setRegistrationRequired(false)` -- this is the insecure configuration and should be removed
- [ ] __Hessian deserialization of untrusted input__: flag `HessianInput.readObject()` or `Hessian2Input.readObject()` on untrusted data -- Hessian has known gadget chains (resin, rome) that enable RCE
- [ ] __FST (fast-serialization) on untrusted input__: flag `FSTObjectInput.readObject()` from untrusted sources -- FST uses Java serialization internally and is vulnerable to the same gadget chains

### Python Deserialization (CWE-502)
<!-- activation: file_globs=["**/*.py"], keywords=["pickle", "unpickle", "cPickle", "shelve", "marshal", "dill", "cloudpickle", "jsonpickle", "yaml.load", "yaml.unsafe_load", "__reduce__", "loads(", "load("] -->

- [ ] __pickle/cPickle on untrusted data__: flag `pickle.load(f)`, `pickle.loads(data)`, `cPickle.load()`, `cPickle.loads()` where the data source is not entirely application-controlled -- pickle executes arbitrary Python code via the `__reduce__` protocol. There is no safe way to filter pickle input
- [ ] __shelve on untrusted files__: flag `shelve.open(path)` where `path` is user-controlled or the file content is untrusted -- shelve uses pickle internally
- [ ] __dill/cloudpickle on untrusted data__: flag `dill.load()`, `dill.loads()`, `cloudpickle.load()`, `cloudpickle.loads()` on data from external sources -- these are pickle extensions with the same RCE risk
- [ ] __jsonpickle.decode on user input__: flag `jsonpickle.decode(user_json)` -- jsonpickle embeds Python type information in JSON (`py/object` keys), enabling arbitrary object instantiation from JSON input
- [ ] __yaml.load without SafeLoader__: flag `yaml.load(data)` without `Loader=yaml.SafeLoader` and flag `yaml.unsafe_load()` on any untrusted input -- the default YAML loader (FullLoader in PyYAML 5.1+) restricts some constructors but `!!python/object/apply` variants may still be exploitable; always use `yaml.safe_load()`
- [ ] __marshal.loads on untrusted data__: flag `marshal.loads()` on external input -- Python marshal can crash the interpreter and may enable code execution

### PHP, Ruby, and .NET Deserialization (CWE-502)
<!-- activation: keywords=["unserialize", "Marshal.load", "YAML.load", "BinaryFormatter", "SoapFormatter", "NetDataContractSerializer", "ObjectStateFormatter", "LosFormatter", "DataContractSerializer", "TypeNameHandling", "JavaScriptSerializer"] -->

- [ ] __PHP unserialize on user input__: flag `unserialize($request->input(...))`, `unserialize($_GET[...])`, `unserialize($_POST[...])`, `unserialize($_COOKIE[...])` -- PHP object injection triggers magic methods (`__wakeup`, `__destruct`, `__toString`) with attacker-controlled properties, enabling file operations, SQL injection, or RCE via POP chains. Use `json_decode()` or add `['allowed_classes' => false]` (PHP 7+)
- [ ] __Ruby Marshal.load on untrusted data__: flag `Marshal.load(data)` where data comes from cookies (especially Rails signed cookies if the secret is leaked), network, or file uploads -- Ruby Marshal can instantiate arbitrary objects and trigger method calls. Use `JSON.parse()` instead
- [ ] __Ruby YAML.load on untrusted input__: flag `YAML.load(user_data)` in Ruby versions before Psych 4.0 (Ruby 3.1) -- older YAML.load allows arbitrary object instantiation via `!ruby/object` tags. Use `YAML.safe_load()` or upgrade to Psych 4.0+ where YAML.load defaults to safe mode
- [ ] __.NET BinaryFormatter__: flag all uses of `BinaryFormatter.Deserialize()` -- Microsoft has formally deprecated BinaryFormatter as unfixably insecure. Migrate to `System.Text.Json`, `DataContractSerializer` with known types, or `protobuf-net`
- [ ] __.NET TypeNameHandling in Json.NET__: flag `JsonSerializerSettings { TypeNameHandling = TypeNameHandling.All }` or `TypeNameHandling.Auto` on input that includes untrusted JSON -- when TypeNameHandling is enabled, the `$type` property in JSON controls which .NET type is instantiated, enabling gadget chain attacks. Use `TypeNameHandling.None` (default) or a custom `SerializationBinder` with an explicit allowlist
- [ ] __.NET ObjectStateFormatter/LosFormatter__: flag `ObjectStateFormatter.Deserialize()` or `LosFormatter.Deserialize()` on untrusted ViewState without MAC validation -- ASP.NET ViewState deserialization has known RCE vectors when the MAC key is compromised or validation is disabled

### JavaScript and Node.js Deserialization
<!-- activation: file_globs=["**/*.js", "**/*.ts"], keywords=["node-serialize", "serialize", "unserialize", "funcster", "cryo", "js-yaml", "safeLoad", "YAML.parse", "deserialize"] -->

- [ ] __node-serialize unserialize__: flag `require('node-serialize').unserialize(userInput)` -- node-serialize evaluates JavaScript functions embedded in the serialized data using `eval()`, enabling direct RCE with payloads like `_$$ND_FUNC$$_function(){...}()`
- [ ] __funcster on untrusted input__: flag `funcster.deepDeserialize(userInput)` -- funcster reconstructs JavaScript functions from serialized data, enabling code execution
- [ ] __js-yaml without safe mode__: flag `yaml.load(data)` from the `js-yaml` library without `schema: SAFE_SCHEMA` -- the default schema can instantiate JavaScript objects. Use `yaml.load(data, { schema: yaml.SAFE_SCHEMA })` or `yaml.safeLoad()`

### Go and Rust Deserialization
<!-- activation: file_globs=["**/*.go", "**/*.rs"], keywords=["gob", "Decode", "NewDecoder", "Register", "serde", "Deserialize", "deserialize_with", "untagged", "tag", "bincode", "rmp-serde", "ciborium"] -->

- [ ] __Go gob without type registration__: flag `gob.NewDecoder(reader).Decode(&target)` on untrusted input where the target type includes interfaces -- gob can deserialize any registered type into an interface field, and `gob.Register()` calls elsewhere in the codebase expand the attack surface. Validate decoded values and minimize interface usage in deserialized structs
- [ ] __Go gob resource exhaustion__: flag `gob.Decode()` on untrusted network input without size limits -- malicious gob streams can trigger excessive memory allocation or deep recursion
- [ ] __Rust serde with externally-tagged enums__: flag `#[serde(tag = "type")]` or `#[serde(untagged)]` on enums deserialized from untrusted input where variants include types with `Drop` implementations or side effects -- while Rust's type system prevents arbitrary code execution, an attacker can select unexpected enum variants that trigger logic bugs or resource exhaustion
- [ ] __Rust serde deserialize_with on untrusted input__: flag `#[serde(deserialize_with = "custom_fn")]` where the custom deserializer performs unsafe operations or allocates unbounded memory based on input -- custom deserializers bypass serde's default safety guarantees

### Type Confusion and Polymorphic Deserialization
<!-- activation: keywords=["className", "class_name", "typeName", "type_name", "classForName", "Class.forName", "forName", "TypeNameHandling", "polymorphic", "subtype", "JsonTypeInfo", "JsonSubTypes", "@type", "$type", "py/object"] -->

- [ ] __User-controlled class/type name__: flag any pattern where a class name, type identifier, or fully-qualified type name is read from user input and used to instantiate objects (`Class.forName(userInput)`, `Type.GetType(userInput)`, `importlib.import_module(userInput)`) -- this is deserialization-equivalent even without a serialization library
- [ ] __Jackson polymorphic deserialization__: flag `@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS)` or `enableDefaultTyping()` on Jackson ObjectMapper processing untrusted JSON -- the `@class` or `@type` property in JSON controls which Java class is instantiated. Use `@JsonTypeInfo(use = JsonTypeInfo.Id.NAME)` with explicit `@JsonSubTypes`
- [ ] __Gadget chain availability__: flag projects with large classpaths (Apache Commons Collections, Spring, Groovy, ROME) combined with any native deserialization endpoint -- these libraries provide the building blocks (gadgets) for exploitation. Reducing classpath reduces gadget availability

## Common False Positives

- __Serialization between trusted internal services__: pickle, gob, or Java serialization used for IPC between services in the same trust boundary (same machine, same Kubernetes pod) where the data never crosses a trust boundary. Verify that no external input can reach the serialization channel.
- __Pickle for ML model persistence__: data science code using pickle to save/load trained models where the model files are produced and consumed by the same team. Flag only if model files can be uploaded by users or fetched from untrusted URLs.
- __Java Serializable marker on DTOs__: classes implementing `Serializable` for framework requirements (JPA entities, RMI stubs) but never actually deserialized from untrusted input. The risk exists only if an `ObjectInputStream` processes external data.
- __yaml.safe_load already used__: code using `yaml.safe_load()` instead of `yaml.load()` is already using the safe variant. No flag needed.
- __JSON.parse in JavaScript__: `JSON.parse()` does not instantiate classes or execute code; it produces plain objects, arrays, and primitives. Flag only if the parsed output flows into a prototype pollution sink.
- __DataContractSerializer with known types in .NET__: `DataContractSerializer` with explicitly registered known types is the recommended safe alternative to BinaryFormatter. No flag needed unless `KnownType` includes overly broad types.

## Severity Guidance

| Finding | Severity |
|---|---|
| ObjectInputStream.readObject() on untrusted input without ObjectInputFilter | Critical |
| pickle.load()/loads() on user-controlled or network-sourced data | Critical |
| PHP unserialize() on user-controlled request parameter | Critical |
| BinaryFormatter.Deserialize() on untrusted stream | Critical |
| XMLDecoder or XStream without security configuration on untrusted XML | Critical |
| Ruby Marshal.load() on data from network or user upload | Critical |
| node-serialize unserialize() with user input | Critical |
| yaml.load() without SafeLoader on untrusted YAML (Python or Ruby) | Critical |
| Jackson @JsonTypeInfo(use=CLASS) or enableDefaultTyping() on untrusted JSON | Critical |
| User-controlled class name used in Class.forName() or equivalent | Critical |
| Kryo without setRegistrationRequired(true) on untrusted input | Important |
| .NET TypeNameHandling.All or Auto on untrusted JSON | Important |
| jsonpickle.decode() on user-controlled JSON | Important |
| Go gob.Decode() on untrusted input with interface fields | Important |
| Custom readObject without field validation in Java Serializable class | Important |
| Rust serde untagged enum deserialized from untrusted input | Minor |
| Go gob.Decode() without size limits on network input | Minor |

## See Also

- `sec-owasp-a08-integrity-failures` -- parent OWASP category covering deserialization, SRI, and CI/CD integrity
- `sec-owasp-a03-injection` -- deserialization is a form of injection where the serialized data is the attack payload
- `principle-fail-fast` -- deserialization filters should reject unknown types immediately rather than allowing instantiation
- `principle-encapsulation` -- objects should validate their own invariants in deserialization callbacks (readObject, __setstate__)

## Authoritative References

- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [ysoserial: Java deserialization exploitation tool](https://github.com/frohoff/ysoserial)
- [PHPGGC: PHP Generic Gadget Chains](https://github.com/ambionics/phpggc)
- [Microsoft: BinaryFormatter security guide (deprecated)](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide)
- [PortSwigger: Insecure Deserialization](https://portswigger.net/web-security/deserialization)
- [Alvaro Munoz & Oleksandr Mirosh: Friday the 13th JSON Attacks (BlackHat 2017)](https://www.blackhat.com/docs/us-17/thursday/us-17-Munoz-Friday-The-13th-JSON-Attacks-wp.pdf)
- [Python pickle documentation: Security warning](https://docs.python.org/3/library/pickle.html)
- [NVD: CVE entries for CWE-502](https://nvd.nist.gov/vuln/search/results?cwe_id=CWE-502)
