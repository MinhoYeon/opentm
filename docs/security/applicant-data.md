# Applicant Data Security Policy

This document describes how applicant master data is persisted, encrypted, and audited within the OpenTM platform.

## Data Model Overview

| Table | Purpose |
| ----- | ------- |
| `public.applicants` | Stores reusable applicant profiles owned by a Supabase auth user. |
| `public.trademark_request_applicants` | Associates an applicant profile with an onboarding request. |
| `public.trademark_applicants` | Associates applicant profiles with formal trademark applications. |

Applicant rows contain a mix of plain attributes (name, email, flags) and protected attributes (phone, address, business identifiers). Sensitive attributes are never persisted in clear text. Instead, the application layer encrypts them before insert/update and only decrypts them on trusted servers.

## Encryption Strategy

We use symmetric AES-256-GCM encryption provided by Node.js' `crypto` module. Each encrypted column is stored as a JSONB structure containing:

```json
{
  "ciphertext": "<base64>",
  "iv": "<base64>",
  "tag": "<base64>"
}
```

The encryption key is loaded from the `APPLICANT_ENCRYPTION_KEY` environment variable. The key must be exactly 32 bytes (256 bits). The expected encodings are:

- Base64 (preferred)
- Hexadecimal (64 hex characters)
- Raw UTF-8 string of length 32 (only for local development)

Key rotation procedure:

1. Provision a new 32-byte key and store it in the secure secret manager (e.g., Supabase project secrets, Doppler).
2. Deploy the application with both the new `APPLICANT_ENCRYPTION_KEY` and a temporary `APPLICANT_ENCRYPTION_KEY_PREVIOUS`.
3. Run the provided re-encryption script (`scripts/rotate-applicant-key.ts`, to be authored when rotation is scheduled) that reads every applicant, decrypts with the previous key, and re-encrypts with the new key.
4. Remove the temporary key after verifying backups and monitoring logs.

## Masking Rules

To reduce accidental exposure, we persist masked variants alongside the encrypted payload. The masking functions live in `src/server/db/encryption.ts` and obey the following rules:

- **Phone numbers**: retain the leading 3 and trailing 4 digits, masking the remainder with `*`. Separators are normalised to `-`.
- **Business registration numbers**: retain the final 4 digits, masking the rest.
- **Addresses**: retain the leading 12 characters (up to the first whitespace boundary) and append `…`.

These masked values are safe to render in client components without decryption.

## Access Control & Auditing

Row Level Security (RLS) policies ensure that users can only access applicants they own. Service-role operations (administration, data export) use Supabase's service key and are logged.

Every API handler that reads decrypted data records an audit trail via the structured server logs (`app.logger`). Log entries contain:

- Authenticated user ID
- Operation (`list`, `create`, `update`, `delete`, `select-for-request`, `select-for-application`)
- Target applicant ID(s)
- Timestamp (ISO)
- Result (`success`, `denied`, `error`)

Audit logs are retained for 3 years. Log sinks must prevent tampering (Cloud Logging with CMEK).

## Backup & Disaster Recovery

- The `public.applicants` and join tables are part of the standard Supabase PITR backup window.
- A weekly logical export to object storage is scheduled and encrypted with a storage-specific key.
- Restoration tests are performed quarterly: restore into a staging project, run the smoke suite, and confirm applicant data integrity.

## Incident Response

If suspicious access is detected:

1. Disable affected Supabase service keys.
2. Rotate the `APPLICANT_ENCRYPTION_KEY` following the procedure above.
3. Review audit logs to identify the scope of the breach.
4. Notify impacted users according to regulatory requirements.
5. Document the incident and remediation in the security runbook.
