# Admin Trademark Dashboard Design

## 1. Admin Role Levels and Authentication Middleware

### Role Hierarchy
- **Super Admin**: Full system access including role management and audit log purge.
- **Operations Admin**: Manage trademark applications (status updates, document uploads), trigger notifications, view payment details.
- **Finance Admin**: Manage billing states, verify payments, issue refunds, view payment-only stats.
- **Support Admin**: Read-only access to application details, can leave internal notes but cannot change statuses or trigger notifications.

### Permission Matrix
| Capability | Super Admin | Operations Admin | Finance Admin | Support Admin |
| --- | --- | --- | --- | --- |
| View all trademark applications | ✅ | ✅ | ✅ (payment subset emphasized) | ✅ |
| Filter/search applications | ✅ | ✅ | ✅ | ✅ |
| Edit status & trigger notifications | ✅ | ✅ | 🚫 | 🚫 |
| Manage payments & refunds | ✅ | 🚫 | ✅ | 🚫 |
| Upload documents | ✅ | ✅ | 🚫 | 🚫 |
| Manage admin users & roles | ✅ | 🚫 | 🚫 | 🚫 |
| View audit logs | ✅ | ✅ | ✅ (financial subset) | Read-only |
| Purge audit logs | ✅ | 🚫 | 🚫 | 🚫 |

### Auth Middleware & Session Checks
1. **JWT Session Cookie**: Signed, HTTP-only cookie containing `user_id`, `role`, `session_id`, `exp`.
2. **Middleware Pipeline**:
   - `requireAuth`: validates cookie signature, checks expiration, resolves user from Supabase/DB.
   - `requireActiveSession`: ensures session still valid via `sessions` table (revocation, idle timeout, IP binding optional).
   - `requireRole([allowedRoles])`: compares `role` claim to required level; supports hierarchical roles via ordered list.
   - `loadAdminContext`: preloads frequently used data (role capabilities, unread notifications count) into request context for UI hydration.
3. **Session Hardening**:
   - Rotate session IDs upon privilege elevation.
   - Enforce MFA for Super/Operations admins; middleware checks `mfa_verified_at` timestamp per session.
   - Log every middleware failure into `admin_activity_logs` with reason.

## 2. `/admin/trademarks` Dashboard Information Architecture

### Layout Overview
1. **Header Bar**: Quick stats (pending, in review, awaiting payment), global search bar, "Create Manual Entry" (Super/Operations only).
2. **Filter Panel (left sidebar)**:
   - Status multi-select (Pending Intake, In Review, Awaiting Docs, Filed, Approved, Refused, Closed).
   - Payment status toggles (Unpaid, Paid, Partial, Refund Requested).
   - Date range pickers (created, last updated, filing date).
   - Attorney assignment (dropdown).
   - Applicant tags (e.g., VIP, foreign, priority deadline).
   - Saved filters (per admin) with quick apply.
3. **Result Table (main body)**:
   - Columns: Checkbox, Application ID, Applicant, Mark, Class, Status badge, Payment status badge, Deadline, Assigned attorney, Last touch.
   - Infinite scroll or pagination with sticky header.
   - Inline indicators for unread internal notes or pending actions.
4. **Right Utility Rail**:
   - Contextual quick actions (bulk status change, export CSV, assign attorney).
   - Recent activity feed snippet (from `admin_activity_logs`).

### Interaction Patterns
- **Filtering**: Debounced query updating table and stats; badge chips summarizing active filters; ability to share filter URL.
- **Row Click**: Opens a detailed modal drawer with tabs (Overview, Documents, Timeline, Payments, Notes).
- **Bulk Actions**: When rows selected, rail switches to bulk actions (status update, assign attorney, send reminder email).

### Detail Modal Tabs
1. **Overview**: Applicant info, mark preview, class list, deadlines, status history summary.
2. **Documents**: Upload area (drag-drop), list of submitted documents with versioning, preview & download.
3. **Timeline**: Timeline component fed by `trademark_status_logs`, `admin_activity_logs`, external filing events.
4. **Payments**: Payment history, links to invoices, bank transfer verification controls.
5. **Notes**: Internal notes, @mentions, pinned notes.

