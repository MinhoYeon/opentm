"use server";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  readonly event?: string;
  readonly metadata?: Record<string, unknown>;
  readonly error?: unknown;
}

interface LogEntry extends LogContext {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object") {
    return Object.fromEntries(Object.entries(error as Record<string, unknown>));
  }

  return { value: error };
}

function emitLog(level: LogLevel, message: string, context?: LogContext) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    event: context?.event,
    metadata: context?.metadata,
    error: context?.error,
  };

  const errorPayload = serializeError(entry.error);
  const payload = {
    level: entry.level,
    timestamp: entry.timestamp,
    message: entry.message,
    ...(entry.event ? { event: entry.event } : {}),
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
    ...(errorPayload ? { error: errorPayload } : {}),
  };

  switch (level) {
    case "error":
      console.error(payload);
      break;
    case "warn":
      console.warn(payload);
      break;
    case "debug":
      console.debug(payload);
      break;
    default:
      console.info(payload);
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    emitLog("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    emitLog("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emitLog("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    emitLog("error", message, context);
  },
};

export type Logger = typeof logger;
