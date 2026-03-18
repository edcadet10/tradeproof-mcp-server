export interface LicenseRecord {
  license_number: string;
  state: string;
  business_name: string | null;
  dba_name: string | null;
  status: string | null;
  license_type: string | null;
  classifications: string[] | null;
  issue_date: string | null;
  expiration_date: string | null;
  city: string | null;
  state_code: string | null;
  zip_code: string | null;
  phone: string | null;
  entity_type: string | null;
  bond_amount: number | null;
  workers_comp: boolean | null;
  has_disciplinary_action: boolean | null;
  last_updated: string | null;
}

export interface SearchResponse {
  items: LicenseRecord[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  search_normalized?: boolean;
  normalized_query?: string;
  other_states?: Array<{ state: string; count: number }>;
  other_states_total?: number;
  other_states_results?: LicenseRecord[];
}

export interface BatchVerifyResult {
  license_number: string;
  state: string;
  valid: boolean;
  status: string | null;
  business_name: string | null;
  expiration_date: string | null;
  license_type: string | null;
  city: string | null;
  workers_comp: boolean | null;
  bond_amount: number | null;
  last_updated: string | null;
}

export interface WCVerifyResponse {
  found: boolean;
  employer: string;
  state: string;
  account_number?: string | null;
  coverage_start?: string | null;
  coverage_end?: string | null;
  status?: string | null;
  verified_at?: string | null;
}

export interface CoverageResponse {
  license_states: string[];
  wc_states: string[];
  total_license_states: number;
  total_wc_states: number;
}

export interface StatsResponse {
  total_licenses: number;
  states_covered: string[];
  last_data_update: string | null;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ApiError {
  status: number;
  code: "not_found" | "unauthorized" | "rate_limited" | "forbidden" | "server_error" | "network_error" | "timeout";
  message: string;
}
