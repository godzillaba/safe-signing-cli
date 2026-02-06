# Gnosis Safe Transaction Signing Utility

This tool allows users to specify a gnosis safe transaction batch with JSON and sign it in the browser. Signatures can then be collected and executed with this same tool.

```
npx @godzillaba/safe-signing-cli@1.0.0
```

Transaction file sample:

```json
[
  {
    "to": "0x1234567890abcdef1234567890abcdef12345678",
    "value": "0",
    "data": "0xabcdef",
    "operation": 0
  },
  {
    "to": "0x1234567890abcdef1234567890abcdef12345678",
    "value": "0",
    "data": "0x112233",
    "operation": 0
  }
]
```
