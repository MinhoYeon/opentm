"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveApplicantInfo } from "./actions";

export default function ApplicantFormClient({ requestId, preset }: { requestId: string; preset?: Partial<{ name: string; email: string; phone: string; address: string; businessType: string; businessNo: string; }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(preset?.name ?? "");
  const [email, setEmail] = useState(preset?.email ?? "");
  const [phone, setPhone] = useState(preset?.phone ?? "");
  const [address, setAddress] = useState(preset?.address ?? "");
  const [businessType, setBusinessType] = useState(preset?.businessType ?? "");
  const [businessNo, setBusinessNo] = useState(preset?.businessNo ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      try {
        await saveApplicantInfo(requestId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          businessType: businessType.trim() || null,
          businessNo: businessNo.trim() || null,
        });
        router.push("/mypage");
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-2xl">
      <div>
        <label className="text-sm font-medium text-slate-700">출원인 이름</label>
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">출원인 이메일</label>
        <input type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">연락처(휴대폰)</label>
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">주소</label>
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">구분</label>
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            <option value="">선택</option>
            <option value="개인">개인</option>
            <option value="법인">법인</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">사업자번호</label>
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" value={businessNo} onChange={(e) => setBusinessNo(e.target.value)} placeholder="숫자만" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "저장 중..." : "출원인 정보 저장"}
        </button>
      </div>
      {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
    </form>
  );
}

