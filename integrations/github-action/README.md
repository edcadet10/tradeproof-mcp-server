# TradeProof License Check — GitHub Action

Automatically verify contractor and subcontractor licenses against **5M+ official state records** as part of your CI/CD pipeline. Catch expired, revoked, or non-existent licenses before approving PRs or deploying.

## Quick Start

```yaml
# .github/workflows/check-licenses.yml
name: License Check
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: edcadet10/tradeproof-mcp-server/integrations/github-action@v1
        with:
          api_key: ${{ secrets.TRADEPROOF_API_KEY }}
          licenses: |
            [
              {"state": "FL", "license_number": "CGC061473"},
              {"state": "CA", "license_number": "B-1234567"}
            ]
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | Yes | — | Your TradeProof API key. Store it as a [GitHub secret](https://docs.github.com/en/actions/security-guides/encrypted-secrets). |
| `licenses` | Yes | — | JSON array of licenses to verify. Each object needs `state` (2-letter code) and `license_number`. |
| `fail_on_invalid` | No | `"true"` | Set to `"false"` to report results without failing the workflow. |

## Outputs

| Output | Description |
|--------|-------------|
| `results` | Full JSON array of verification results from the TradeProof API. |
| `summary` | Human-readable summary, e.g. `3/4 license(s) active`. |
| `all_valid` | `"true"` if every license is active/valid, `"false"` otherwise. |

## Examples

### Verify licenses from a file

If your repo maintains a `subcontractors.json` file, you can read it dynamically:

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: read
        run: echo "licenses=$(cat subcontractors.json)" >> "$GITHUB_OUTPUT"

      - uses: edcadet10/tradeproof-mcp-server/integrations/github-action@v1
        id: check
        with:
          api_key: ${{ secrets.TRADEPROOF_API_KEY }}
          licenses: ${{ steps.read.outputs.licenses }}

      - run: echo "${{ steps.check.outputs.summary }}"
```

### Non-blocking check (warn but don't fail)

```yaml
- uses: edcadet10/tradeproof-mcp-server/integrations/github-action@v1
  with:
    api_key: ${{ secrets.TRADEPROOF_API_KEY }}
    fail_on_invalid: "false"
    licenses: |
      [
        {"state": "TX", "license_number": "12345"}
      ]
```

### Use results in downstream steps

```yaml
- uses: edcadet10/tradeproof-mcp-server/integrations/github-action@v1
  id: license_check
  with:
    api_key: ${{ secrets.TRADEPROOF_API_KEY }}
    licenses: '[{"state":"FL","license_number":"CGC061473"}]'

- if: steps.license_check.outputs.all_valid == 'false'
  run: |
    echo "Some licenses failed verification."
    echo "${{ steps.license_check.outputs.results }}"
```

## Job Summary

The action automatically writes a markdown summary table to the **GitHub Actions job summary**, visible on the workflow run page. It includes the status, state, license number, and holder name for each license checked.

## Getting an API Key

Sign up at [tradeproof.net](https://tradeproof.net) and generate a Developer API key from your dashboard. The Sandbox tier is free for testing.

## Requirements

- **Runner**: Any GitHub-hosted runner with Node.js 18+ (all `ubuntu-latest`, `windows-latest`, and `macos-latest` runners qualify).
- **No dependencies**: The action is a single self-contained JavaScript file. No `npm install` or build step needed.

## How It Works

1. Parses the `licenses` JSON input.
2. Sends a `POST` request to `https://tradeproof.net/v1/verify/batch` with the API key.
3. Counts active vs. invalid/expired/not-found licenses.
4. Sets `results`, `summary`, and `all_valid` outputs.
5. Writes a summary table to the GitHub job summary.
6. Exits with code 1 if any license is invalid and `fail_on_invalid` is `"true"`.

## License

MIT
