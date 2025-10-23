# Personal Data Access Logging & Masking

This guideline ensures compliance with the Personal Information Protection Act when engineers or operators interact with applicant data.

## Logging Requirements

Every read/write operation that exposes personal data must emit a structured log entry. The logger is configured in `src/server/logger.ts` (see implementation). Each entry includes:

- `userId`: Supabase auth ID that initiated the request.
- `operation`: `applicant:list`, `applicant:create`, `applicant:update`, `applicant:delete`, `applicant:attach-request`, `applicant:attach-application`.
- `targetIds`: Array of applicant IDs.
- `metadata`: `{ requestId?, applicationId? }`.
- `result`: `success` | `failure`.
- `timestamp` (ISO 8601).

Logs are forwarded to the central observability stack (e.g., Cloud Logging) with a 3-year retention policy and immutability guarantees.

## Masking Rules in Logs

- Replace phone numbers with `phoneMasked`.
- Replace business numbers with `businessNumberMasked`.
- Hash email addresses using SHA-256 before logging (stored as hex).
- Addresses are truncated to the first administrative level (시/도).

## Access Workflow

1. Operator requests access via the ticketing system, specifying purpose and scope.
2. Security officer approves and enables temporary IAM role (`applicant-readonly`) for a 4-hour window.
3. Operator uses the service-role console with audit logging enabled. Direct database connections must pass through the bastion host.
4. After access window ends, revoke the temporary role and attach the ticket to the audit record.

## Masking in Product UI

- Authenticated users see masked values by default. Plain values appear only inside secure modals after explicit consent (implemented via `showFullDetails` flag in the selector hook).
- Admin dashboards never render plain values; support teams must rely on masked data + contact via system-generated emails/SMS.

## Handling Export Requests

- Generate exports via a background job that writes CSV files to encrypted object storage.
- CSV columns containing sensitive data remain encrypted; a separate secure channel shares the decryption key with the requester.
- Exports require director-level approval recorded in the ticketing system.

## Incident Reporting

Any accidental exposure or unauthorised access must be reported within 24 hours. Use the incident template stored in the security runbook and escalate to the DPO.
