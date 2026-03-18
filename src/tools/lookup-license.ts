import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TradeProofClient } from "../client.js";
import { VALID_STATES, formatError } from "../util.js";

export function registerLookupLicense(server: McpServer, client: TradeProofClient): void {
  server.tool(
    "lookup_license",
    "Look up a specific contractor license by state and license number. Returns license status, business name, classifications, expiration date, workers comp status, and bond amount. Data is sourced from official state licensing board databases.",
    {
      state: z.string().length(2).describe("Two-letter US state code (e.g., CA, TX, FL)"),
      license_number: z.string().min(1).describe("The exact license number to look up"),
    },
    async ({ state, license_number }) => {
      const st = state.toUpperCase();
      if (!VALID_STATES.has(st)) {
        return { content: [{ type: "text" as const, text: `Invalid state code: "${state}". Use a two-letter US state code (e.g., CA, TX, FL).` }], isError: true };
      }

      const result = await client.lookupLicense(st, license_number.trim());

      if (!result.ok) {
        if (result.error.code === "not_found") {
          return {
            content: [{ type: "text" as const, text: `No license found for "${license_number}" in ${st}. The license number may be incorrect, or this state's data may not include this license type. Try searching by business name with the search_contractors tool.` }],
            isError: false,
          };
        }
        return formatError(result.error);
      }

      const r = result.data;
      const lines = [
        `License: ${r.license_number}`,
        `State: ${r.state}`,
        `Business: ${r.business_name || "N/A"}`,
        r.dba_name ? `DBA: ${r.dba_name}` : null,
        `Status: ${r.status || "Unknown"}`,
        `Type: ${r.license_type || "N/A"}`,
        r.classifications?.length ? `Classifications: ${r.classifications.join(", ")}` : null,
        r.issue_date ? `Issued: ${r.issue_date}` : null,
        r.expiration_date ? `Expires: ${r.expiration_date}` : null,
        r.city ? `City: ${r.city}` : null,
        `Workers Comp: ${r.workers_comp === true ? "Yes" : r.workers_comp === false ? "No" : "Unknown"}`,
        r.bond_amount ? `Bond: $${r.bond_amount.toLocaleString()}` : null,
        r.entity_type ? `Entity: ${r.entity_type}` : null,
        r.last_updated ? `Last Updated: ${r.last_updated}` : null,
      ].filter(Boolean);

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
