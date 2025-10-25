import type {
  AdminDocument,
  AdminTimelineEntry,
  AdminTrademarkApplication,
  PaymentState,
} from "../types";
import type { TrademarkStatus } from "@/lib/trademarks/status";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coerceDate(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

function generateFallbackId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolvePaymentState(
  row: Record<string, unknown>,
  metadata: Record<string, unknown>
): PaymentState {
  const metadataState = coerceString(metadata["payment_state"]);
  if (metadataState && ["unpaid", "paid", "partial", "refund_requested", "overdue"].includes(metadataState)) {
    return metadataState as PaymentState;
  }

  if (row["payment_received_at"]) {
    return "paid";
  }

  const amount = coerceNumber(row["payment_amount"]);
  const dueAt = coerceDate(row["payment_due_at"]);
  if (amount && !row["payment_received_at"]) {
    if (dueAt) {
      const dueDate = new Date(dueAt);
      if (Number.isFinite(dueDate.getTime()) && dueDate.getTime() < Date.now()) {
        return "overdue";
      }
    }
    return "unpaid";
  }

  return "unknown";
}

function normalizeDocuments(value: unknown): AdminDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!isPlainObject(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = coerceString(record["id"]) ?? `doc-${index}`;
      const name = coerceString(record["name"]) ?? `문서 ${index + 1}`;
      return {
        id,
        name,
        url: coerceString(record["url"]),
        uploadedAt: coerceDate(record["uploadedAt"] ?? record["uploaded_at"]),
        uploadedBy: coerceString(record["uploadedBy"] ?? record["uploaded_by"]),
        type: coerceString(record["type"]),
        size: coerceNumber(record["size"]),
        version: coerceNumber(record["version"]),
        metadata: isPlainObject(record["metadata"])
          ? (record["metadata"] as Record<string, unknown>)
          : null,
      } satisfies AdminDocument;
    })
    .filter((item): item is AdminDocument => Boolean(item));
}

function normalizeTimeline(value: unknown): AdminTimelineEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!isPlainObject(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = coerceString(record["id"]) ?? `timeline-${index}`;
      const type = coerceString(record["type"]) ?? "custom";
      const label = coerceString(record["label"]) ?? "이벤트";
      return {
        id,
        type,
        label,
        occurredAt: coerceDate(record["occurredAt"] ?? record["occurred_at"]),
        description: coerceString(record["description"]),
        actorName: coerceString(record["actorName"] ?? record["actor_name"]),
        metadata: isPlainObject(record["metadata"])
          ? (record["metadata"] as Record<string, unknown>)
          : null,
      } satisfies AdminTimelineEntry;
    })
    .filter((item): item is AdminTimelineEntry => Boolean(item));
}

export type RawTrademarkApplication = Record<string, unknown>;

export function normalizeTrademarkApplication(row: RawTrademarkApplication): AdminTrademarkApplication {
  const metadata = isPlainObject(row["metadata"])
    ? { ...(row["metadata"] as Record<string, unknown>) }
    : ({} as Record<string, unknown>);

  const tagsRaw = metadata["tags"];
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => Boolean(tag))
    : [];

  const applicant = isPlainObject(metadata["applicant"])
    ? (metadata["applicant"] as Record<string, unknown>)
    : {};

  const assignedMetadata = isPlainObject(metadata["assigned_to"])
    ? (metadata["assigned_to"] as Record<string, unknown>)
    : {};

  const paymentMetadata = isPlainObject(metadata["payment"])
    ? (metadata["payment"] as Record<string, unknown>)
    : {};

  const deadlinesMetadata = isPlainObject(metadata["deadlines"])
    ? (metadata["deadlines"] as Record<string, unknown>)
    : {};

  const productClassesRaw = row["product_classes"];
  const productClasses = Array.isArray(productClassesRaw)
    ? productClassesRaw
        .map((item) => (typeof item === "string" ? item : coerceString(item) ?? ""))
        .filter((item): item is string => Boolean(item))
    : [];

  const paymentState = resolvePaymentState(row, metadata);

  const application: AdminTrademarkApplication = {
    id: coerceString(row["id"]) ?? generateFallbackId("application"),
    managementNumber: coerceString(row["management_number"]),
    brandName: coerceString(row["brand_name"]) ?? "(이름 없음)",
    trademarkType: coerceString(row["trademark_type"]),
    productClasses,
    goodsDescription: coerceString(row["goods_description"] ?? metadata["goods_description"]),
    applicantName: coerceString(row["applicant_name"] ?? applicant["name"]),
    applicantEmail: coerceString(row["applicant_email"] ?? applicant["email"]),
    applicantPhone: coerceString(row["applicant_phone"] ?? applicant["phone"]),
    tags,
    status: (coerceString(row["status"]) ?? "draft") as TrademarkStatus,
    statusDetail: coerceString(row["status_detail"] ?? metadata["status_detail"]),
    statusUpdatedAt: coerceDate(row["status_updated_at"] ?? metadata["status_updated_at"]),
    createdAt: coerceDate(row["created_at"]),
    updatedAt: coerceDate(row["updated_at"]),
    filedAt: coerceDate(row["filed_at"] ?? metadata["filed_at"] ?? row["filing_submitted_at"]),
    filingReceiptNumber: coerceString(row["filing_receipt_number"] ?? metadata["filing_receipt_number"]),
    filingSubmissionReference: coerceString(
      row["filing_submission_reference"] ?? metadata["filing_submission_reference"]
    ),
    deadlines: {
      filing: coerceDate(deadlinesMetadata["filing"] ?? metadata["filing_due_at"] ?? row["filing_due_at"]),
      response: coerceDate(deadlinesMetadata["response"] ?? metadata["response_due_at"]),
      payment: coerceDate(
        row["payment_due_at"] ?? deadlinesMetadata["payment"] ?? metadata["payment_due_at"]
      ),
    },
    payment: {
      state: paymentState,
      amount: coerceNumber(row["payment_amount"] ?? paymentMetadata["amount"]),
      currency: coerceString(row["payment_currency"] ?? paymentMetadata["currency"]) ?? "KRW",
      dueAt: coerceDate(row["payment_due_at"] ?? paymentMetadata["due_at"]),
      receivedAt: coerceDate(row["payment_received_at"] ?? paymentMetadata["received_at"]),
      reference: coerceString(row["payment_reference"] ?? paymentMetadata["reference"]),
      method: coerceString(paymentMetadata["method"] ?? metadata["payment_method"]),
      remitterName: coerceString(paymentMetadata["remitter"] ?? metadata["remitter_name"]),
    },
    assignedTo:
      row["assigned_to"] || assignedMetadata["id"] || assignedMetadata["email"] || assignedMetadata["name"]
        ? {
            id: coerceString(row["assigned_to"] ?? assignedMetadata["id"]),
            name: coerceString(assignedMetadata["name"]),
            email: coerceString(assignedMetadata["email"]),
          }
        : null,
    lastTouchedAt:
      coerceDate(
        row["last_touched_at"] ?? metadata["last_touched_at"] ?? row["updated_at"] ?? row["status_updated_at"]
      ) ?? coerceDate(row["created_at"]),
    unreadNoteCount: coerceNumber(metadata["unread_note_count"]) ?? undefined,
    pendingActionCount: coerceNumber(metadata["pending_action_count"]) ?? undefined,
    metadata,
    documents: normalizeDocuments(metadata["documents"]),
    timeline: normalizeTimeline(metadata["timeline"]),
  };

  return application;
}

