import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { auditLogger } from "@/server/logger";

import {
  decryptField,
  encryptField,
  maskAddress,
  maskBusinessNumber,
  maskPhone,
  maskResidentRegistrationNumber,
  maskCorporationRegistrationNumber,
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
  // New fields for applicant type distinction
  applicant_type: string | null;
  name_korean: string | null;
  name_english: string | null;
  nationality: string | null;
  resident_registration_number_secret: EncryptedField | null;
  resident_registration_number_masked: string | null;
  corporation_registration_number_secret: EncryptedField | null;
  corporation_registration_number_masked: string | null;
  business_registration_number_secret: EncryptedField | null;
  business_registration_number_masked: string | null;
  mobile_phone_secret: EncryptedField | null;
  mobile_phone_masked: string | null;
  priority_number: string | null;
  delivery_postal_code: string | null;
  delivery_address_secret: EncryptedField | null;
  delivery_address_masked: string | null;
  patent_customer_number: string | null;
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
  // New fields
  applicantType?: "domestic_individual" | "domestic_corporation" | null;
  nameKorean?: string | null;
  nameEnglish?: string | null;
  nationality?: string | null;
  residentRegistrationNumber?: string | null;
  corporationRegistrationNumber?: string | null;
  businessRegistrationNumber?: string | null;
  mobilePhone?: string | null;
  priorityNumber?: string | null;
  deliveryPostalCode?: string | null;
  deliveryAddress?: string | null;
  patentCustomerNumber?: string | null;
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
  // New fields
  applicantType: string | null;
  nameKorean: string | null;
  nameEnglish: string | null;
  nationality: string | null;
  residentRegistrationNumber: string | null;
  residentRegistrationNumberMasked: string | null;
  corporationRegistrationNumber: string | null;
  corporationRegistrationNumberMasked: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationNumberMasked: string | null;
  mobilePhone: string | null;
  mobilePhoneMasked: string | null;
  priorityNumber: string | null;
  deliveryPostalCode: string | null;
  deliveryAddress: string | null;
  deliveryAddressMasked: string | null;
  patentCustomerNumber: string | null;
};

