# Pydantic — Review Overlay

Load this overlay for the **architecture-design**, **api-design**, and **testing** specialists when `pydantic` is detected in Python project dependencies.

---

## Model Definition

- [ ] Field constraints (`gt`, `lt`, `ge`, `le`, `min_length`, `max_length`, `pattern`, `multiple_of`) are applied at the field level rather than validated imperatively inside a `@field_validator` — declarative constraints are enforced earlier, generate correct JSON Schema, and are surfaced in OpenAPI docs automatically
- [ ] Optional fields use `field: Type | None = None` (Pydantic v2) rather than bare `Optional[Type]` without a default, which behaves differently during validation and is a common source of subtle bugs when migrating from v1
- [ ] `model_config = ConfigDict(...)` (v2) or `class Config:` (v1) settings are reviewed: `extra = 'forbid'` is preferred for request models so that unexpected fields are rejected rather than silently ignored; `extra = 'ignore'` is flagged unless there is a documented reason

## Validators

- [ ] `@field_validator` (v2) / `@validator` (v1) functions that check cross-field relationships are replaced with `@model_validator(mode='after')` — field validators cannot reliably access sibling fields because validation order is not guaranteed
- [ ] `@field_validator` decorators specify `mode='before'` when they need to coerce the raw input type (e.g., string to integer) and `mode='after'` when they need to inspect the already-parsed value — mixing modes incorrectly causes validators to receive the wrong type
- [ ] Validators raise `ValueError` or `PydanticCustomError` with a human-readable message rather than returning `None` or swallowing the error silently; validators that return a value without raising perform coercion, which must be intentional and documented

## Strict Mode

- [ ] Strict mode (`model_config = ConfigDict(strict=True)` or per-field `Annotated[int, Field(strict=True)]`) is used for models that accept external untrusted input where implicit coercion (string `"1"` parsed as integer `1`) is a security or correctness concern
- [ ] Models used as API response serializers (output-only) are not also used as request validators (input) — a single model used for both purposes often has conflicting requirements (e.g., `id` is required in output but must not be provided in input)

## Serialization

- [ ] `model.model_dump()` (v2) / `model.dict()` (v1) is called with explicit `exclude_none=True` or `exclude_unset=True` when building API responses to avoid sending `null` for every optional field that was not set
- [ ] `model.model_dump_json()` is used instead of `json.dumps(model.model_dump())` when performance matters — `model_dump_json()` uses Rust-backed serialization and avoids constructing an intermediate Python dict
- [ ] `model_dump(mode='json')` is used when the result will be serialized to JSON (e.g., for a cache write) rather than `model_dump()`, which returns Python-native types (e.g., `datetime` objects) that are not directly JSON-serializable

## Advanced Features

- [ ] Discriminated unions use `Literal` type discriminator fields (`Annotated[Union[Cat, Dog], Field(discriminator='species')]`) rather than bare `Union[Cat, Dog]` — bare unions trigger exhaustive try-each-type validation that is slow and produces poor error messages
- [ ] `computed_field` (v2) decorators on properties used for JSON output are reviewed: computationally expensive computed fields are either cached (`@cached_property`) or moved to a dedicated serialization step to avoid re-computing per serialization call
- [ ] Custom types implemented via `__get_validators__` (v1) or `__get_pydantic_core_schema__` (v2) are tested for both valid and invalid inputs; custom type validators that never raise will silently accept malformed data

## JSON Schema and OpenAPI

- [ ] `model_json_schema()` output is reviewed when the model is used to generate OpenAPI or another schema contract — field titles, descriptions, and `json_schema_extra` are set on fields intended to be consumer-facing documentation rather than relying on auto-generated names
- [ ] Schema export for models with forward references or self-referential fields (trees, linked lists) uses `model_rebuild()` before export to ensure all references are resolved; unresolved references produce incomplete schemas that silently omit constraints

## BaseSettings

- [ ] Application configuration uses `pydantic-settings` `BaseSettings` with `model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')` — direct `os.getenv()` calls scattered through the codebase are flagged as they bypass type validation and cannot be easily audited
- [ ] `BaseSettings` models define required fields without defaults for all secrets and critical config values so that missing environment variables cause a startup validation error with a clear field name, rather than a runtime `AttributeError` or silent `None` later
- [ ] Sensitive settings fields (passwords, tokens, private keys) use `SecretStr` as their type to prevent accidental logging via `repr()` or `model_dump()` without `reveal_secrets=True`
