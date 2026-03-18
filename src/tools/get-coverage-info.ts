import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TradeProofClient } from "../client.js";
import { ALL_STATES, formatError } from "../util.js";

export function registerGetCoverageInfo(server: McpServer, client: TradeProofClient): void {
  server.tool(
    "get_coverage_info",
    "Get information about TradeProof's data coverage — which US states have license data, which have workers' comp data, and total record counts. This tool is free and does not consume any API quota. Use it to check whether a particular state is supported before doing a lookup.",
    {},
    async () => {
      const [coverageResult, statsResult] = await Promise.all([
        client.getCoverage(),
        client.getStats(),
      ]);

      if (!coverageResult.ok) return formatError(coverageResult.error);
      if (!statsResult.ok) return formatError(statsResult.error);

      const coverage = coverageResult.data;
      const stats = statsResult.data;

      const licenseSet = new Set(coverage.license_states);
      const wcSet = new Set(coverage.wc_states);
      const missingLicense = ALL_STATES.filter(s => !licenseSet.has(s));
      const missingWC = ALL_STATES.filter(s => !wcSet.has(s));

      const lines = [
        "TradeProof Data Coverage:",
        "",
        `Total Records: ${stats.total_licenses.toLocaleString()} across ${coverage.total_license_states} states`,
        stats.last_data_update ? `Last Data Update: ${stats.last_data_update}` : null,
        "",
        `License Data (${coverage.total_license_states} states):`,
        `  ${coverage.license_states.join(", ")}`,
        "",
        `Workers' Comp Data (${coverage.total_wc_states} states):`,
        `  ${coverage.wc_states.join(", ")}`,
      ].filter(v => v !== null) as string[];

      if (missingLicense.length > 0 && missingLicense.length < 10) {
        lines.push("");
        lines.push(`States without license data: ${missingLicense.join(", ")}`);
      }
      if (missingWC.length > 0 && missingWC.length <= 20) {
        lines.push("");
        lines.push(`States without WC data: ${missingWC.join(", ")}`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );
}
