const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ensureSupabaseConfig() {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not set. Please define it in your environment variables.");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Please define it in your environment variables."
    );
  }

  return {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    } as const,
  };
}

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
}

export interface TrademarkRequestRecord {
  id: string;
  user_id: string | null;
  brand_name: string;
  trademark_type: string;
  image_url: string | null;
  image_storage_path: string | null;
  product_classes: string[];
  representative_email: string;
  additional_notes: string | null;
  submitted_at: string;
  status: string;
  status_detail: string | null;
  status_updated_at: string;
}

class SupabaseHttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "SupabaseHttpError";
    this.status = status;
    this.details = details;
  }
}

async function handleErrorResponse(response: Response) {
  let details: unknown = undefined;
  try {
    details = await response.json();
  } catch {
    // ignore json parse errors
  }

  const message =
    (details && typeof details === "object" && "message" in details
      ? String((details as Record<string, unknown>).message)
      : undefined) ||
    response.statusText ||
    "Supabase request failed";

  throw new SupabaseHttpError(message, response.status, details);
}

export async function uploadTrademarkImage(
  bucket: string,
  path: string,
  body: Buffer,
  contentType: string
): Promise<StorageUploadResult> {
  const { url, headers } = ensureSupabaseConfig();
  const endpoint = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}`;

  return {
    path,
    publicUrl,
  };
}

export interface InsertTrademarkRequestInput {
  id: string;
  user_id: string | null;
  brand_name: string;
  trademark_type: string;
  image_url: string | null;
  image_storage_path: string | null;
  product_classes: string[];
  representative_email: string;
  additional_notes: string | null;
  submitted_at: string;
  status: string;
  status_detail: string | null;
  status_updated_at: string;
}

export async function insertTrademarkRequest(
  payload: InsertTrademarkRequestInput
): Promise<TrademarkRequestRecord> {
  const { url, headers } = ensureSupabaseConfig();
  const endpoint = `${url}/rest/v1/trademark_requests`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const data = (await response.json()) as TrademarkRequestRecord | TrademarkRequestRecord[];
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new SupabaseHttpError("No data returned from insert", response.status);
    }
    return data[0];
  }
  return data;
}

export async function invokeNotificationFunction(
  functionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { url, headers } = ensureSupabaseConfig();
  const endpoint = `${url}/functions/v1/${functionName}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }
}
