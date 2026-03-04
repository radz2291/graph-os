# Graph-OS Node Catalog

This catalog documents the built-in nodes provided by the `@graph-os/runtime` engine. For any Graph-OS configuration via a `cartridge.json`, you MUST strictly adhere to the `config` structures defined below.

## 1. `logic.validate`
Validates incoming signal payloads against JSON Schema constraints.

**Required Config:**
```json
{
  "type": "logic.validate",
  "config": {
    "schema": {
      "type": "object",
      "required": ["fieldName"],
      "properties": {
        "fieldName": { "type": "string", "minLength": 5, "pattern": "^[a-zA-Z]+$" },
        "age": { "type": "number", "minimum": 18, "maximum": 99 }
      }
    },
    "successSignalType": "VALIDATION.SUCCESS",
    "failureSignalType": "VALIDATION.FAILURE"
  }
}
```

**Supported Constraints:**
- `type`: string, number, integer, boolean, object, array, null
- `required`: Array of property names that must exist.
- **String constraints**: `minLength`, `maxLength`, `pattern` (Regex string).
- **Number constraints**: `minimum`, `maximum`.

## 2. `logic.transform`
Mutates incoming signal payloads via dot-notation bridging and deterministic transformations. Math operations require numerical source payloads.

**Required Config:**
```json
{
  "type": "logic.transform",
  "config": {
    "outputSignalType": "TRANSFORM.COMPLETED",
    "includeUnmatched": true,
    "constants": {
      "injectedMeta": true
    },
    "rules": [
      {
        "from": "user.email",
        "to": "email",
        "transform": "lowercase"
      },
      {
        "from": "cart.total",
        "to": "cart.tax",
        "transform": "multiply",
        "factor": 0.08
      }
    ]
  }
}
```

**Supported Transforms:**
- **String operations**: `uppercase`, `lowercase`, `trim`
- **Math operations**: `multiply`, `add`, `subtract`, `divide` (Requires `factor` or `value` property on rule).
- **Type casting**: `number`, `string`, `boolean`, `json`

## 3. `logic.router`
Routes signals unconditionally based on simple substring pattern matching of the input signal type.

**Required Config:**
```json
{
  "type": "logic.router",
  "config": {
    "defaultOutput": "ROUTER.UNMATCHED",
    "routes": [
      {
        "pattern": "AUTH",
        "output": "ROUTE.AUTH"
      }
    ]
  }
}
```
