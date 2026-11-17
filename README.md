# Gnosis Safe Transaction Signing Utility

This tool allows users to specify a gnosis safe transaction batch with JSON and sign it in the browser. Signatures can then be collected and executed with this same tool.

```
npx @godzillaba/safe-signing-cli@2.0.0
```

The transaction file is a [Safe Transaction Builder](https://help.safe.global/en/articles/40841-transaction-builder) JSON export. Its `chainId` must match the RPC's chain. Each transaction needs hex `data`.

Transaction file sample:

```json
{
  "chainId": "1",
  "transactions": [
    {
      "to": "0x1234567890abcdef1234567890abcdef12345678",
      "value": "0",
      "data": "0xabcdef"
    },
    {
      "to": "0x1234567890abcdef1234567890abcdef12345678",
      "value": "0",
      "data": "0x112233"
    }
  ]
}
```
