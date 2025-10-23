# Applicants Components 설계 개요

`src/components/applicants` 디렉터리는 상표출원요청 화면과 관련된 신청인 선택 UI 컴포넌트와 상태 로직을 담당한다.

## 디렉터리 구조 제안
```
src/components/applicants/
├── index.ts                # 공개 API: 주요 컴포넌트 및 훅 export
├── ApplicantsSelector.tsx  # 전체 선택기 컨테이너, 탭/검색/CTA 포함
├── ApplicantsList.tsx      # 신청인 리스트 렌더링 및 무한 스크롤 관리
├── ApplicantCard.tsx       # 단일 신청인 카드 컴포넌트
├── FavoritesTab.tsx        # 즐겨찾기 전용 뷰(옵션, 분리 필요 시)
├── RecentTab.tsx           # 최근 사용 신청인 뷰
├── EmptyState.tsx          # 검색 결과 없음/데이터 없음 시 표시
├── RegisterApplicantModal.tsx # 신규 등록 플로우 모달
├── cta/
│   ├── ApplicantsCta.tsx   # CTA 버튼 래퍼 컴포넌트
│   └── ctaConfig.ts        # CTA 상태-문구 매핑 테이블
├── hooks/
│   ├── useApplicantSelection.ts # 선택/검색/필터/CTA 상태 관리
│   └── useApplicantSearch.ts    # 검색 및 페이지네이션 관리(필요 시)
├── context/
│   └── ApplicantsProvider.tsx   # 선택 컨텍스트 제공(필요 시)
├── types.ts                 # Applicant, SelectionState 등 타입 정의
└── __tests__/               # 단위/통합 테스트 위치
```

## 핵심 컴포넌트 역할
- **ApplicantsSelector**: 최상위 컨테이너. `useApplicantSelection` 훅을 사용하여 상태를 주입하고, 탭/검색/CTA 컴포넌트를 조합한다.
- **ApplicantsList**: `Applicant[]` 데이터를 props로 받아 리스트 렌더링 및 무한 스크롤/가상 스크롤을 담당한다.
- **ApplicantCard**: 단일 카드 UI, 선택/즐겨찾기 토글, 상태 배지를 포함한다.
- **ApplicantsCta**: CTA 상태 매트릭스를 참조하여 버튼 레이블, 비활성화 여부, 로딩 표시 등을 결정한다.

## `useApplicantSelection` 훅 설계

### 책임 범위
- 현재 선택된 신청인(`selectedApplicantId`), 선택 가능 여부(`isValid`), 로딩/에러 상태 관리.
- 즐겨찾기, 최근 사용 목록 동기화.
- 검색 쿼리 및 페이지네이션 관리(필요 시 `useApplicantSearch`와 협력).
- CTA 상태 매트릭스 계산 및 텍스트/메시지 반환.

### 상태 다이어그램
```
Idle ── 선택 ──▶ SelectedValid ── 요청 ──▶ Loading ── 성공 ──▶ Success
 │             │                    │                   │
 │             └── 유효성 실패 ──▶ SelectedInvalid ─────┘
 └── 오류 ──▶ Error
```
- 각 상태는 CTA variant(`disabled`, `primary`, `loading`, `success`, `error`)와 매핑된다.

### 인터페이스
```ts
interface UseApplicantSelectionOptions {
  initialApplicantId?: string;
  fetchApplicants: (params: FetchParams) => Promise<ApplicantPage>;
  validateApplicant?: (applicantId: string) => Promise<ValidationResult>;
  favoritesApi: FavoritesApi;
  recentApi: RecentApi;
}

interface ApplicantSelectionState {
  selectedApplicantId: string | null;
  selectedApplicant?: Applicant;
  favorites: string[];
  recent: Applicant[];
  query: string;
  isValid: boolean | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  cta: {
    variant: 'disabled' | 'primary' | 'loading' | 'success' | 'error';
    label: string;
    helperText?: string;
  };
}

interface ApplicantSelectionActions {
  selectApplicant(id: string): void;
  toggleFavorite(id: string): Promise<void>;
  fetchMore(): Promise<void>;
  search(query: string): void;
  refresh(): Promise<void>;
  submit(): Promise<void>;
  resetStatus(): void; // success 후 idle 복귀
}

export type UseApplicantSelectionReturn = [ApplicantSelectionState, ApplicantSelectionActions];
```

### 구현 메모
- `useReducer` + `useEffect` 조합으로 비동기 상태와 로컬 동기 로직 분리.
- 즐겨찾기/최근 사용 정보는 로컬 옵티미스틱 업데이트 후 API 동기화.
- CTA 상태 계산은 별도 셀렉터(`getCtaState(state)`)로 분리하여 테스트 용이성 확보.
- React Query 또는 SWR 사용 시 훅 내부에서 캐싱/Prefetch 전략 정의.
- 서버 오류 발생 시 `error` 상태와 CTA helperText를 업데이트하고 토스트 발송.

## 테스트 전략
- 훅: React Testing Library의 `renderHook`으로 상태 전이 및 CTA 매핑 검증.
- 컴포넌트: `ApplicantsSelector`는 주요 플로우(검색, 즐겨찾기 토글, CTA 활성화)를 통합 테스트.
- Storybook: 각 상태별 스토리 제공(기본/로딩/에러/성공 등)으로 디자이너 협업.

