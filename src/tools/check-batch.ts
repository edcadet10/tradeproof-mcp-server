import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TradeProofClient } from "../client.js";
import { VALID_STATES, formatError } from "../util.js";

export function registerCheckBatch(server: McpServer, client: TradeProofClient): void {
  server.tool(
    "check_batch",
    "Check the status of multiple contractor licenses at once (up to 100). For each license, returns whether it is active or not, along with business name and expiration date. Useful for checking a subcontractor list or all licenses on a project.",
    {
      licenses: z.array(z.object({
        state: z.string().length(2).describe("Two-letter state code"),
        license_number: z.string().min(1).describe("License number"),
      })).min(1).max(100).describe("Array of licenses to check"),
    },
    async ({ licenses }) => {
      // Validate all state codes
      const invalid = licenses.filter(l => !VALID_STATES.has(l.state.toUpperCase()));
      if (invalid.length > 0) {
        return {
          content: [{ type: "text" as const, text: `Invalid state code(s): ${invalid.map(l => `"${l.state}"`).join(", ")}. Use two-letter US state codes.` }],
          isError: true,
        };
      }

      const result = await client.checkBatch(licenses);

      if (!result.ok) {
        return formatError(result.error);
      }

      const items = result.data;
      const valid = items.filter(i => i.valid);
      const notValid = items.filter(i => !i.valid && i.status !== null && i.status !== "NOT_FOUND");
      const notFound = items.filter(i => !i.valid && (i.status === null || i.status === "NOT_FOUND"));

      const lines: string[] = [];
      lines.push(`Batch check: ${valid.length}/${items.length} licenses active\n`);

      if (valid.length > 0) {
        lines.push("ACTIVE:");
        for (const i of valid) {
          lines.push(`  ✓ ${i.license_number} (${i.state}) — ${i.business_name || "Unknown"} — Expires: ${i.expiration_date || "N/A"}`);
        }
        lines.push("");
      }

      if (notValid.length > 0) {
        lines.push("NOT ACTIVE:");
        for (const i of notValid) {
          lines.push(`  ✗ ${i.license_number} (${i.state}) — Status: ${i.status}${i.business_name ? ` — ${i.business_name}` : ""}`);
        }
        lines.push("");
      }

      if (notFound.length > 0) {
        lines.push("NOT FOUND:");
        for (const i of notFound) {
          lines.push(`  ? ${i.license_number} (${i.state}) — No record in database`);
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
