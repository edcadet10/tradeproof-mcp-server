import type { ApiResult, ApiError, LicenseRecord, SearchResponse, BatchVerifyResult, WCVerifyResponse, CoverageResponse, StatsResponse } from "./types.js";

const RETRY_STATUSES = new Set([502, 503, 504]);
const BACKOFF_MS = [1000, 3000];
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export class TradeProofClient {
  private baseUrl: string;
  private apiKey: string;
  private version: string;

  constructor(apiKey: string, baseUrl?: string, version?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || "https://tradeproof.net").replace(/\/$/, "");
    this.version = version || "1.0.0";
  }

  private async request<T>(method: "GET" | "POST", path: string, options?: {
    params?: Record<string, string | number | undefined>;
    body?: unknown;
  }): Promise<ApiResult<T>> {
    let url = `${this.baseUrl}${path}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "User-Agent": `tradeproof-mcp-server/${this.version}`,
      "Accept": "application/json",
    };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, BACKOFF_MS[attempt - 1]!));
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json() as T;
          return { ok: true, data };
        }

        const error = this.mapHttpError(response.status, await response.json().catch(() => null));

        if (!RETRY_STATUSES.has(response.status)) {
          return { ok: false, error };
        }

        lastError = error;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          lastError = { status: 0, code: "timeout", message: "Request to TradeProof API timed out." };
        } else {
          lastError = { status: 0, code: "network_error", message: "Could not connect to TradeProof API. Check your network connection." };
        }
      }
    }

    return { ok: false, error: lastError! };
  }

  private mapHttpError(status: number, body: any): ApiError {
    const detail = body?.detail || body?.message || "Unknown error";

    switch (status) {
      case 401:
        return { status, code: "unauthorized", message: "Invalid TradeProof API key. Check your TRADEPROOF_API_KEY environment variable." };
      case 403:
        if (typeof detail === "string" && detail.includes("scope")) {
          return { status, code: "forbidden", message: `Your API key lacks the required scope. ${detail}. Update scopes at https://tradeproof.net/app#/api-keys` };
        }
        return { status, code: "rate_limited", message: "Monthly lookup limit reached. Upgrade your plan at https://tradeproof.net/app#/billing" };
      case 404:
        return { status, code: "not_found", message: detail };
      case 429:
        return { status, code: "rate_limited", message: "Rate limit exceeded. Please wait a moment before trying again." };
      default:
        if (status >= 500) {
          return { status, code: "server_error", message: "TradeProof API is temporarily unavailable. Try again in a moment." };
        }
        return { status, code: "server_error", message: detail };
    }
  }

  async lookupLicense(state: string, licenseNumber: string): Promise<ApiResult<LicenseRecord>> {
    return this.request<LicenseRecord>(
      "GET",
      `/v1/licenses/${encodeURIComponent(state.toUpperCase())}/${encodeURIComponent(licenseNumber)}`
    );
  }

  async searchContractors(params: {
    business_name: string;
    state?: string;
    city?: string;
    classification?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResult<SearchResponse>> {
    return this.request<SearchResponse>("GET", "/v1/licenses", {
      params: {
        business_name: params.business_name,
        state: params.state?.toUpperCase(),
        city: params.city,
        classification: params.classification,
        status: params.status,
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
      },
    });
  }

  async checkBatch(licenses: Array<{ state: string; license_number: string }>): Promise<ApiResult<BatchVerifyResult[]>> {
    return this.request<BatchVerifyResult[]>("POST", "/v1/verify/batch", {
      body: {
        licenses: licenses.map(l => ({
          state: l.state.toUpperCase(),
          license_number: l.license_number,
        })),
      },
    });
  }

  async checkInsurance(state: string, employer: string): Promise<ApiResult<WCVerifyResponse>> {
    return this.request<WCVerifyResponse>(
      "GET",
      `/v1/insurance/verify/wc/${encodeURIComponent(state.toUpperCase())}/${encodeURIComponent(employer)}`
    );
  }

  async getCoverage(): Promise<ApiResult<CoverageResponse>> {
    return this.request<CoverageResponse>("GET", "/v1/coverage");
  }

  async getStats(): Promise<ApiResult<StatsResponse>> {
    return this.request<StatsResponse>("GET", "/v1/stats");
  }
}
