import type { TrademarkStatus } from "@/lib/trademarks/status";
import type { AdminCapabilities, AdminRole } from "@/lib/admin/roles";

export type PaymentState =
  | "unpaid"
  | "paid"
  | "partial"
  | "refund_requested"
  | "overdue"
  | "unknown";

export type AdminAssignedUser = {
  id: string | null;
  name?: string | null;
  email?: string | null;
};

export type AdminPaymentInfo = {
  state: PaymentState;
  amount?: number | null;
  currency?: string | null;
  dueAt?: string | null;
  receivedAt?: string | null;
  reference?: string | null;
  method?: string | null;
  remitterName?: string | null;
};

export type AdminDocument = {
  id: string;
  name: string;
  url?: string | null;
  uploadedAt?: string | null;
  uploadedBy?: string | null;
  type?: string | null;
  size?: number | null;
  version?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminTimelineEntry = {
  id: string;
  type: string;
  label: string;
  occurredAt?: string | null;
  description?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminTrademarkApplication = {
  id: string;
  managementNumber: string | null;
  brandName: string;
  trademarkType?: string | null;
  productClasses: string[];
  goodsDescription?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  applicantPhone?: string | null;
  tags: string[];
  status: TrademarkStatus;
  statusDetail?: string | null;
  statusUpdatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  filedAt?: string | null;
  filingReceiptNumber?: string | null;
  filingSubmissionReference?: string | null;
  deadlines: {
    filing?: string | null;
    response?: string | null;
    payment?: string | null;
  };
  payment: AdminPaymentInfo;
  assignedTo?: AdminAssignedUser | null;
  lastTouchedAt?: string | null;
  unreadNoteCount?: number;
  pendingActionCount?: number;
  metadata: Record<string, unknown>;
  documents: AdminDocument[];
  timeline: AdminTimelineEntry[];
};

export type AdminActivityLog = {
  id: string;
  actionType: string;
  actorId?: string | null;
  actorName?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminDashboardFilters = {
  statuses: string[];
  paymentStates: string[];
  assignedTo?: string | null;
  tags: string[];
  search?: string;
  dateRange?: {
    field: "created_at" | "updated_at" | "filed_at" | "status_updated_at";
    from?: string | null;
    to?: string | null;
  } | null;
};

export type AdminDashboardPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AdminUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  role: AdminRole;
  capabilities: AdminCapabilities;
};

export type StatusSummary = {
  status: TrademarkStatus;
  count: number;
};

export type PaymentSummary = {
  state: PaymentState;
  count: number;
  totalAmount: number;
};

export type SavedFilter = {
  id: string;
  name: string;
  description?: string | null;
  filters: AdminDashboardFilters;
};

export type AdminTrademarkRequest = {
  id: string;
  user_id: string | null;
  brand_name: string;
  trademark_type: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  product_classes: string[];
  representative_email: string;
  additional_notes: string | null;
  submitted_at: string | null;
  status: string;
  status_detail: string | null;
  status_updated_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// 통합 뷰: trademark_requests와 trademark_applications를 결합한 타입
export type UnifiedTrademarkItem = {
  request: AdminTrademarkRequest;
  application: AdminTrademarkApplication | null;
  isApproved: boolean;
};

