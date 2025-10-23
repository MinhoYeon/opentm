import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcArgs = Record<string, unknown>;

type RpcResponse<Data> = {
  data: Data | null;
  error: { message: string } | null;
};

export type MaskingOptions = {
  prefix?: number;
  suffix?: number;
};

export type ApplicantCiphertext = string;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function deriveLegalNameHash(name: string) {
  return sha256Hex(normalizeWhitespace(name).toLowerCase());
}

export function deriveEmailHash(email: string) {
  return sha256Hex(email.trim().toLowerCase());
}

export function derivePhoneHash(phone: string) {
  return sha256Hex(phone.replace(/[^0-9+]/g, ""));
}

async function executeRpc<Data>(
  client: SupabaseClient,
  fn: string,
  args: RpcArgs,
): Promise<Data> {
  const payload = Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined),
  );

  const { data, error } = (await client.rpc(fn, payload)) as RpcResponse<Data>;

  if (error) {
    throw new Error(`Failed to execute ${fn}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Function ${fn} returned null. Check encryption key configuration.`);
  }

  return data;
}

export class ApplicantFieldCrypto {
  constructor(private readonly client: SupabaseClient) {}

  async encrypt(plaintext: string | null | undefined): Promise<ApplicantCiphertext | null> {
    if (plaintext == null) {
      return null;
    }

    const value = plaintext.trim();
    if (value === "") {
      return null;
    }

    return executeRpc<ApplicantCiphertext>(this.client, "encrypt_applicant_field", {
      plaintext: value,
    });
  }

  async decrypt(ciphertext: ApplicantCiphertext | null | undefined): Promise<string | null> {
    if (!ciphertext) {
      return null;
    }

    return executeRpc<string>(this.client, "decrypt_applicant_field", {
      ciphertext,
    });
  }

  async mask(
    ciphertext: ApplicantCiphertext | null | undefined,
    options: MaskingOptions = {},
  ): Promise<string | null> {
    if (!ciphertext) {
      return null;
    }

    const { prefix, suffix } = options;

    return executeRpc<string>(this.client, "mask_applicant_field", {
      ciphertext,
      visible_prefix: typeof prefix === "number" ? prefix : undefined,
      visible_suffix: typeof suffix === "number" ? suffix : undefined,
    });
  }
}

export function createApplicantFieldCrypto(client: SupabaseClient) {
  return new ApplicantFieldCrypto(client);
}
