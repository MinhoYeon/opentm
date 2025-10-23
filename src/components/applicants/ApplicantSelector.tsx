"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ApplicantCard } from "./ApplicantCard";
import { ApplicantForm } from "./ApplicantForm";
import type { Applicant } from "./useApplicantSelection";
import { ApplicantFormInput, useApplicantSelection } from "./useApplicantSelection";

type ApplicantSelectorProps = {
  requestId: string;
  initialApplicants: Applicant[];
  initialSelectedId?: string | null;
};

type PanelState =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; applicantId: string };

export function ApplicantSelector({ requestId, initialApplicants, initialSelectedId }: ApplicantSelectorProps) {
  const router = useRouter();
  const {
    applicants,
    rawApplicants,
    selectedId,
    createApplicant,
    updateApplicant,
    deleteApplicant,
    toggleFavorite,
    attachApplicant,
    refresh,
    search,
    setSearch,
    isSubmitting,
    isLoading,
    error,
    setError,
  } = useApplicantSelection({ requestId, initialApplicants, initialSelectedId });

  const [panel, setPanel] = useState<PanelState>({ type: "list" });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const editingApplicant = useMemo(() => {
    if (panel.type !== "edit") return undefined;
    return rawApplicants.find((item) => item.id === panel.applicantId);
  }, [panel, rawApplicants]);

  async function handleSelect(applicantId: string) {
    setError(null);
    setSuccessMessage(null);
    try {
      await attachApplicant(applicantId);
      setPanel({ type: "list" });
      setSuccessMessage("출원인을 연결했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "출원인 연결에 실패했습니다.");
    }
  }

  async function handleCreate(input: ApplicantFormInput) {
    setSuccessMessage(null);
    await createApplicant(input);
    setPanel({ type: "list" });
    setSuccessMessage("새 출원인이 등록되었습니다.");
  }

  async function handleUpdate(input: ApplicantFormInput) {
    if (panel.type !== "edit") return;
    setSuccessMessage(null);
    await updateApplicant(panel.applicantId, input);
    setPanel({ type: "list" });
    setSuccessMessage("출원인 정보가 수정되었습니다.");
  }

  async function handleDelete(applicantId: string) {
    setSuccessMessage(null);
    await deleteApplicant(applicantId);
  }

  function handleComplete() {
    if (!selectedId) {
      setError("출원인을 선택해 주세요.");
      return;
    }
    router.push(`/mypage/requests/${requestId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">출원인 선택</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button type="button" onClick={refresh} className="hover:underline" disabled={isLoading || isSubmitting}>
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel({ type: "create" });
                setError(null);
              }}
              className="rounded-full border border-indigo-500 px-3 py-1 text-indigo-600"
              disabled={isSubmitting}
            >
              새 출원인 등록
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          저장된 출원인을 선택하거나 새로 등록할 수 있습니다. 즐겨찾기한 출원인이 상단에 노출됩니다.
        </p>
      </div>

      {panel.type === "list" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="이름 또는 이메일 검색"
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">총 {rawApplicants.length}명</span>
          </div>
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
          <div className="space-y-3">
            {applicants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                저장된 출원인이 없습니다. &quot;새 출원인 등록&quot; 버튼을 눌러 추가해 주세요.
              </p>
            ) : (
              applicants.map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  selected={selectedId === applicant.id}
                  onSelect={() => {
                    handleSelect(applicant.id).catch(() => undefined);
                  }}
                  onEdit={() => setPanel({ type: "edit", applicantId: applicant.id })}
                  onDelete={() => {
                    handleDelete(applicant.id).catch(() => undefined);
                  }}
                  onToggleFavorite={() => {
                    toggleFavorite(applicant.id).catch(() => undefined);
                  }}
                  disabled={isSubmitting}
                />
              ))
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-medium text-slate-700">현재 선택된 출원인</p>
              <p className="text-sm text-slate-500">
                {selectedId
                  ? rawApplicants.find((item) => item.id === selectedId)?.name ?? "선택됨"
                  : "출원인을 선택해 주세요."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!selectedId || isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? "처리 중..." : selectedId ? "출원인 선택 완료" : "출원인 선택"}
            </button>
          </div>
        </div>
      ) : null}

      {panel.type === "create" ? (
        <ApplicantForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setPanel({ type: "list" })}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {panel.type === "edit" && editingApplicant ? (
        <ApplicantForm
          mode="edit"
          initialValue={editingApplicant}
          onSubmit={handleUpdate}
          onCancel={() => setPanel({ type: "list" })}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}
