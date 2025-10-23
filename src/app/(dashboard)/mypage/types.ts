export type StatusTransition = {
  status: string;
  label?: string | null;
  description?: string | null;
  changedAt?: string | null;
};

export type TrademarkRequest = {
  id: string;
  brandName: string;
  status: string;
  statusLabel?: string | null;
  statusDescription?: string | null;
  statusBadgeClass?: string | null;
  statusDotClass?: string | null;
  submittedAt?: string | null;
  lastUpdated?: string | null;
  classes: string[];
  representative?: string | null;
  referenceCode?: string | null;
  transitions: StatusTransition[];
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ApplicantSummary = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessType?: string | null;
  businessNo?: string | null;
  requestId?: string | null;
};
