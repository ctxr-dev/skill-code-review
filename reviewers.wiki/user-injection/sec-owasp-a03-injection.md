---
id: sec-owasp-a03-injection
type: primary
depth_role: leaf
focus: Detect injection vulnerabilities where untrusted input is concatenated into queries, commands, templates, or interpreters without proper sanitization or parameterization
parents:
  - index.md
covers:
  - SQL injection via string concatenation or interpolation in queries
  - OS command injection via user input passed to shell execution functions
  - "NoSQL injection via user-controlled operators ($where, $regex, $gt) in MongoDB-style queries"
  - LDAP injection via unsanitized input in LDAP filter construction
  - ORM raw query methods with string interpolation instead of parameterized bindings
  - "Server-side template injection (SSTI) in Jinja2, Mako, Mustache, EJS, Pug, Twig"
  - XPath injection via user input in XPath expressions
  - "Expression Language (EL) injection in Java EE, Spring, or OGNL"
  - "Header injection (CRLF injection) in HTTP response headers"
  - "XML External Entity (XXE) injection via unsafe XML parser configuration"
  - Code injection via eval, exec, or dynamic code generation with user input
  - User input concatenated into template strings before rendering
  - "Template engine render/compile called with user-controlled template source"
  - Jinja2, Mako, Twig, Freemarker, Velocity, Thymeleaf templates constructed from user data
  - "ERB, Pug/Jade, EJS templates built with string interpolation of request parameters"
  - Handlebars SafeString or triple-brace bypass with user-controlled content
  - Python format strings and f-strings with user-controlled format specifiers
  - Sandbox escape patterns in template engine sandboxes
  - Server-side Markdown or HTML rendering with embedded template expressions
  - Eval-like template compilation from user-supplied strings
  - Template inclusion or extends directives with user-controlled paths
tags:
  - owasp
  - injection
  - SQL-injection
  - command-injection
  - NoSQL-injection
  - LDAP-injection
  - template-injection
  - XSS
  - XXE
  - code-injection
  - CWE-89
  - CWE-78
  - CWE-90
  - CWE-943
  - CWE-1336
  - CWE-917
  - ssti
  - server-side
  - sandbox-escape
  - CWE-94
aliases:
  - sec-ssti
activation:
  file_globs:
    - "**/*repository*"
    - "**/*dao*"
    - "**/*query*"
    - "**/*sql*"
    - "**/*command*"
    - "**/*template*"
    - "**/*render*"
    - "**/*ldap*"
    - "**/*xml*"
    - "**/*exec*"
    - "**/*shell*"
    - "**/*mongo*"
  keyword_matches:
    - query
    - sql
    - SQL
    - SELECT
    - INSERT
    - UPDATE
    - DELETE
    - exec
    - execute
    - system
    - subprocess
    - shell
    - command
    - eval
    - template
    - render
    - LDAP
    - ldap
    - xpath
    - mongo
    - find
    - aggregate
    - $where
    - raw
    - interpolate
    - popen
    - backtick
    - Runtime.exec
    - os.system
    - child_process
    - Process.Start
    - sprintf
    - format
    - "f\""
  structural_signals:
    - String concatenation inside query construction
    - User input flowing into shell command
    - Template string used as template source, not variable
    - XML parser instantiation
    - eval or exec call with non-literal argument
source:
  origin: file
  path: sec-owasp-a03-injection.md
  hash: "sha256:49702e9697320f28f99d98b4124f0b2ab76fc02f44e2c446a1becea2e4de6ae0"
---
# Injection (OWASP A03:2021)

## When This Activates

Activates when diffs contain database queries, shell command execution, template rendering, XML parsing, LDAP operations, or any pattern where user input could flow into an interpreter. Injection dropped from #1 to #3 in OWASP 2021 but remains one of the most exploited vulnerability classes. The core issue is always the same: untrusted data is sent to an interpreter as part of a command or query, and the interpreter cannot distinguish between code and data. The fix is always the same: use parameterized interfaces that separate code from data.

