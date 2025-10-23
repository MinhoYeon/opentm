# Trademark application workflow

## Database schema

The `20250301_create_trademark_applications.sql` migration adds two new tables:

- `public.trademark_applications` stores the authoritative application record. Each row is connected to the submitting `auth.users` record and (optionally) the originating `trademark_requests` row. A sequential `management_number` is issued from the `trademark_management_number_seq` sequence and rendered as `TM000001`, `TM000002`, …
- `public.trademark_status_logs` captures every status change together with metadata, notes, and the staff member who performed the change.

Key columns:

| Column | Description |
| --- | --- |
| `status` | Enum `trademark_application_status` (`draft`, `awaiting_payment`, `payment_received`, `preparing_filing`, `filed`, `office_action`, `rejected`, `completed`, `cancelled`). |
| `payment_*` | Records the payment quotation, reference, due date, and confirmation timestamp. |
| `filing_*` | Stores the official receipt metadata once the application is filed with the authority. |
| `normalized_brand_name` | Generated column that lowercases and normalises whitespace to power duplicate detection queries. |

Triggers update `updated_at` automatically, and RLS gates are in place for applicants and administrators.

### Storage security

The migration also creates private storage policies for the `trademark-images` bucket. Applicants can upload/read/delete only their own files, while administrators gain full access via the `is_admin_context()` helper (which also whitelists the Supabase service-role token).

## API surface

| Method & route | Description |
| --- | --- |
| `POST /api/trademarks` | Authenticated applicants create a formal application. The handler validates the brand name, classes, optional payment block, resolves the initial status, and writes both the application row and the initial status log. |
| `GET /api/trademarks` | Lists applications. Applicants only see their own records; administrators can paginate, filter by status, management number, or user id. |
| `PATCH /api/trademarks/:id/status` | Administrator-only endpoint that enforces status transition rules, updates payment/filing timestamps, and records the transition log entry. |
| `GET /api/trademarks/check-duplicate` | Authenticated applicants can check for existing requests/applications that share the same normalised brand name (and optional overlapping classes). |

All routes rely on the Supabase service client **after** validating the caller’s session so that role logic remains server-side.

## Status transition contract

The status helper in `src/lib/trademarks/status.ts` documents the canonical workflow. Allowed transitions:

```
draft → awaiting_payment | preparing_filing | cancelled
awaiting_payment → payment_received | preparing_filing | cancelled
payment_received → preparing_filing | cancelled
preparing_filing → filed | cancelled
filed → office_action | completed | rejected
office_action → preparing_filing | completed | rejected | cancelled
rejected → preparing_filing | cancelled
completed → (terminal)
cancelled → (terminal)
```

### Automatic timestamps and field updates

- Entering `payment_received` stamps `payment_received_at` (unless an explicit ISO timestamp is supplied).
- Entering `filed` stamps both `filing_submitted_at` and `filed_at` (again overridable with a supplied timestamp) and accepts optional receipt/submission references.
- Any transition can update `status_detail`, `payment_reference`, or filing reference fields. Every change is logged via `trademark_status_logs`.

## Filing date and management number policies

- **Management numbers** are generated atomically inside the database via `trademark_management_number_seq`, ensuring no collisions even when multiple API servers run concurrently.
- **Filing dates** (`filed_at`/`filing_submitted_at`) default to the transition timestamp but may be overwritten when backfilling historical filings.

## Image upload limits

Uploads continue to use the `trademark-images` bucket with the following constraints:

- **File types:** restrict client uploads to vector (SVG) and common raster formats (PNG, JPG, WebP). Reject executables or archives before hitting storage.
- **Size ceiling:** storage bucket enforces a 5 MB limit (`file_size_limit`). The API layer should reject anything exceeding ~4.5 MB to leave headroom for encoding overhead.
- **Resizing strategy:** images are resized on the client (or edge worker) to a maximum canvas of 1024×1024 px, preserving aspect ratio and stripping metadata. This keeps filings under the PTO requirements while avoiding needless bandwidth.

Document these constraints anywhere the uploader is implemented so users understand the restrictions.

## Role separation

- Applicants authenticate with the Supabase anon key and are constrained by RLS (`auth.uid() = user_id` for applications; log access limited via subquery).
- Administrators authenticate through the dashboard/service role. The custom `is_admin_context()` helper inspects JWT claims (`role`, `app_metadata.role`, `app_metadata.roles`, or `is_admin` flag) so that privileged API calls — or direct SQL connections — inherit elevated rights.
- `storage.objects` policies mirror this split, preventing cross-user data leaks while enabling centralised moderation via the service role.

Keep the admin flag (`app_metadata.role = "admin"` or `app_metadata.roles` containing `admin`) in sync with your Supabase auth management tooling.