export function toApplicantDto(row: ApplicantRow): ApplicantDTO {
  const phone = decryptField(row.phone_secret);
  const address = decryptField(row.address_secret);
  const businessNumber = decryptField(row.business_number_secret);
  const residentRegistrationNumber = decryptField(row.resident_registration_number_secret);
  const corporationRegistrationNumber = decryptField(row.corporation_registration_number_secret);
  const businessRegistrationNumber = decryptField(row.business_registration_number_secret);
  const mobilePhone = decryptField(row.mobile_phone_secret);
  const deliveryAddress = decryptField(row.delivery_address_secret);

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
    // New fields
    applicantType: row.applicant_type,
    nameKorean: row.name_korean,
    nameEnglish: row.name_english,
    nationality: row.nationality,
    residentRegistrationNumber,
    residentRegistrationNumberMasked: row.resident_registration_number_masked ?? maskResidentRegistrationNumber(residentRegistrationNumber),
    corporationRegistrationNumber,
    corporationRegistrationNumberMasked: row.corporation_registration_number_masked ?? maskCorporationRegistrationNumber(corporationRegistrationNumber),
    businessRegistrationNumber,
    businessRegistrationNumberMasked: row.business_registration_number_masked ?? maskBusinessNumber(businessRegistrationNumber),
    mobilePhone,
    mobilePhoneMasked: row.mobile_phone_masked ?? maskPhone(mobilePhone),
    priorityNumber: row.priority_number,
    deliveryPostalCode: row.delivery_postal_code,
    deliveryAddress,
    deliveryAddressMasked: row.delivery_address_masked ?? maskAddress(deliveryAddress),
    patentCustomerNumber: row.patent_customer_number,
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
  const mobilePhone = normaliseDigits(input.mobilePhone ?? undefined);
  const residentRegistrationNumber = normaliseDigits(input.residentRegistrationNumber ?? undefined);
  const corporationRegistrationNumber = normaliseDigits(input.corporationRegistrationNumber ?? undefined);
  const businessRegistrationNumber = normaliseDigits(input.businessRegistrationNumber ?? undefined);
  const deliveryAddress = cleanString(input.deliveryAddress);

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
    // New fields
    applicant_type: input.applicantType || null,
    name_korean: cleanString(input.nameKorean) || null,
    name_english: cleanString(input.nameEnglish) || null,
    nationality: cleanString(input.nationality) || null,
    resident_registration_number_secret: encryptField(residentRegistrationNumber),
    resident_registration_number_masked: maskResidentRegistrationNumber(residentRegistrationNumber),
    corporation_registration_number_secret: encryptField(corporationRegistrationNumber),
    corporation_registration_number_masked: maskCorporationRegistrationNumber(corporationRegistrationNumber),
    business_registration_number_secret: encryptField(businessRegistrationNumber),
    business_registration_number_masked: maskBusinessNumber(businessRegistrationNumber),
    mobile_phone_secret: encryptField(mobilePhone),
    mobile_phone_masked: maskPhone(mobilePhone),
    priority_number: cleanString(input.priorityNumber) || null,
    delivery_postal_code: cleanString(input.deliveryPostalCode) || null,
    delivery_address_secret: encryptField(deliveryAddress || null),
    delivery_address_masked: maskAddress(deliveryAddress),
    patent_customer_number: cleanString(input.patentCustomerNumber) || null,
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
  // New fields
  if ("applicantType" in input) {
    updates.applicant_type = input.applicantType || null;
  }
  if ("nameKorean" in input) {
    updates.name_korean = cleanString(input.nameKorean) || null;
  }
  if ("nameEnglish" in input) {
    updates.name_english = cleanString(input.nameEnglish) || null;
  }
  if ("nationality" in input) {
    updates.nationality = cleanString(input.nationality) || null;
  }
  if ("residentRegistrationNumber" in input) {
    const residentRegistrationNumber = normaliseDigits(input.residentRegistrationNumber ?? undefined);
    updates.resident_registration_number_secret = encryptField(residentRegistrationNumber);
    updates.resident_registration_number_masked = maskResidentRegistrationNumber(residentRegistrationNumber);
  }
  if ("corporationRegistrationNumber" in input) {
    const corporationRegistrationNumber = normaliseDigits(input.corporationRegistrationNumber ?? undefined);
    updates.corporation_registration_number_secret = encryptField(corporationRegistrationNumber);
    updates.corporation_registration_number_masked = maskCorporationRegistrationNumber(corporationRegistrationNumber);
  }
  if ("businessRegistrationNumber" in input) {
    const businessRegistrationNumber = normaliseDigits(input.businessRegistrationNumber ?? undefined);
    updates.business_registration_number_secret = encryptField(businessRegistrationNumber);
    updates.business_registration_number_masked = maskBusinessNumber(businessRegistrationNumber);
  }
  if ("mobilePhone" in input) {
    const mobilePhone = normaliseDigits(input.mobilePhone ?? undefined);
    updates.mobile_phone_secret = encryptField(mobilePhone);
    updates.mobile_phone_masked = maskPhone(mobilePhone);
  }
  if ("priorityNumber" in input) {
    updates.priority_number = cleanString(input.priorityNumber) || null;
  }
  if ("deliveryPostalCode" in input) {
    updates.delivery_postal_code = cleanString(input.deliveryPostalCode) || null;
  }
  if ("deliveryAddress" in input) {
    const deliveryAddress = cleanString(input.deliveryAddress);
    updates.delivery_address_secret = encryptField(deliveryAddress || null);
    updates.delivery_address_masked = maskAddress(deliveryAddress);
  }
  if ("patentCustomerNumber" in input) {
    updates.patent_customer_number = cleanString(input.patentCustomerNumber) || null;
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
