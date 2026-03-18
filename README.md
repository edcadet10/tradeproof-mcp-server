# @tradeproof/mcp-server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives Claude access to contractor license data across all 50 US states and Washington, DC. Powered by [TradeProof](https://tradeproof.net) — 3.1 million+ license records sourced from official state licensing board databases.

## What This Does

This MCP server lets you ask Claude natural-language questions about contractor licenses and get answers backed by public records data:

- "Is ABC Construction licensed in Florida?"
- "Find all electrical contractors in Phoenix, AZ"
- "Check workers' comp coverage for Smith Roofing in California"
- "Are these 5 subcontractors licensed?" (batch lookup)

Claude calls the TradeProof API behind the scenes and returns structured results with license status, business name, classification, expiration date, and more.

## Prerequisites

- **Node.js 18+** (for native `fetch` support)
- **TradeProof API key** — get one free at [tradeproof.net/app#/api-keys](https://tradeproof.net/app#/api-keys)

## Installation

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tradeproof": {
      "command": "npx",
      "args": ["-y", "@tradeproof/mcp-server"],
      "env": {
        "TRADEPROOF_API_KEY": "tp_live_your_key_here"
      }
    }
  }
}
```

On **Windows**, if `npx` is not found, use:

```json
{
  "mcpServers": {
    "tradeproof": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@tradeproof/mcp-server"],
      "env": {
        "TRADEPROOF_API_KEY": "tp_live_your_key_here"
      }
    }
  }
}
```

After saving, **fully quit and restart** Claude Desktop to load the new server.

### Claude Code

```bash
claude mcp add --transport stdio \
  --env TRADEPROOF_API_KEY=tp_live_your_key_here \
  tradeproof -- npx -y @tradeproof/mcp-server
```

### claude.ai (Web)

Remote MCP servers can be added via **Settings > Connectors** on [claude.ai](https://claude.ai). If TradeProof is listed in the Anthropic Connectors Directory, you can enable it directly from there.

### Quick Test with npx

```bash
TRADEPROOF_API_KEY=tp_live_your_key_here npx @tradeproof/mcp-server
```

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for interactive testing:

```bash
TRADEPROOF_API_KEY=tp_live_your_key_here npx @modelcontextprotocol/inspector npx @tradeproof/mcp-server
```

## Available Tools

### `lookup_license`

Look up a specific contractor license by state and license number.

**Example prompts:**
- "Look up California contractor license #B-1234567"
- "What's the status of FL license CGC1234567?"

**Returns:** Business name, license status, type, classifications, issue/expiration dates, city, workers' comp status, bond amount, and last updated date.

### `search_contractors`

Search for contractors by business name, optionally filtered by state, city, classification, or status.

**Example prompts:**
- "Find licensed plumbers named 'Smith' in Texas"
- "Search for 'Acme Construction' across all states"
- "Find active electrical contractors in Phoenix, AZ"

**Returns:** Matching contractors with license numbers, status, type, city, and expiration dates. Supports pagination for large result sets.

### `check_batch`

Check the status of multiple contractor licenses at once (up to 100).

**Example prompts:**
- "Check if these 5 subcontractor licenses are active: CA #123, TX #456, FL #789..."
- "Which of these licenses are expired?"

**Returns:** Summary (e.g., "4 of 5 active") plus per-license details showing status, business name, and expiration.

### `check_insurance`

Check workers' compensation insurance coverage for an employer in a specific state.

**Example prompts:**
- "Does Smith Roofing have workers' comp in California?"
- "Check WC coverage for ABC Contractors in New York"

**Returns:** Coverage status, carrier, account number, effective/expiration dates. Not all states have WC data available.

### `get_coverage_info`

See which states and data types TradeProof covers. **This tool does not consume any API quota.**

**Example prompts:**
- "What states does TradeProof cover?"
- "Does TradeProof have data for Alaska?"

**Returns:** Total record count, list of states with license data, list of states with workers' comp data, and last data update timestamp.

## Getting an API Key

1. Go to [tradeproof.net](https://tradeproof.net) and create an account
2. Navigate to **Settings > API Keys** (or go directly to [tradeproof.net/app#/api-keys](https://tradeproof.net/app#/api-keys))
3. Click **Create API Key**
4. Copy your key (it starts with `tp_live_`)
5. Use it in your Claude configuration as shown above

## Pricing & Limits

| Plan | Monthly Lookups | Rate Limit | Price |
|------|----------------|------------|-------|
| Free | 25 | 10/min | $0 |
| Developer | 1,000 | 60/min | $99/month |
| Scale | 10,000 | 120/min | $349/month |

The `get_coverage_info` tool is free and does not count against your lookup quota.

When your monthly limit is reached, tools return a clear message with a link to upgrade at [tradeproof.net/app#/billing](https://tradeproof.net/app#/billing).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRADEPROOF_API_KEY` | Yes | Your TradeProof API key (starts with `tp_live_`) |
| `TRADEPROOF_BASE_URL` | No | Override API base URL (default: `https://tradeproof.net`) |

## Troubleshooting

### "TRADEPROOF_API_KEY environment variable is not set"

The server requires an API key. Make sure you have set it in your Claude Desktop config's `env` block or exported it in your shell before running the server.

### "Invalid TradeProof API key"

Your API key may be incorrect, expired, or revoked. Go to [tradeproof.net/app#/api-keys](https://tradeproof.net/app#/api-keys) to check your key status or create a new one.

### "Monthly lookup limit reached"

You have used all your lookups for the current billing period. Upgrade your plan at [tradeproof.net/app#/billing](https://tradeproof.net/app#/billing) or wait for the next billing cycle.

### Server not appearing in Claude Desktop

1. Make sure you saved the config file and fully quit Claude Desktop (not just close the window)
2. Restart Claude Desktop
3. Check that Node.js 18+ is installed: `node --version`
4. Test the server manually: `TRADEPROOF_API_KEY=your_key npx @tradeproof/mcp-server`

### Windows: "npx is not recognized"

Use the `cmd` wrapper in your config (see the Windows installation section above). Also ensure Node.js is in your PATH.

### "No license found" when you expected a result

- Double-check the license number format (some states use prefixes like "B-" or "CGC")
- Try searching by business name instead using the `search_contractors` tool
- Use `get_coverage_info` to confirm the state has data available
- The license may be under a different name (DBA vs. legal name)

## Data & Privacy

- All license data is sourced from official state licensing board databases (public records)
- TradeProof does not store your queries — lookups are processed and not retained
- See our full privacy policy at [tradeproof.net/privacy](https://tradeproof.net/privacy)
- TradeProof is **not** a Consumer Reporting Agency (CRA) as defined by the Fair Credit Reporting Act. Data is for informational purposes only and must not be used for employment screening, credit decisions, or any FCRA-governed purpose.

## License

MIT

## Links

- [TradeProof Website](https://tradeproof.net)
- [API Documentation](https://tradeproof.net/api-docs)
- [Get an API Key](https://tradeproof.net/app#/api-keys)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Report an Issue](https://github.com/edcadet10/tradeproof-mcp-server/issues)
