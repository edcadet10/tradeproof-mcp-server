import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TradeProofClient } from "../client.js";
import { VALID_STATES, formatError } from "../util.js";

export function registerCheckInsurance(server: McpServer, client: TradeProofClient): void {
  server.tool(
    "check_insurance",
    "Check workers' compensation insurance coverage for an employer in a specific state. Returns whether coverage is active, the insurance carrier, account number, effective/expiration dates. Data sourced from state workers' comp databases. Not all states have WC data — use get_coverage_info to see which states are supported.",
    {
      state: z.string().length(2).describe("Two-letter US state code"),
      employer: z.string().min(2).describe("Employer/business name to look up"),
    },
    async ({ state, employer }) => {
      const st = state.toUpperCase();
      if (!VALID_STATES.has(st)) {
        return { content: [{ type: "text" as const, text: `Invalid state code: "${state}". Use a two-letter US state code.` }], isError: true };
      }

      const result = await client.checkInsurance(st, employer.trim());

      if (!result.ok) {
        if (result.error.code === "not_found") {
          return {
            content: [{ type: "text" as const, text: [
              `No workers' compensation coverage found for "${employer}" in ${st}.`,
              "",
              "This could mean:",
              "- The employer name is spelled differently in state records",
              "- The employer is not required to carry WC in this state",
              "- Coverage has lapsed",
              "",
              "Try searching with a shorter name, or check the employer's exact legal name.",
            ].join("\n") }],
            isError: false,
          };
        }
        return formatError(result.error);
      }

      const r = result.data;

      if (!r.found) {
        return {
          content: [{ type: "text" as const, text: [
            `No workers' compensation coverage found for "${employer}" in ${st}.`,
            "",
            "Try searching with a shorter or different business name.",
          ].join("\n") }],
          isError: false,
        };
      }

      const lines = [
        `Workers' Comp for "${r.employer}" in ${r.state}:`,
        "",
        `Coverage: ACTIVE`,
        r.account_number ? `Account: ${r.account_number}` : null,
        r.coverage_start ? `Effective: ${r.coverage_start}` : null,
        r.coverage_end ? `Expires: ${r.coverage_end}` : null,
        r.status ? `Status: ${r.status}` : null,
        r.verified_at ? `Data as of: ${r.verified_at}` : null,
      ].filter(Boolean);

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
