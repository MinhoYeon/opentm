"use client";

import { useCallback, useMemo, useState } from "react";

type ApplicantResponse = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneMasked: string | null;
  address: string | null;
  addressMasked: string | null;
  businessType: string | null;
  businessNumber: string | null;
  businessNumberMasked: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  // New fields
  applicantType: string | null;
  nameKorean: string | null;
  nameEnglish: string | null;
  nationality: string | null;
  residentRegistrationNumber: string | null;
  residentRegistrationNumberMasked: string | null;
  corporationRegistrationNumber: string | null;
  corporationRegistrationNumberMasked: string | null;
  businessRegistrationNumber: string | null;
  businessRegistrationNumberMasked: string | null;
  mobilePhone: string | null;
  mobilePhoneMasked: string | null;
  postalCode: string | null;
  deliveryPostalCode: string | null;
  deliveryAddress: string | null;
  deliveryAddressMasked: string | null;
  patentCustomerNumber: string | null;
};

export type Applicant = ApplicantResponse;

export type ApplicantFormInput = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  businessType?: string | null;
  businessNumber?: string | null;
  isFavorite?: boolean;
  metadata?: Record<string, unknown>;
  // New fields
  applicantType?: "domestic_individual" | "domestic_corporation" | null;
  nameKorean?: string | null;
  nameEnglish?: string | null;
  nationality?: string | null;
  residentRegistrationNumber?: string | null;
  corporationRegistrationNumber?: string | null;
  businessRegistrationNumber?: string | null;
  mobilePhone?: string | null;
  postalCode?: string | null;
  deliveryPostalCode?: string | null;
  deliveryAddress?: string | null;
  patentCustomerNumber?: string | null;
};

type ApiError = { error?: string };

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "요청을 처리하지 못했습니다.";
    try {
      const body = (await response.json()) as ApiError;
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function parseApplicant(payload: ApplicantResponse): Applicant {
  return {
    ...payload,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    businessType: payload.businessType ?? null,
    businessNumber: payload.businessNumber ?? null,
    metadata: payload.metadata ?? {},
  };
}

type UseApplicantSelectionOptions = {
  requestId: string;
  initialApplicants: Applicant[];
  initialSelectedIds?: string[];
};

export function useApplicantSelection({
  requestId,
  initialApplicants,
  initialSelectedIds,
}: UseApplicantSelectionOptions) {
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await requestJson<{ items: ApplicantResponse[] }>(
        `/api/applicants?sort=recent&limit=50`
      );
      setApplicants(data.items.map(parseApplicant));
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 새로고침할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleApplicant = useCallback((applicantId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(applicantId)) {
        return prev.filter((id) => id !== applicantId);
      }
      return [...prev, applicantId];
    });
  }, []);

  const attachApplicants = useCallback(
    async (applicantIds: string[]) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await requestJson(`/api/trademark-requests/${requestId}/applicants`, {
          method: "POST",
          body: JSON.stringify({ applicantIds }),
        });
        const now = new Date().toISOString();
        setApplicants((prev) =>
          prev.map((item) =>
            applicantIds.includes(item.id) ? { ...item, lastUsedAt: now } : item
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "출원인을 연결하지 못했습니다.");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [requestId]
  );

  const createApplicant = useCallback(
    async (input: ApplicantFormInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const created = await requestJson<ApplicantResponse>(`/api/applicants`, {
          method: "POST",
          body: JSON.stringify(input),
        });
        const applicant = parseApplicant(created);
        setApplicants((prev) => [applicant, ...prev.filter((item) => item.id !== applicant.id)]);
        // Automatically select the newly created applicant
        toggleApplicant(applicant.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "출원인을 생성하지 못했습니다.");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [toggleApplicant]
  );

  const updateApplicant = useCallback(
    async (applicantId: string, input: ApplicantFormInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await requestJson<ApplicantResponse>(`/api/applicants/${applicantId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        const applicant = parseApplicant(updated);
        setApplicants((prev) =>
          prev.map((item) => (item.id === applicant.id ? applicant : item))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "출원인을 수정하지 못했습니다.");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const deleteApplicant = useCallback(
    async (applicantId: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await requestJson(`/api/applicants/${applicantId}`, { method: "DELETE" });
        setApplicants((prev) => prev.filter((item) => item.id !== applicantId));
        if (selectedIds.includes(applicantId)) {
          setSelectedIds((prev) => prev.filter((id) => id !== applicantId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "출원인을 삭제하지 못했습니다.");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedIds]
  );

  const toggleFavorite = useCallback(
    async (applicantId: string) => {
      const target = applicants.find((item) => item.id === applicantId);
      if (!target) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await requestJson<ApplicantResponse>(`/api/applicants/${applicantId}`, {
          method: "PATCH",
          body: JSON.stringify({ isFavorite: !target.isFavorite }),
        });
        const applicant = parseApplicant(updated);
        setApplicants((prev) =>
          prev.map((item) => (item.id === applicant.id ? applicant : item))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "즐겨찾기를 변경하지 못했습니다.");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [applicants]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return applicants;
    }
    const token = search.trim().toLowerCase();
    return applicants.filter((item) => {
      return (
        item.name.toLowerCase().includes(token) ||
        item.email.toLowerCase().includes(token)
      );
    });
  }, [applicants, search]);

  return {
    applicants: filtered,
    rawApplicants: applicants,
    selectedIds,
    setSelectedIds,
    toggleApplicant,
    createApplicant,
    updateApplicant,
    deleteApplicant,
    toggleFavorite,
    attachApplicants,
    refresh,
    search,
    setSearch,
    isSubmitting,
    isLoading,
    error,
    setError,
  } as const;
}
