# Status notifier secrets

The `status-notifier` edge function uses third-party providers for transactional email (Resend) and SMS (Twilio). Provision and manage the following secrets in each Supabase project environment:

| Secret | Description |
| --- | --- |
| `RESEND_API_KEY` | API key from [Resend](https://resend.com/) with permission to send transactional messages. |
| `RESEND_FROM_EMAIL` | Verified sender email address (e.g. `notifications@opentm.kr`). Defaults to the address above if omitted. |
| `TWILIO_ACCOUNT_SID` | Twilio account SID with SMS capability. |
| `TWILIO_AUTH_TOKEN` | Twilio auth token paired with the SID. |
| `TWILIO_MESSAGING_SERVICE_SID` | (Preferred) Messaging Service SID configured with the dedicated phone number. |
| `TWILIO_FROM_NUMBER` | Optional fallback E.164 number when a messaging service SID is not used. |
| `STATUS_PORTAL_URL` | Absolute URL used in notification templates to link customers back to the dashboard (e.g. `https://app.opentm.kr/mypage`). |
| `STATUS_NOTIFIER_OPS_EMAIL` | Operations distribution list that should receive escalated notifications (office actions, rejection, etc.). |

All secrets should be stored via `supabase secrets set` and **never** hard-coded in the repository. Configure the following baseline credentials as well:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the edge runtime
- Encryption key `app.encryption_key` on the database session (unchanged from previous setup)

## Rotation guidance

1. Rotate Resend/Twilio keys quarterly or immediately after suspected compromise.
2. Update the secret in Supabase for both `staging` and `production` projects.
3. Trigger a redeploy of the edge functions (`supabase functions deploy status-notifier`) to propagate updated keys.
4. Validate delivery by running the staging integration test suite (see `docs/deployment/edge-functions.md`).
