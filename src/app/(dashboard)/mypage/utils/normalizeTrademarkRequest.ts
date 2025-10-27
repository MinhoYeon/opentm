import type { StatusTransition, TrademarkRequest } from "../types";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item : String(item)))
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to comma separated parsing
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toStatusTransitions(value: unknown): StatusTransition[] {
  if (!value) {
    return [];
  }

  const parseObject = (entry: Record<string, unknown>): StatusTransition => ({
    status: String(entry.status ?? "알 수 없음"),
    label: typeof entry.label === "string" ? entry.label : null,
    description: typeof entry.description === "string" ? entry.description : null,
    changedAt:
      typeof entry.changed_at === "string"
        ? entry.changed_at
        : typeof entry.changedAt === "string"
          ? entry.changedAt
          : null,
  });

  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => parseObject(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => parseObject(item));
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeTrademarkRequest(record: Record<string, unknown>): TrademarkRequest {
  const extras = record as Record<string, unknown>;
  const statusDescription =
    typeof record.status_description === "string"
      ? record.status_description
      : typeof record.statusDescription === "string"
        ? (record.statusDescription as string)
        : null;

  return {
    id: String(record.id ?? ""),
    brandName:
      typeof record.brand_name === "string"
        ? record.brand_name
        : typeof record.brandName === "string"
          ? (record.brandName as string)
          : "이름 미지정",
    status: typeof record.status === "string" ? record.status : "알 수 없음",
    statusLabel:
      typeof record.status_label === "string"
        ? record.status_label
        : typeof record.statusLabel === "string"
          ? (record.statusLabel as string)
          : null,
    statusDescription,
    statusBadgeClass:
      typeof record.status_badge_class === "string"
        ? record.status_badge_class
        : typeof record.statusBadgeClass === "string"
          ? (record.statusBadgeClass as string)
          : null,
    statusDotClass:
      typeof record.status_dot_class === "string"
        ? record.status_dot_class
        : typeof record.statusDotClass === "string"
          ? (record.statusDotClass as string)
          : null,
    submittedAt:
      typeof record.submitted_at === "string"
        ? record.submitted_at
        : typeof record.submittedAt === "string"
          ? (record.submittedAt as string)
          : typeof record.created_at === "string"
            ? (record.created_at as string)
            : null,
    lastUpdated:
      typeof record.updated_at === "string"
        ? record.updated_at
        : typeof record.last_updated === "string"
          ? (record.last_updated as string)
          : typeof record.lastUpdated === "string"
            ? (record.lastUpdated as string)
            : null,
    classes: toStringArray(extras.product_classes ?? extras.classes),
    representative:
      typeof record.representative_name === "string"
        ? record.representative_name
        : typeof record.representative === "string"
          ? (record.representative as string)
          : null,
    referenceCode:
      typeof record.reference_code === "string"
        ? record.reference_code
        : typeof record.referenceCode === "string"
          ? (record.referenceCode as string)
          : null,
    transitions: toStatusTransitions(extras.status_transitions ?? extras.statusTransitions),
    applicantName:
      typeof record.applicant_name === "string"
        ? record.applicant_name
        : typeof record.applicantName === "string"
          ? (record.applicantName as string)
          : null,
  };
}

export { toStatusTransitions, toStringArray };
