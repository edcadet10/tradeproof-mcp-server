#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const apiKey = process.env.TRADEPROOF_API_KEY;

if (!apiKey) {
  console.error("ERROR: TRADEPROOF_API_KEY environment variable is not set.");
  console.error("Get your API key at https://tradeproof.net/app#/api-keys");
  process.exit(1);
}

if (apiKey.startsWith("tp_sandbox_") || apiKey.startsWith("tp_train_")) {
  console.error("ERROR: Sandbox/training keys cannot access production data.");
  console.error("Use a production API key (tp_live_...) for lookups.");
  process.exit(1);
}

if (!apiKey.startsWith("tp_live_") && !apiKey.startsWith("tp_")) {
  console.error("WARNING: API key does not match expected format (tp_live_...). Proceeding anyway.");
}

const baseUrl = process.env.TRADEPROOF_BASE_URL;

if (baseUrl && !baseUrl.startsWith("https://")) {
  console.error("WARNING: Base URL is not HTTPS. API key will be sent in plaintext.");
}

const server = createServer(apiKey, baseUrl);
const transport = new StdioServerTransport();

console.error(`TradeProof MCP Server v1.0.0 starting...`);
console.error(`API key configured (prefix: ${apiKey.slice(0, 8)}****)`);

await server.connect(transport);

console.error("TradeProof MCP Server connected and ready.");
