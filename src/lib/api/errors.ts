import { NextResponse } from "next/server";

export type ApiErrorOptions = {
  status?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
  expose?: boolean;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 500;
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose ?? this.status < 500;
    if (options.cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- align with Error options signature
      (this as any).cause = options.cause;
    }
  }
}

export function handleApiError(error: unknown, context?: string) {
  if (error instanceof ApiError) {
    const payload: Record<string, unknown> = {
      ok: false,
      error: {
        message: error.expose ? error.message : "서버 처리 중 오류가 발생했습니다.",
      },
    };

    if (error.code) {
      (payload.error as Record<string, unknown>).code = error.code;
    }

    if (error.expose && error.details !== undefined) {
      (payload.error as Record<string, unknown>).details = error.details;
    }

    return NextResponse.json(payload, { status: error.status });
  }

  const response = NextResponse.json(
    {
      ok: false,
      error: {
        message: "서버 처리 중 오류가 발생했습니다.",
      },
    },
    { status: 500 }
  );

  console.error(context ? `[${context}]` : "[api]", error);

  return response;
}

export function assertCondition(condition: unknown, message: string, options?: ApiErrorOptions): asserts condition {
  if (!condition) {
    throw new ApiError(message, options);
  }
}
