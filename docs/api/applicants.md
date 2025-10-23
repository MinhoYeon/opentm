# Applicants API

These endpoints manage reusable applicant profiles. All endpoints require an authenticated Supabase session via the browser cookies. Responses are JSON and timestamps are ISO strings.

Base path: `/api/applicants`

## List applicants

`GET /api/applicants`

### Query Parameters

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `favoritesOnly` | boolean | `false` | If `true`, return only favourite applicants. |
| `search` | string | `null` | Case-insensitive substring search over the applicant name and email. |
| `sort` | enum | `recent` | `recent` sorts by `is_favorite DESC, last_used_at DESC, updated_at DESC`. `name` sorts alphabetically. |
| `limit` | number | 50 | Maximum number of rows (capped at 100). |

### Response

```
200 OK
{
  "items": [
    {
      "id": "uuid",
      "name": "홍길동",
      "email": "hong@example.com",
      "phone": "010-1234-5678",
      "phoneMasked": "010-****-5678",
      "address": "서울특별시 …",
      "addressMasked": "서울특별시 …",
      "businessType": "개인",
      "businessNumber": "1234567890",
      "businessNumberMasked": "******7890",
      "isFavorite": true,
      "lastUsedAt": "2025-02-11T12:34:56.000Z",
      "createdAt": "2025-02-10T07:20:00.000Z",
      "updatedAt": "2025-02-11T12:34:56.000Z"
    }
  ]
}
```

Sensitive values (`phone`, `address`, `businessNumber`) are included because the response is only delivered to authenticated owners over HTTPS. Client code should prefer masked variants when rendering.

## Create applicant

`POST /api/applicants`

### Body

```
{
  "name": "홍길동",
  "email": "hong@example.com",
  "phone": "01012345678",
  "address": "서울특별시 중구 세종대로 110",
  "businessType": "개인",
  "businessNumber": "123-45-67890",
  "isFavorite": false
}
```

### Validation Rules

- `name` and `email` are required strings.
- Phone and business numbers accept digits, spaces, hyphens, and dots; other characters are rejected.
- The optional `isFavorite` flag defaults to `false`.

### Response

`201 Created` with the same shape as list items.

## Update applicant

`PATCH /api/applicants/:id`

### Body (partial updates allowed)

```
{
  "name": "홍길동 대표",
  "phone": "01098765432",
  "isFavorite": true,
  "markAsUsed": true
}
```

`markAsUsed` sets `last_used_at` to `now()` and is intended to be called when the applicant is attached to a request/application.

### Response

`200 OK` with updated applicant payload.

## Delete applicant

`DELETE /api/applicants/:id`

Deletes the applicant profile and cascades to request/application join tables.

### Response

`204 No Content`

## Attach applicant to onboarding request

`POST /api/applicants/:id/attach`

### Body

```
{
  "requestId": "uuid"
}
```

- Validates that the request belongs to the caller.
- Upserts into `trademark_request_applicants` and updates `last_used_at`.

### Response

`200 OK` with `{ "ok": true }`.

## Toggle favourite

The generic `PATCH` endpoint should be used with `{ "isFavorite": boolean }`. Dedicated routes were deemed unnecessary.

## Errors

- `400` – Validation failure (`message` contains the reason).
- `401` – No authenticated session.
- `403` – Attempt to access another user's applicant.
- `404` – Applicant or request not found.
- `500` – Unexpected Supabase or encryption error.
