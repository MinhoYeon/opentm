# Edge function deployment playbook

The CI pipeline now promotes the `status-notifier` edge function alongside the Next.js app. The deployment stages are:

1. **Build** – `supabase functions build status-notifier` validates the bundle using the staging secrets. Fails the pipeline if TypeScript or dependency resolution breaks.
2. **Package & publish** – `supabase functions deploy status-notifier --no-verify-jwt` publishes the function to the target project (staging/production). The job runs after database migrations succeed.
3. **Post-deploy verification** – run the staging integration tests (see below) to confirm notification hooks fire and that email/SMS vendors accept the payload.

## Rollback procedure

If the deployment introduces regressions:

1. Revert the offending commit in Git (or checkout the previous release tag).
2. Re-run migrations only if schema changes require reversal. For enum updates, no rollback is required; simply keep the additional values.
3. Deploy the previous edge function artefact via `supabase functions deploy status-notifier --project-ref <project-id> --import-map supabase/functions/import_map.json` (if an import map is in use). This overwrites the live function.
4. Re-run `npm run test:status-transitions` against staging with the reverted code to ensure status hooks still emit notifications.
5. Announce rollback completion in the release channel and open a follow-up issue describing the root cause.

## Staging integration tests

Execute the integration test suite from the repository root once the staging environment is hydrated with new migrations and secrets:

```bash
SUPABASE_URL="https://<staging-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
npm run test:status-transitions
```

The script exercises a full status progression (`draft → awaiting_documents → awaiting_client_signature → filed → awaiting_registration_fee → completed`). It asserts that:

- `trademark_applications.status` updates succeed for each hop.
- A corresponding row appears in `trademark_status_logs` for every transition.
- The trigger emits rows into `trademark_status_logs` without raising errors (the test checks for warnings in the response payload).

Tests must pass in staging before promoting to production.
