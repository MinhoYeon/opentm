"use server";

const cache = new Map<string, string>();

function readEnv(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) {
    return cached;
  }

  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  cache.set(name, value);
  return value;
}

export const env = {
  toss: {
    get secretKey(): string {
      return readEnv("TOSS_SECRET_KEY");
    },
    get webhookSecret(): string {
      return readEnv("TOSS_WEBHOOK_SECRET");
    },
    get clientKey(): string {
      return readEnv("TOSS_CLIENT_KEY");
    },
  },
} as const;

export type ServerEnv = typeof env;
