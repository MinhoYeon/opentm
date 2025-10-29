/**
 * 통계 및 리포트 타입 정의
 */

export type PaymentStageStats = {
  stage: "filing" | "office_action" | "registration";
  stageLabel: string;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
};

export type MonthlyPaymentStats = {
  month: string; // YYYY-MM 형식
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentCount: number;
  paidCount: number;
};

export type OverdueAnalysis = {
  totalPayments: number;
  overduePayments: number;
  overdueRate: number; // 0-100 퍼센트
  averageDaysOverdue: number;
  totalOverdueAmount: number;
  overdueByStage: {
    filing: number;
    office_action: number;
    registration: number;
  };
};

export type PaymentStatsResponse = {
  overview: {
    totalPayments: number;
    totalAmount: number;
    totalPaid: number;
    totalUnpaid: number;
    overdueCount: number;
    refundCount: number;
  };
  byStage: PaymentStageStats[];
  byMonth: MonthlyPaymentStats[];
  overdueAnalysis: OverdueAnalysis;
  generatedAt: string;
};
