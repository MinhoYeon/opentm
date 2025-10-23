import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { auditLogger } from "@/server/logger";

import {
  decryptField,
  encryptField,
  maskAddress,
  maskBusinessNumber,
  maskPhone,
  type EncryptedField,
} from "./encryption";

export type ApplicantRow = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  phone_secret: EncryptedField | null;
  phone_masked: string | null;
  address_secret: EncryptedField | null;
  address_masked: string | null;
  business_type: string | null;
  business_number_secret: EncryptedField | null;
  business_number_masked: string | null;
  metadata: Record<string, unknown>;
  is_favorite: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicantPayload = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  businessType?: string | null;
  businessNumber?: string | null;
  isFavorite?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type ApplicantDTO = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  phoneMasked: string | null;
  address: string | null;
  addressMasked: string | null;
  businessType: string | null;
  businessNumber: string | null;
  businessNumberMasked: string | null;
  metadata: Record<string, unknown>;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toApplicantDto(row: ApplicantRow): ApplicantDTO {
  const phone = decryptField(row.phone_secret);
  const address = decryptField(row.address_secret);
  const businessNumber = decryptField(row.business_number_secret);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    email: row.email,
    phone,
    phoneMasked: row.phone_masked ?? maskPhone(phone),
    address,
    addressMasked: row.address_masked ?? maskAddress(address),
    businessType: row.business_type,
    businessNumber,
    businessNumberMasked: row.business_number_masked ?? maskBusinessNumber(businessNumber),
    metadata: row.metadata ?? {},
    isFavorite: row.is_favorite,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseDigits(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits || null;
}

export function buildInsertPayload(userId: string, input: ApplicantPayload) {
  const phone = normaliseDigits(input.phone ?? undefined);
  const businessNumber = normaliseDigits(input.businessNumber ?? undefined);
  const address = cleanString(input.address);

  return {
    user_id: userId,
    display_name: cleanString(input.name),
    email: normaliseEmail(input.email),
    phone_secret: encryptField(phone),
    phone_masked: maskPhone(phone),
    address_secret: encryptField(address || null),
    address_masked: maskAddress(address),
    business_type: cleanString(input.businessType) || null,
    business_number_secret: encryptField(businessNumber),
    business_number_masked: maskBusinessNumber(businessNumber),
    metadata: input.metadata ?? {},
    is_favorite: Boolean(input.isFavorite),
  };
}

export function buildUpdatePayload(input: Partial<ApplicantPayload> & { markAsUsed?: boolean }) {
  const updates: Record<string, unknown> = {};
  if (typeof input.name === "string") {
    updates.display_name = cleanString(input.name);
  }
  if (typeof input.email === "string") {
    updates.email = normaliseEmail(input.email);
  }
  if ("phone" in input) {
    const phone = normaliseDigits(input.phone ?? undefined);
    updates.phone_secret = encryptField(phone);
    updates.phone_masked = maskPhone(phone);
  }
  if ("address" in input) {
    const address = cleanString(input.address);
    updates.address_secret = encryptField(address || null);
    updates.address_masked = maskAddress(address);
  }
  if ("businessType" in input) {
    updates.business_type = cleanString(input.businessType) || null;
  }
  if ("businessNumber" in input) {
    const businessNumber = normaliseDigits(input.businessNumber ?? undefined);
    updates.business_number_secret = encryptField(businessNumber);
    updates.business_number_masked = maskBusinessNumber(businessNumber);
  }
  if ("isFavorite" in input) {
    updates.is_favorite = Boolean(input.isFavorite);
  }
  if ("metadata" in input) {
    updates.metadata = input.metadata ?? {};
  }
  if (input.markAsUsed) {
    updates.last_used_at = new Date().toISOString();
  }
  return updates;
}

export async function selectApplicant(
  supabase: SupabaseClient,
  userId: string,
  applicantId: string
): Promise<ApplicantDTO | null> {
  const { data, error } = await supabase
    .from("applicants")
    .select("*")
    .eq("id", applicantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toApplicantDto(data as ApplicantRow);
}

export async function listApplicants(
  supabase: SupabaseClient,
  userId: string,
  {
    favoritesOnly,
    limit,
    search,
    sort,
  }: {
    favoritesOnly?: boolean;
    limit?: number;
    search?: string | null;
    sort?: "recent" | "name";
  }
): Promise<ApplicantDTO[]> {
  let query = supabase
    .from("applicants")
    .select("*")
    .eq("user_id", userId);

  if (favoritesOnly) {
    query = query.eq("is_favorite", true);
  }

  if (search) {
    const cleaned = search.trim().replace(/[%*,]/g, "");
    if (cleaned) {
      const token = `%${cleaned}%`;
      query = query.or(
        `display_name.ilike.${token},email.ilike.${token}`
      );
    }
  }

  if (sort === "name") {
    query = query
      .order("display_name", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    query = query
      .order("is_favorite", { ascending: false })
      .order("last_used_at", { ascending: false, nullsLast: true })
      .order("updated_at", { ascending: false });
  }

  const { data, error } = await query.limit(Math.min(limit ?? 50, 100));

  if (error) {
    throw error;
  }

  return (data as ApplicantRow[]).map(toApplicantDto);
}

export function handlePostgrestError(error: PostgrestError): Error {
  const message = error.details || error.message || "Supabase error";
  return new Error(message);
}

export function logAuditSuccess(params: {
  userId: string;
  operation: string;
  targetIds: string[];
  metadata?: Record<string, unknown>;
}) {
  auditLogger.info({
    userId: params.userId,
    operation: params.operation,
    targetIds: params.targetIds,
    metadata: params.metadata,
  });
}

export function logAuditFailure(params: {
  userId: string;
  operation: string;
  targetIds: string[];
  metadata?: Record<string, unknown>;
  message: string;
}) {
  auditLogger.error({
    userId: params.userId,
    operation: params.operation,
    targetIds: params.targetIds,
    metadata: params.metadata,
    message: params.message,
  });
}
