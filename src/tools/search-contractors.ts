import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TradeProofClient } from "../client.js";
import { VALID_STATES, formatError } from "../util.js";

export function registerSearchContractors(server: McpServer, client: TradeProofClient): void {
  server.tool(
    "search_contractors",
    "Search for contractors by business name across all 50 US states (or filtered to a specific state). Returns matching licenses with status, type, city, and expiration. Supports partial name matching. Can also filter by city, classification code, or license status.",
    {
      business_name: z.string().min(2).describe("Business name to search for (partial match supported)"),
      state: z.string().length(2).optional().describe("Two-letter state code to limit search (omit to search all states)"),
      city: z.string().optional().describe("City name to filter by"),
      classification: z.string().optional().describe("License classification code (e.g., B for General Building, C-10 for Electrical)"),
      status: z.string().optional().describe("License status filter (e.g., ACTIVE, CLEAR, Expired)"),
      page: z.number().int().min(1).default(1).describe("Page number (default: 1)"),
      per_page: z.number().int().min(1).max(50).default(10).describe("Results per page, 1-50 (default: 10)"),
    },
    async ({ business_name, state, city, classification, status, page, per_page }) => {
      if (state) {
        const st = state.toUpperCase();
        if (!VALID_STATES.has(st)) {
          return { content: [{ type: "text" as const, text: `Invalid state code: "${state}". Use a two-letter US state code.` }], isError: true };
        }
      }

      const result = await client.searchContractors({
        business_name,
        state,
        city,
        classification,
        status,
        page,
        per_page,
      });

      if (!result.ok) {
        return formatError(result.error);
      }

      const { items, total, pages } = result.data;

      if (items.length === 0) {
        let msg = `No contractors found matching "${business_name}"`;
        if (state) msg += ` in ${state.toUpperCase()}`;
        msg += ". Try a shorter or different name, or search without the state filter.";
        return { content: [{ type: "text" as const, text: msg }], isError: false };
      }

      const lines: string[] = [];
      let header = `Found ${total} contractor${total === 1 ? "" : "s"} matching "${business_name}"`;
      if (state) header += ` in ${state.toUpperCase()}`;
      lines.push(header + ":\n");

      for (let i = 0; i < items.length; i++) {
        const r = items[i]!;
        lines.push(`${(page - 1) * per_page + i + 1}. ${r.business_name || "Unknown"} (${r.state})`);
        lines.push(`   License: ${r.license_number} | Status: ${r.status || "Unknown"} | Type: ${r.license_type || "N/A"}`);
        const details = [
          r.city ? `City: ${r.city}` : null,
          r.expiration_date ? `Expires: ${r.expiration_date}` : null,
        ].filter(Boolean).join(" | ");
        if (details) lines.push(`   ${details}`);
        lines.push("");
      }

      if (pages > 1) {
        lines.push(`Page ${page} of ${pages} (${total} total results)`);
      }

      // Cross-state results
      if (result.data.other_states_total && result.data.other_states_total > 0) {
        lines.push("");
        lines.push(`Also found in other states: ${result.data.other_states?.map(s => `${s.state} (${s.count})`).join(", ")}`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
