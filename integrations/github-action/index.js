// TradeProof License Check — GitHub Action
// No dependencies. Runs on Node 18+ (native fetch).

const fs = require("fs");
const path = require("path");

const API_BASE = "https://tradeproof.net";
const BATCH_ENDPOINT = "/v1/verify/batch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Append a key=value pair to the GITHUB_OUTPUT file. */
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    console.log(`::set-output name=${name}::${value}`); // fallback for older runners
    return;
  }
  // Use a delimiter for multi-line values
  const delimiter = `ghadelimiter_${Date.now()}`;
  fs.appendFileSync(
    outputFile,
    `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
    { encoding: "utf8" }
  );
}

/** Append markdown to the job summary. */
function writeSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) {
    console.log(markdown);
    return;
  }
  fs.appendFileSync(summaryFile, markdown + "\n", { encoding: "utf8" });
}

/** Print an Actions error annotation and exit 1. */
function fail(message) {
  console.log(`::error::${message}`);
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  // ---- Read inputs --------------------------------------------------------
  const apiKey = (process.env.INPUT_API_KEY || "").trim();
  const licensesRaw = (process.env.INPUT_LICENSES || "").trim();
  const failOnInvalid =
    (process.env.INPUT_FAIL_ON_INVALID || "true").trim().toLowerCase() ===
    "true";

  if (!apiKey) {
    fail("api_key input is required. Store your TradeProof API key as a GitHub secret.");
    return;
  }

  if (!licensesRaw) {
    fail("licenses input is required. Provide a JSON array of licenses to verify.");
    return;
  }

  // ---- Parse licenses JSON ------------------------------------------------
  let licenses;
  try {
    licenses = JSON.parse(licensesRaw);
  } catch (err) {
    fail(`Failed to parse licenses JSON: ${err.message}`);
    return;
  }

  if (!Array.isArray(licenses) || licenses.length === 0) {
    fail("licenses must be a non-empty JSON array.");
    return;
  }

  // Validate each entry
  for (let i = 0; i < licenses.length; i++) {
    const l = licenses[i];
    if (!l.state || !l.license_number) {
      fail(
        `License entry at index ${i} is missing required fields "state" and/or "license_number".`
      );
      return;
    }
  }

  console.log(`Verifying ${licenses.length} license(s) via TradeProof API...`);

  // ---- Call TradeProof API ------------------------------------------------
  let response;
  try {
    response = await fetch(`${API_BASE}${BATCH_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ licenses }),
    });
  } catch (err) {
    fail(`TradeProof API request failed: ${err.message}`);
    return;
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch (_) {
      // ignore
    }
    if (response.status === 401 || response.status === 403) {
      fail(
        `Authentication failed (HTTP ${response.status}). Check that your TRADEPROOF_API_KEY secret is valid.`
      );
    } else {
      fail(
        `TradeProof API returned HTTP ${response.status}: ${body || "(no body)"}`
      );
    }
    return;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    fail(`Failed to parse API response as JSON: ${err.message}`);
    return;
  }

  // ---- Process results ----------------------------------------------------
  const results = data.results || data; // handle both {results:[...]} and raw array
  const resultArray = Array.isArray(results) ? results : [results];

  let validCount = 0;
  let invalidCount = 0;

  for (const r of resultArray) {
    const status = (r.status || "").toLowerCase();
    if (status === "active" || status === "valid") {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  const total = resultArray.length;
  const allValid = invalidCount === 0;
  const summaryText = `${validCount}/${total} license(s) active`;

  console.log(`Result: ${summaryText}`);

  // ---- Set outputs --------------------------------------------------------
  setOutput("results", JSON.stringify(resultArray, null, 2));
  setOutput("summary", summaryText);
  setOutput("all_valid", allValid ? "true" : "false");

  // ---- Write job summary --------------------------------------------------
  const statusIcon = (r) => {
    const s = (r.status || "").toLowerCase();
    return s === "active" || s === "valid" ? "✅" : "❌";
  };

  let md = "## TradeProof License Verification\n\n";
  md += `**${summaryText}**\n\n`;
  md += "| # | State | License | Status | Holder |\n";
  md += "|---|-------|---------|--------|--------|\n";

  resultArray.forEach((r, i) => {
    const state = r.state || licenses[i]?.state || "—";
    const num = r.license_number || licenses[i]?.license_number || "—";
    const status = r.status || "unknown";
    const holder = r.holder_name || r.business_name || "—";
    md += `| ${i + 1} | ${state} | \`${num}\` | ${statusIcon(r)} ${status} | ${holder} |\n`;
  });

  if (!allValid) {
    md += "\n> **⚠️ One or more licenses could not be verified.**\n";
  }

  writeSummary(md);

  // ---- Fail if requested --------------------------------------------------
  if (failOnInvalid && !allValid) {
    fail(
      `${invalidCount} of ${total} license(s) are not active/valid. Set fail_on_invalid to "false" to allow this.`
    );
  }
}

run().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
});
