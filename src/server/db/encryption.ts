import crypto from "node:crypto";

type EncryptedField = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const KEY_LENGTH = 32;

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("APPLICANT_ENCRYPTION_KEY is empty.");
  }

  const tryBase64 = () => {
    try {
      const decoded = Buffer.from(trimmed, "base64");
      return decoded.length === KEY_LENGTH ? decoded : null;
    } catch {
      return null;
    }
  };

  const tryHex = () => {
    if (!/^([0-9a-fA-F]{2})+$/.test(trimmed)) {
      return null;
    }
    const decoded = Buffer.from(trimmed, "hex");
    return decoded.length === KEY_LENGTH ? decoded : null;
  };

  const base64 = tryBase64();
  if (base64) return base64;

  const hex = tryHex();
  if (hex) return hex;

  if (trimmed.length === KEY_LENGTH) {
    return Buffer.from(trimmed, "utf8");
  }

  throw new Error("APPLICANT_ENCRYPTION_KEY must be 32 bytes (base64, hex, or raw string).");
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const secret = process.env.APPLICANT_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("APPLICANT_ENCRYPTION_KEY is not defined.");
  }
  cachedKey = decodeKey(secret);
  return cachedKey;
}

export function encryptField(value: string | null | undefined): EncryptedField | null {
  if (!value) {
    return null;
  }
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptField(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Partial<EncryptedField>;
  if (!record.ciphertext || !record.iv || !record.tag) {
    return null;
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(record.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function normaliseDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^0-9]/g, "");
}

export function maskPhone(phone: string | null | undefined): string | null {
  const digits = normaliseDigits(phone);
  if (!digits) return null;
  if (digits.length <= 4) {
    return digits;
  }
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  const middle = "*".repeat(Math.max(digits.length - 7, 1));
  return `${head}-${middle}-${tail}`;
}

export function maskBusinessNumber(value: string | null | undefined): string | null {
  const digits = normaliseDigits(value);
  if (!digits) return null;
  if (digits.length <= 4) {
    return "*".repeat(digits.length);
  }
  const masked = "*".repeat(digits.length - 4) + digits.slice(-4);
  return masked;
}

export function maskAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 12) {
    return trimmed;
  }
  const rest = trimmed.slice(12);
  const spaceIndex = rest.search(/\s/);
  const breakpoint = spaceIndex >= 0 ? 12 + spaceIndex : 12;
  const slice = trimmed.slice(0, breakpoint).trim();
  return `${slice} …`;
}

export type { EncryptedField };