**Primary CWEs**: CWE-89 (SQL Injection), CWE-78 (OS Command Injection), CWE-90 (LDAP Injection), CWE-943 (NoSQL Injection), CWE-1336 (Template Injection), CWE-917 (Expression Language Injection).

## Audit Surface

- [ ] SQL query built with string concatenation or template literals containing user input
- [ ] String formatting (f-string, format, sprintf, +) used inside SQL, LDAP, or XPath strings
- [ ] subprocess, exec, system, popen, or backtick called with user-controlled arguments
- [ ] Shell command string built by joining user input without escaping
- [ ] MongoDB query containing $where, $regex, $gt, $ne, or $exists from request parameters
- [ ] ORM .raw(), .execute(), .query() called with interpolated strings instead of parameter arrays
- [ ] Template rendered with user input as the template string itself, not as a variable
- [ ] eval(), exec(), Function(), or compile() called with user-derived string
- [ ] LDAP search filter built by concatenating user input without escaping special characters
- [ ] XPath expression constructed with user input without parameterization
- [ ] XML parser with external entity processing enabled (DOCTYPE, ENTITY)
- [ ] HTTP response header value set from user input without CRLF stripping
- [ ] User input passed to regular expression constructor without escaping (ReDoS risk)
- [ ] SQL stored procedure called with concatenated arguments
- [ ] GraphQL query built from string concatenation on the client side
- [ ] Deserialization of untrusted data (pickle, ObjectInputStream, unserialize) without type filtering

## Detailed Checks

### SQL Injection (CWE-89)
<!-- activation: keywords=["SELECT", "INSERT", "UPDATE", "DELETE", "sql", "query", "execute", "cursor", "prepare", "statement", "connection.query", "db.query", "knex.raw", "sequelize.query", "ActiveRecord", "where(", "find_by_sql", "execute(", "executeSql"] -->

- [ ] **String concatenation in SQL**: flag `"SELECT * FROM users WHERE id = " + userId` and all variants (f-strings, template literals, sprintf, String.format, string interpolation) -- this is the textbook SQL injection pattern. Use parameterized queries: `WHERE id = ?` with bind parameters
- [ ] **ORM raw query with interpolation**: flag `Model.where("name = '#{params[:name]}'")` (Rails), `Model.objects.raw(f"SELECT ... WHERE name = '{name}'")` (Django), `sequelize.query("SELECT ... " + input)` (Node.js) -- ORM raw queries bypass the ORM's built-in parameterization
- [ ] **Dynamic table or column names**: flag queries where table names or column names are user-controlled -- parameterized queries cannot bind identifiers, so these require an explicit allowlist check. `ORDER BY {user_input}` is injectable even with prepared statements
- [ ] **LIKE with unescaped wildcards**: flag `WHERE name LIKE '%' + input + '%'` -- even with parameterization, the `%` and `_` wildcards inside LIKE patterns need escaping if the user should not control them
- [ ] **Stored procedure with internal concatenation**: flag stored procedures that concatenate input into dynamic SQL internally (`EXEC sp_executesql @sql`) -- injection moves to the database layer but is still injection
- [ ] **Second-order injection**: flag patterns where user input is stored in the database and later used to construct a query without parameterization -- the input was safe at write time but dangerous at read time

### OS Command Injection (CWE-78)
<!-- activation: keywords=["subprocess", "exec", "system", "popen", "spawn", "shell", "command", "child_process", "Process", "Runtime", "backtick", "os.system", "os.popen", "shell=True", "cmd.exe", "/bin/sh", "bash -c"] -->

- [ ] **Shell=True with user input**: flag Python `subprocess.call(cmd, shell=True)` or `subprocess.Popen(cmd, shell=True)` where `cmd` includes user input -- with `shell=True`, metacharacters (`;`, `|`, `&&`, `$(...)`, backticks) in the input execute arbitrary commands. Use `subprocess.call([binary, arg1, arg2])` (array form, no shell)
- [ ] **String-based exec/system calls**: flag `os.system(command)`, `exec(command)` (PHP), `system(command)` (C/Ruby), `` `#{user_input}` `` (Ruby), `child_process.exec(cmd)` (Node.js) where the command string includes user input. Use array-based APIs: `execFile`, `spawn`, `ProcessBuilder`
- [ ] **Argument injection**: flag even array-based command execution when user input is used as a flag or option value without validation -- `["git", "clone", userUrl]` is safe against shell injection but a malicious URL like `--upload-pack=malicious` can inject git options. Validate or sanitize argument values
- [ ] **Indirect command execution**: flag user input flowing into filenames passed to interpreters (`python {user_file}`, `node {user_script}`) or configuration files that trigger command execution

