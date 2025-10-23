export type AuditEntry = {
  userId: string;
  operation: string;
  targetIds: string[];
  metadata?: Record<string, unknown>;
  message?: string;
};

type AuditResult = "success" | "failure";

function emit(result: AuditResult, entry: AuditEntry) {
  const payload = {
    ...entry,
    result,
    timestamp: new Date().toISOString(),
  };
  console.info("[audit]", JSON.stringify(payload));
}

export const auditLogger = {
  info(entry: AuditEntry) {
    emit("success", entry);
  },
  error(entry: AuditEntry) {
    emit("failure", entry);
  },
};
