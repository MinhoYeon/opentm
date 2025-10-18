export type SubmissionStatus =
  | "draft"
  | "review"
  | "waiting"
  | "filed"
  | "completed";

export type TrademarkSubmission = {
  id: string;
  brandName: string;
  status: SubmissionStatus;
  submittedAt: string;
  lastUpdated: string;
  classes: string[];
  representative: string;
  referenceCode: string;
  userEmail: string;
};

const mockSubmissions: TrademarkSubmission[] = [
  {
    id: "req-2024-001",
    brandName: "JINJUNG LAB",
    status: "review",
    submittedAt: "2024-05-02T09:30:00+09:00",
    lastUpdated: "2024-05-04T14:05:00+09:00",
    classes: ["제42류(기술 서비스)", "제45류(지식재산 자문)"],
    representative: "김서윤 변리사",
    referenceCode: "JNL-5842",
    userEmail: "brand@example.com",
  },
  {
    id: "req-2024-002",
    brandName: "Glow Finch",
    status: "waiting",
    submittedAt: "2024-04-18T16:50:00+09:00",
    lastUpdated: "2024-04-21T10:12:00+09:00",
    classes: ["제25류(의류)", "제35류(소매·도소매)"],
    representative: "이도현 변리사",
    referenceCode: "GF-2091",
    userEmail: "brand@example.com",
  },
  {
    id: "req-2024-003",
    brandName: "Solstice Brew",
    status: "filed",
    submittedAt: "2024-03-07T11:20:00+09:00",
    lastUpdated: "2024-03-30T09:00:00+09:00",
    classes: ["제30류(커피·디저트)", "제32류(음료)"],
    representative: "박지안 변리사",
    referenceCode: "SB-9034",
    userEmail: "brand@example.com",
  },
  {
    id: "req-2023-219",
    brandName: "Haru Notes",
    status: "completed",
    submittedAt: "2023-11-12T13:45:00+09:00",
    lastUpdated: "2024-02-02T09:30:00+09:00",
    classes: ["제09류(소프트웨어)"],
    representative: "김서윤 변리사",
    referenceCode: "HN-7719",
    userEmail: "hello@harunotes.kr",
  },
];

const statusMeta: Record<SubmissionStatus, { label: string; description: string }> = {
  draft: {
    label: "임시 저장",
    description: "필수 정보를 모두 입력하면 담당 변리사에게 전달됩니다.",
  },
  review: {
    label: "전문가 검토 중",
    description: "담당 변리사가 제출 자료를 검토하고 있습니다.",
  },
  waiting: {
    label: "고객 확인 대기",
    description: "추가 자료나 확인이 필요하여 고객 응답을 기다리고 있습니다.",
  },
  filed: {
    label: "출원 완료",
    description: "특허청에 출원이 접수되어 심사 대기 중입니다.",
  },
  completed: {
    label: "등록 완료",
    description: "등록 절차까지 모두 마무리되었습니다.",
  },
};

export function getStatusMeta(status: SubmissionStatus) {
  return statusMeta[status];
}

export async function fetchUserSubmissions(userEmail: string) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockSubmissions.filter((submission) => submission.userEmail === userEmail);
}
