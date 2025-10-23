# Bank Transfer Operations

This document defines the required modules, data structures, and flows for handling manual bank-transfer payments, including deposit verification, admin review, and refund operations. Share this document with the whole team to ensure consistent implementation across backend, frontend, and operations.

## 1. Slack Incoming Webhook Notification Module

Create a reusable module responsible for sending notifications to the operations Slack channel via an Incoming Webhook URL. The module **must**:

- Accept a pre-configured webhook URL via environment variable `SLACK_INCOMING_WEBHOOK_URL`.
- Expose a function `notifyDepositReview(request)` that posts a JSON payload with the following structure:
  ```json
  {
    "text": "[입금 확인 요청]",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*:rotating_light: 입금 확인 요청이 도착했습니다*"
        }
      },
      {
        "type": "section",
        "fields": [
          { "type": "mrkdwn", "text": "*입금자명*\n{{payerName}}" },
          { "type": "mrkdwn", "text": "*금액*\n{{amount}}원" },
          { "type": "mrkdwn", "text": "*계좌*\n{{bankName}} {{accountNumber}}" },
          { "type": "mrkdwn", "text": "*요청자*\n{{requestedBy}}" }
        ]
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "관리자 확인 페이지" },
            "url": "{{adminReviewUrl}}"
          }
        ]
      }
    ]
  }
  ```
- Replace `{{...}}` placeholders with actual values from `request`.
- Log and surface any webhook failure to our monitoring system.

### Message Format Rules

- Prefix the `text` property with `[입금 확인 요청]` to simplify keyword-based Slack automations.
- Amounts must include the `원` suffix and thousand separators (e.g., `12,000원`).
- `adminReviewUrl` should route to the new 관리자 확인 UI described below.
- Include optional context block with a memo if provided; if absent, omit the block entirely.

## 2. 관리자 확인 폼 UI & API 연동

Build an admin-only page `pages/admin/payments/bank-transfer.tsx` displaying a list of pending bank-transfer payments and a detail drawer for confirmation. The confirmation form must include the following fields:

- **입금자명 (payerName)** – text input, required.
- **금액 (amount)** – numeric input with currency formatting, required.
- **계좌 (bankAccount)** – readonly summary (은행명 + 계좌번호) from the payment record.
- **확인 상태 (status)** – radio group with values `pending`, `confirmed`, `rejected`.
- **메모 (memo)** – optional textarea for ops notes.

### API Integration

- On submit, call `PATCH /api/payments/bank` with payload:
  ```json
  {
    "paymentId": "<uuid>",
    "status": "confirmed | rejected",
    "confirmedBy": "<adminId>",
    "memo": "<optional memo>"
  }
  ```
- Display success and error toasts based on the API response.
- Refresh the payment list after a successful update to reflect the latest status.

### Documentation Notes

- Document the UI and API linkage in Storybook (if available) and internal Notion, referencing this markdown file for canonical rules.

## 3. `refund_requests` Table Schema

Define a new table `refund_requests` for tracking manual refund operations:

| Column         | Type                     | Constraints                          | Description                                   |
| -------------- | ------------------------ | ------------------------------------ | --------------------------------------------- |
| `id`           | UUID                     | Primary key, default `gen_random_uuid()` | Unique identifier for the refund request. |
| `payment_id`   | UUID                     | Foreign key → `payments.id`, NOT NULL     | Associated payment requiring refund.     |
| `reason`       | TEXT                     | NOT NULL                              | User-provided reason for requesting refund.   |
| `requested_by` | UUID                     | Foreign key → `profiles.id`, NOT NULL    | User or admin who initiated the request.      |
| `status`       | TEXT CHECK in (`pending`, `approved`, `rejected`, `processed`) | Default `pending` | Lifecycle status of the refund. |
| `processed_at` | TIMESTAMP WITH TIME ZONE | Nullable                              | Set when refund moves to `processed`.         |
| `created_at`   | TIMESTAMP WITH TIME ZONE | Default `now()`                        | Audit field.                                  |
| `updated_at`   | TIMESTAMP WITH TIME ZONE | Default `now()`, update trigger        | Audit field.                                  |

### Index Requirements

- `CREATE UNIQUE INDEX refund_requests_payment_id_unique_pending ON refund_requests(payment_id) WHERE status = 'pending';` – prevents multiple concurrent pending refunds for the same payment.
- `CREATE INDEX refund_requests_status_idx ON refund_requests(status);`
- `CREATE INDEX refund_requests_requested_by_idx ON refund_requests(requested_by);`
- `CREATE INDEX refund_requests_processed_at_idx ON refund_requests(processed_at) WHERE processed_at IS NOT NULL;`

## 4. Refund Approval / Rejection Workflow

1. **Initiation** – Customer or admin creates a refund request. Slack module above also posts a `[환불 요청]` notification following similar formatting.
2. **Admin Review** – Admins review pending requests in a new admin UI section (extend the bank-transfer page or create `/admin/payments/refunds`).
3. **Approval** – Upon approval, backend updates `status` to `approved`, sets `processed_at` to the current timestamp once funds are returned, and logs the operator.
4. **Rejection** – For rejections, set `status` to `rejected` and record memo/reason for audit.
5. **Toss API Integration Point** – When we later integrate Toss Payments API, hook into the approval step to:
   - Call Toss refund endpoint with `payment_id` and amount.
   - On success, mark `status` as `processed` and set `processed_at`.
   - On failure, revert to `approved` with an error memo for retry.
6. **Notifications** – Send Slack updates on approval or rejection outcomes; email notifications are optional but recommended.

## 5. Document Distribution

- Store this document at `docs/payments/bank-transfer.md` in the repository (current location).
- Share the link in the #payments Slack channel and pin it for quick access.
- Reference this document from onboarding guides and the operations runbook.