### NoSQL Injection (CWE-943)
<!-- activation: keywords=["$where", "$regex", "$gt", "$ne", "$exists", "$in", "$or", "$and", "mongo", "MongoDB", "find(", "findOne(", "aggregate", "collection.", "db.collection"] -->

- [ ] **Operator injection**: flag MongoDB queries where user input can supply query operators. If `req.body` is `{"username": {"$gt": ""}, "password": {"$gt": ""}}`, the query matches all documents. Validate that user-supplied fields are scalar values, not objects
- [ ] **$where with user input**: flag `$where` clauses containing user input -- `$where` executes JavaScript on the server and is equivalent to `eval()` in MongoDB
- [ ] **$regex from user input**: flag `$regex` with user-controlled patterns -- unanchored or complex regex patterns cause ReDoS on the database server
- [ ] **Type confusion**: flag query construction in languages where HTTP parameters can arrive as strings or objects (Express.js `req.query`) -- an attacker can send `?role[$ne]=admin` to inject operators when the framework parses nested query strings

### Template Injection (CWE-1336)
<!-- activation: keywords=["render", "template", "Jinja2", "jinja", "Mako", "mako", "EJS", "ejs", "Pug", "pug", "Mustache", "Handlebars", "Twig", "Thymeleaf", "Freemarker", "render_template_string", "Template(", "from_string", "compile_string", "{{", "${", "<%="] -->

- [ ] **User input as template source**: flag `Template(user_input).render()` (Jinja2), `ejs.render(user_input)` (EJS), `new Template(user_input)` (any engine) -- when user input IS the template, the attacker can use template syntax to execute arbitrary code. User input should be a template variable, not the template itself
- [ ] **render_template_string with user data**: flag `render_template_string(user_input)` in Flask -- this compiles and executes user input as a Jinja2 template, enabling `{{ config.items() }}` or `{{ ''.__class__.__mro__ }}` exploitation
- [ ] **Unescaped output in templates**: flag `{{{ variable }}}` (Handlebars), `{{ variable | safe }}` (Jinja2), `<%- variable %>` (EJS), `th:utext` (Thymeleaf) when the variable contains user input -- these disable HTML escaping and enable XSS
- [ ] **Expression Language injection**: flag user input reaching Spring EL `#{...}`, JSP EL `${...}`, OGNL, or MVEL expressions -- these can execute arbitrary Java code

### XML and XPath Injection
<!-- activation: keywords=["XML", "xml", "parse", "SAX", "DOM", "etree", "lxml", "XPath", "xpath", "XSLT", "DOCTYPE", "ENTITY", "XMLReader", "DocumentBuilder", "XmlDocument", "XMLParser"] -->

- [ ] **XXE: external entities enabled**: flag XML parsers that do not disable external entity processing. Default configurations of Java `DocumentBuilderFactory`, Python `xml.etree`, PHP `simplexml_load_string`, and .NET `XmlDocument` may process external entities, allowing file read (`file:///etc/passwd`), SSRF, or denial of service
- [ ] **DTD processing enabled**: flag XML parsers that allow DOCTYPE declarations when parsing untrusted input -- disable DTD processing entirely: `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`
- [ ] **XPath with string concatenation**: flag `xpath("//users/user[name='" + input + "']")` -- XPath has no parameterized query support in most languages, so input must be escaped or use a precompiled expression with variables
- [ ] **XSLT from untrusted source**: flag applying XSLT transformations from user-supplied stylesheets -- XSLT can execute arbitrary code via extension functions

