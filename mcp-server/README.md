# Tax Core MCP Server (Starter)

Minimal MCP server scaffold for work use, implemented in TypeScript over stdio transport.

## What it provides
- `health_check` tool
- `add_numbers` tool
- `create_vat_claim_stub` tool (draft Tax Core claim payload)
- `validate_dk_vat_filing` tool (field validation + derived VAT result)
- `evaluate_dk_vat_filing_obligation` tool (obligation and cadence decision)

## Prerequisites
- Node.js 18+ (you have Node 24)

## Setup
```bash
cd mcp-server
npm install
```

## Run
```bash
npm run dev
```

## Build and run
```bash
npm run build
npm start
```

## Tool notes
- `validate_dk_vat_filing` checks:
  - CVR format
  - date validity and period order
  - non-negative value constraints for VAT/rubrik fields
  - zero filing consistency
  - cross-field warnings (for example, abroad VAT with empty Rubrik A)
  - derived `netVatAmount`, `resultType`, `claimAmount`

- `evaluate_dk_vat_filing_obligation` returns:
  - filing required or not
  - cadence (`monthly`, `quarterly`, `half_yearly`)
  - return type (`regular` or `zero`)
  - compliance status (`submitted`, `due`, `overdue`)
  - risk flags

## Example MCP client config (stdio)
Use the absolute path to your built entrypoint if your client requires it.

```json
{
  "mcpServers": {
    "tax-core": {
      "command": "node",
      "args": [
        "C:/Users/tbi/OneDrive - Netcompany/Documents/Projects/VATRI/Codex/mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Suggested next work steps
1. Add legal-rule versioning by effective date and scenario profile.
2. Add correction filing semantics (delta vs full replacement).
3. Add automated tests for edge-case filings and obligation outputs.
