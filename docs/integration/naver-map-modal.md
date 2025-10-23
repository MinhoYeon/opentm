# Naver Map Address Search Modal

This document captures the technical contract for integrating the Naver Map address search inside the applicant selector.

## Domain Verification

1. Register the deployment domains (`localhost`, `staging.opentm.kr`, `app.opentm.kr`) in the Naver Cloud Platform console under **Service URL**.
2. For production, upload the generated HTML verification file to `public/.well-known/naver-site-verification.html`.
3. Ensure HTTPS is enabled. Naver blocks insecure origins.

## Credentials

Set the following environment variables:

- `NAVER_MAP_CLIENT_ID`
- `NAVER_MAP_CLIENT_SECRET`

These are injected into the runtime via Next.js public/private env support.

## Loading Strategy

The modal lazily loads the script to avoid impacting Time To Interactive on dashboard pages.

```ts
function loadNaverMap(): Promise<void> {
  if (window.naver?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Naver Maps"));
    document.body.appendChild(script);
  });
}
```

The modal waits for the promise before instantiating `naver.maps.Service.Geocoder()`.

## Modal Flow

1. User clicks `주소 검색` inside the applicant form.
2. `AddressSearchModal` renders and triggers `loadNaverMap()`.
3. Once the library is ready, it renders a search input + results list (using `naver.maps.Service`).
4. Selecting a result emits `{ address, roadAddress, x, y }` back to the parent via `onSelect`.
5. Parent populates the address field, stores coordinates in applicant metadata, and closes the modal.

## Privacy & Logging

- All address searches are logged with timestamp, user ID, and query string in the analytics pipeline (PII is masked).
- The modal masks coordinates in client logs; raw coordinates are only stored server-side when saving applicants.
- Access to the modal is rate-limited at the API key level in Naver Cloud.

## Error Handling

- If the script fails to load, show an inline alert with a retry button.
- When the geocoder returns no results, display `검색 결과가 없습니다.`
- Network errors surface a toast and keep the modal open.

## Testing Checklist

- ✅ Script loads once per session (memoized promise).
- ✅ Keyboard-only navigation (Tab/Shift+Tab) cycles through input and results.
- ✅ Screen reader announces result count and active selection.
- ✅ Closing the modal returns focus to the triggering button.
