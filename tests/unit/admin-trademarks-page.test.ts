import { describe, expect, it } from "@jest/globals";
import { parseSavedFilter, resolveStatusOptions } from "@/app/admin/trademarks/page";
import { TRADEMARK_STATUSES } from "@/lib/trademarks/status";

describe("parseSavedFilter", () => {
  it("normalizes string arrays and scalar fields", () => {
    const result = parseSavedFilter({
      statuses: ["draft", "filed", 123],
      paymentStates: ["paid", null],
      tags: ["priority", 456],
      search: "Acme",
      assignedTo: "admin-1",
      dateRange: {
        field: "updated_at",
        from: "2024-01-01",
        to: "2024-01-31",
      },
    });

    expect(result).toEqual({
      statuses: ["draft", "filed"],
      paymentStates: ["paid"],
      tags: ["priority"],
      search: "Acme",
      assignedTo: "admin-1",
      dateRange: {
        field: "updated_at",
        from: "2024-01-01",
        to: "2024-01-31",
      },
    });
  });

  it("coerces invalid shapes to safe defaults", () => {
    const result = parseSavedFilter({
      statuses: "draft",
      paymentStates: [123],
      tags: [null],
      dateRange: {
        field: 123,
        from: 456,
        to: null,
      },
    });

    expect(result).toEqual({
      statuses: [],
      paymentStates: [],
      tags: [],
      search: undefined,
      assignedTo: undefined,
      dateRange: {
        field: "created_at",
        from: undefined,
        to: undefined,
      },
    });
  });

  it("returns null for non-object metadata", () => {
    expect(parseSavedFilter(null)).toBeNull();
    expect(parseSavedFilter(undefined)).toBeNull();
    expect(parseSavedFilter("invalid" as unknown)).toBeNull();
  });
});

describe("resolveStatusOptions", () => {
  it("includes every known trademark status in order", () => {
    const options = resolveStatusOptions();

    expect(options).toHaveLength(TRADEMARK_STATUSES.length);
    expect(options.map((option) => option.value)).toEqual(TRADEMARK_STATUSES);
  });

  it("uses localized labels when available", () => {
    const options = resolveStatusOptions();
    const awaitingPayment = options.find((option) => option.value === "awaiting_payment");

    expect(awaitingPayment).toBeDefined();
    expect(awaitingPayment?.label).toBe("입금 대기");
  });

  it("falls back to the status key when no localized label is provided", () => {
    const options = resolveStatusOptions(["draft", "unexpected_status"]);

    expect(options).toEqual([
      { value: "draft", label: "임시" },
      { value: "unexpected_status", label: "unexpected_status" },
    ]);
  });
});