### Status Change Form
- Accessible via modal or bulk action.
- Fields: New status (dropdown filtered by valid transitions), effective date, optional follow-up task, internal note, notification toggle.
- Validation: Transition guard (e.g., cannot move from Approved back to Pending without Super Admin override), required note for regressions.
- On submit: writes to `trademark_status_logs`, updates application record, triggers notifications per configuration.

### Payment Verification UI
- **Filters**: Payment status, payment method (card, bank transfer, invoice), amount ranges.
- **Bank Transfer Verification**:
   - Display remitter name, amount, received date, uploaded receipt.
   - Checkbox to confirm match; require Finance/Admin note.
   - Auto-trigger "Payment Verified" status and timestamp; ability to flag discrepancies.
- **Card/Online Payments**: Show gateway transaction ID, status, ability to resend receipt.
- **Manual Entry**: Record offline payments or adjustments (Finance only).

## 3. Notification & Workflow Triggers

### Notification Channels
- Email (applicant, internal team)
- Slack (team channels, direct notifications)
- Optional SMS for critical deadlines (future scope)

### Trigger Matrix
| Event | Triggered Channels | Recipients | Notes |
| --- | --- | --- | --- |
| Status change to "Awaiting Documents" | Email + Slack | Applicant (email), Operations channel (Slack) | Includes document checklist, due date |
| Status change to "Filed" | Email | Applicant, assigned attorney | Attach filing receipt link |
| Payment verified | Email + Slack | Finance team, assigned attorney | Slack message includes transaction summary |
| Deadline approaching (3 days) | Email + Slack | Applicant, Operations channel | Scheduled cron scanning statuses |
| Document uploaded by admin | Slack | Assigned attorney, operations lead | Include uploader, document type |
| Application approved/closed | Email | Applicant | Template includes next steps |
| Failed payment / refund issued | Email + Slack | Applicant (email), Finance channel (Slack) | Include support contact |

### Workflow Notes
- Notification configuration stored per event with templates; allow override per status form submission.
- Use message queue to decouple status updates from notifications; enqueue tasks with payload referencing application ID and status log ID.
- Slack integration through webhook with structured blocks (status, applicant, next steps).
- Email templates stored in transactional email service (e.g., Postmark) with metadata fields (deadline, assigned attorney name).

### Filing Completion & Document Upload Flow
1. **Status change to "Filed"** triggers checklist requiring upload of filing receipt & confirmation letter.
2. Admin is prompted to upload documents in modal; until uploaded, application flagged "Pending Receipt".
3. Once documents uploaded, system auto-marks receipt step complete and notifies applicant.
4. For "Application Approved" state, admin uploads certificate; triggers final email to applicant and closes tasks.
5. Support Admins can view but not edit document checklist; Operations can override requirements with note.

## 4. Analytics & Audit Logging

### Statistics Panel
- Located above results table or accessible via tab.
- Metrics:
  - Applications by status (bar chart).
  - Filing volume over time (line chart).
  - Conversion funnel: leads → filed → approved.
  - Payment collection rate (paid vs outstanding).
  - SLA compliance (average time between status transitions).
- Filters applied globally; panel updates to reflect active filters.
- Export chart data as CSV/PNG (Super/Operations only).

### Audit Logging Data Sources
- `admin_activity_logs`: captures user actions (filters applied, status changes, document uploads, payment verifications). Fields: `id`, `admin_id`, `action_type`, `target_type`, `target_id`, `metadata`, `created_at`, `ip`.
- `trademark_status_logs`: chronological status transitions with old/new status, actor, notes, notification flags.

### Audit Log UI
- Accessible from utility rail or dedicated tab.
- **Filters**: Admin user, action type, date range, target application.
- **Table View**: Timestamp, Admin, Action summary, Target link, Metadata preview (JSON view toggle).
- **Detail Drawer**: Full metadata, diff of changes, related notifications, option to export JSON.
- **Timeline Integration**: Timeline tab merges `trademark_status_logs` (milestones) with relevant `admin_activity_logs` entries.
- **Security Controls**: Super Admin can purge old logs via retention policy; others read-only.

### Compliance & Reporting
- Support audit exports (JSON/CSV) scoped by filter, with download permissions restricted to Super Admin.
- Integrate with SIEM by streaming critical events (failed login, permission denied, status overrides).
- Maintain immutable append-only storage for status logs with hash chaining for tamper-evidence.

