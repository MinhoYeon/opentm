# Applicants API Server Module

## Directory Layout

```
src/server/api/applicants/
├── index.ts              # Route registration and dependency wiring
├── list.handler.ts       # GET /api/applicants controller
├── create.handler.ts     # POST /api/applicants controller
├── update.handler.ts     # PATCH /api/applicants/:applicantId controller
├── delete.handler.ts     # DELETE /api/applicants/:applicantId controller
├── favorite.handler.ts   # POST /api/applicants/:applicantId/favorite controller
├── validators.ts         # Zod schemas for query/body validation
├── access.ts             # Permission checks and workspace scoping helpers
├── service.ts            # Business logic orchestration across repositories
├── repository.ts         # Data access layer (Supabase RPC / SQL queries)
├── audit.ts              # Audit log publisher utilities
└── recent-usage.ts       # Shared helper to update last-accessed timestamps
```

## Responsibilities

### `index.ts`
- Export the route definitions consumed by the server runtime.
- Compose handlers with middleware (authentication, workspace scoping, error handling).
- Register shared dependencies (database client, logger, feature flags).

### Handlers
- **`list.handler.ts`**
  - Parse pagination, sorting, and filtering parameters through `validators.ts`.
  - Enforce `applicants.read` permission via `access.ts`.
  - Call `service.ts` to fetch paginated results and push view events into `recent-usage.ts` batch queue.
  - Return serialized list response with metadata.
- **`create.handler.ts`**
  - Validate payload, default status to `draft`, and inject `workspaceId`.
  - Check ownership/role constraints using `access.ts`.
  - Delegate to `service.ts` for transactional insert and audit publishing.
  - Respond with created applicant summary.
- **`update.handler.ts`**
  - Validate partial payloads and detect no-op submissions.
  - Lock record for update via `service.ts` to avoid stale writes.
  - After successful update, trigger `recent-usage.ts` helper and emit audit event.
- **`delete.handler.ts`**
  - Confirm `applicants.admin` permission and soft-delete support when required.
  - Ensure cascading clean-up (favorites, reminders) is delegated to `service.ts`.
  - Emit destructive action audit log with diff of removed fields.
- **`favorite.handler.ts`**
  - Toggle favorites idempotently with optimistic concurrency guard.
  - Use `recent-usage.ts` to refresh `lastAccessedAt`.
  - Emit lightweight audit event tagged as `favorite.toggle`.

### Shared Utilities
- **`validators.ts`**: Houses Zod schemas for requests/responses and transforms query params into typed DTOs.
- **`access.ts`**: Centralizes workspace scoping, role resolution, ownership validation, and raises `ForbiddenError` when checks fail.
- **`service.ts`**: Coordinates multi-step operations, wraps Supabase RPC calls, ensures audit logging and recent usage updates occur within transactions.
- **`repository.ts`**: Encapsulates raw database access (SQL, Supabase client) and exposes composable methods consumed by `service.ts`.
- **`audit.ts`**: Formats and dispatches audit log entries to the logging pipeline with correlation IDs.
- **`recent-usage.ts`**: Provides `touch(applicantId, context)` for synchronous updates and `enqueueBulk(viewContext)` for async batch updates.

## Cross-Cutting Concerns

- **Error Handling**: Throw typed errors that bubble into shared middleware; include correlation IDs for traceability.
- **Transactions**: `service.ts` should expose helpers to run operations within a database transaction when multiple repositories are involved.
- **Caching**: Future caching hooks should wrap `repository.ts` outputs and invalidate on mutations.
- **Testing**: Each handler exports pure functions to enable unit testing; integration tests target `service.ts` with mocked repositories.