### Code Injection and Deserialization
<!-- activation: keywords=["eval", "exec", "Function(", "compile", "pickle", "unpickle", "ObjectInputStream", "readObject", "unserialize", "yaml.load", "Marshal.load", "fromCharCode", "setTimeout(string", "setInterval(string"] -->

- [ ] **eval/exec with user input**: flag `eval(userInput)`, `exec(userInput)`, `new Function(userInput)` in any language -- these execute arbitrary code. There is almost never a legitimate reason to eval user input
- [ ] **Unsafe deserialization**: flag `pickle.loads(untrusted)` (Python), `ObjectInputStream.readObject()` without type filtering (Java), `unserialize(untrusted)` (PHP), `yaml.load(untrusted)` without `SafeLoader` (Python), `Marshal.load(untrusted)` (Ruby) -- deserialization of untrusted data leads to remote code execution via gadget chains
- [ ] **Dynamic code generation**: flag `compile()`, `code.InteractiveConsole`, or runtime code generation from user input -- even if not directly `eval`, compiling user input into executable code is injection
- [ ] **setTimeout/setInterval with strings**: flag `setTimeout(userString, ms)` in JavaScript -- when passed a string instead of a function, these act as eval

## Common False Positives

- **Parameterized queries that look like concatenation**: some query builders produce parameterized SQL via method chaining that resembles string building. Verify the library documentation -- if `query.where("id = ?", id)` uses bind parameters internally, it is safe.
- **Static SQL with computed constants**: queries built from compile-time constants or server-controlled enums (not user input) are not injectable. `"SELECT * FROM " + TABLE_NAME` where `TABLE_NAME` is a constant defined in the same file is safe.
- **Template rendering with escaped variables**: the default behavior of most template engines is to HTML-escape variables. `{{ user_name }}` in Jinja2 auto-escapes. Flag only when escaping is explicitly disabled or when the template string itself is user-controlled.
- **Subprocess with static commands**: `subprocess.call(["ls", "-la"])` with all-literal arguments is not command injection. Flag only when at least one argument derives from user input.
- **ORM query builder methods**: `Model.objects.filter(name=user_input)` in Django, `where(name: params[:name])` in Rails are parameterized by default. Flag only `.raw()`, `.extra()`, or string-interpolated `where` clauses.
- **Admin/developer tools**: internal developer tools, database migration scripts, or CLI utilities that accept input only from trusted administrators are lower risk. Flag with a note, but do not treat as Critical.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQL query built by concatenating user input | Critical |
| OS command executed with user input via shell=True or system() | Critical |
| eval/exec/Function called with user-derived string | Critical |
| Unsafe deserialization of untrusted data (pickle, ObjectInputStream, unserialize) | Critical |
| Template engine rendering user input as template source (SSTI) | Critical |
| XXE: XML parser with external entities enabled on untrusted input | Critical |
| MongoDB $where clause with user input | Critical |
| ORM raw query with string interpolation instead of bind parameters | Important |
| NoSQL operator injection via unvalidated request body shape | Important |
| XPath expression built by concatenating user input | Important |
| User input in dynamic table/column name without allowlist validation | Important |
| Unescaped template output (triple-stache, safe filter) with user content | Important |
| LDAP filter built by concatenating user input | Important |
| User input in regex constructor without escaping (ReDoS) | Minor |
| LIKE pattern with user-controlled wildcards (parameterized but unescaped) | Minor |
| GraphQL query string built by concatenation on client side | Minor |

## See Also

- `principle-fail-fast` -- input validation at the boundary prevents injection from reaching interpreters
- `principle-separation-of-concerns` -- data access and command execution should be isolated behind interfaces that enforce parameterization
- `sec-owasp-a01-broken-access-control` -- injection often bypasses access control by manipulating queries to return unauthorized data
- `sec-owasp-a04-insecure-design` -- missing input validation at trust boundaries is a design-level cause of injection

## Authoritative References

- [OWASP Top 10:2021 - A03 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
- [OWASP Server Side Template Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server-side_Template_Injection)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [PortSwigger Web Security Academy - Server-Side Template Injection](https://portswigger.net/web-security/server-side-template-injection)
- [OWASP XXE Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
