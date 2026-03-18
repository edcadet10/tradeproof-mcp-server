import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TradeProofClient } from "./client.js";
import { registerLookupLicense } from "./tools/lookup-license.js";
import { registerSearchContractors } from "./tools/search-contractors.js";
import { registerCheckBatch } from "./tools/check-batch.js";
import { registerCheckInsurance } from "./tools/check-insurance.js";
import { registerGetCoverageInfo } from "./tools/get-coverage-info.js";

export function createServer(apiKey: string, baseUrl?: string): McpServer {
  const server = new McpServer({
    name: "tradeproof",
    version: "1.0.0",
  });

  const client = new TradeProofClient(apiKey, baseUrl, "1.0.0");

  registerLookupLicense(server, client);
  registerSearchContractors(server, client);
  registerCheckBatch(server, client);
  registerCheckInsurance(server, client);
  registerGetCoverageInfo(server, client);

  return server;
}
