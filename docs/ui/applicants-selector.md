# Applicant Selector & Registration UX

The selector is a reusable component that appears wherever the user needs to attach an applicant (onboarding requests, application filing, invoicing).

```
┌──────────────────────────────────────┐
│ Saved applicants (tab)   + New       │
├──────────────────────────────────────┤
│ ★  홍길동 대표      hong@example.com │
│     010-****-5678  최근 사용 1일 전  │
│ [선택] [편집] [삭제] [즐겨찾기 토글] │
├──────────────────────────────────────┤
│ ☆  주식회사 오픈TM info@opentm.com  │
│     02-***-****    최근 사용 3일 전  │
│ [선택] [편집] [삭제] [즐겨찾기 토글] │
└──────────────────────────────────────┘
```

## Component Structure

```
src/components/applicants/
├── ApplicantCard.tsx        // Stateless card rendering masked details
├── ApplicantForm.tsx        // Controlled form for create/update
├── ApplicantSelector.tsx    // Main client component orchestrating tabs, list, modal
├── AddressSearchModal.tsx   // Lazy-loaded Naver map modal
└── useApplicantSelection.ts // Hook managing selection state
```

- `ApplicantSelector` receives server-fetched applicants and the current `selectedApplicantId`.
- The component issues fetch requests to the Applicants API and updates the local cache via the hook.
- When the user selects an applicant, the hook calls `attachApplicantToRequest` (server action) and updates the CTA state.

## CTA Behaviour Matrix

| State | Primary CTA | Secondary CTA | Notes |
| ----- | ----------- | ------------- | ----- |
| No selection | Disabled `출원인 선택` | `새 출원인 등록` | CTA becomes enabled once a selection is made. |
| Selection in progress | `출원인 연결 중…` (spinner) | Hidden | Triggered by `useTransition`. |
| Selection complete | `출원인 선택 완료` (enabled) | `다른 출원인 선택` | CTA navigates back to the request summary. |
| Error | `다시 시도` | `문의하기` link | Error message displayed above CTA. |

## Favourites & Sorting

- Tapping the star toggles `isFavorite` through the Applicants API.
- The list defaults to `favoritesFirst` and `recent` order.
- Search input filters client-side by name/email (server returns 50 rows max).

## Address Search Modal

- Triggered from the address field in `ApplicantForm`.
- Loads the Naver Maps script on demand using `NAVER_MAP_CLIENT_ID`/`NAVER_MAP_CLIENT_SECRET`.
- User selects an address → the modal returns `{ address, roadAddress, coordinates }`.
- The hook populates the address input and stores the coordinates in `metadata`.

## Accessibility

- Cards are rendered as `button` elements with `aria-pressed` reflecting selection.
- The modal traps focus and supports `Esc` to close.
- Form inputs follow the existing design system typography and spacing.

## Error States

- API failures surface toast-style alerts using the shared `useToast` hook (fallback: inline message).
- When deletion fails because the applicant is attached to an application, the API returns `409` and the selector displays guidance to detach from the filing first.

## Integration Points

- `ApplicantSelector` is imported by `src/app/(dashboard)/mypage/requests/[id]/applicant/page.tsx`.
- Additional call sites should reuse the same props contract to avoid duplication.
