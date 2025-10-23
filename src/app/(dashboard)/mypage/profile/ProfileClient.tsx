"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";
import { deleteAccount } from "./actions";

export default function ProfileClient({ email }: { email: string | null }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();

  const [emailValue, setEmailValue] = useState(email ?? "");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<string | null>(null);

  async function onUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailValue.trim() });
      if (error) throw error;
      setEmailMsg("이메일 변경 요청이 접수되었습니다. 확인 메일을 확인해 주세요.");
    } catch (err) {
      setEmailMsg(err instanceof Error ? err.message : "이메일 변경 중 오류가 발생했습니다.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw1.length < 8) {
      setPwMsg("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pw1 !== pw2) {
      setPwMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setPwMsg("비밀번호가 변경되었습니다.");
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setPwBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDangerBusy(true);
    setDangerMsg(null);
    try {
      const res = await deleteAccount();
      if (!res.ok) {
        setDangerMsg(res.message);
        return;
      }
      // Redirect to home after a short delay
      router.push("/");
      router.refresh();
    } catch (err) {
      setDangerMsg(err instanceof Error ? err.message : "탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setDangerBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-indigo-500">마이페이지</p>
        <h1 className="text-3xl font-semibold text-slate-900">회원 정보 수정</h1>
        <p className="text-sm text-slate-600">이메일과 비밀번호를 변경하고, 필요시 회원 탈퇴가 가능합니다.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">이메일 변경</h2>
        <form onSubmit={onUpdateEmail} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="example@email.com"
          />
          <button
            type="submit"
            disabled={emailBusy}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {emailBusy ? "변경 중..." : "이메일 변경"}
          </button>
        </form>
        {emailMsg ? <p className="mt-2 text-sm text-slate-600">{emailMsg}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">비밀번호 변경</h2>
        <form onSubmit={onUpdatePassword} className="mt-4 grid gap-3 sm:max-w-md">
          <input
            type="password"
            required
            placeholder="새 비밀번호"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="새 비밀번호 확인"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwBusy}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pwBusy ? "변경 중..." : "비밀번호 변경"}
            </button>
            <Link href="/mypage" className="text-sm text-slate-600 underline">마이페이지로</Link>
          </div>
        </form>
        {pwMsg ? <p className="mt-2 text-sm text-slate-600">{pwMsg}</p> : null}
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-rose-700">회원 탈퇴</h2>
        <p className="mt-1 text-sm text-rose-700">탈퇴 시 계정과 관련 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <button
          type="button"
          onClick={onDelete}
          disabled={dangerBusy}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {dangerBusy ? "처리 중..." : "회원 탈퇴"}
        </button>
        {dangerMsg ? <p className="mt-2 text-sm text-rose-700">{dangerMsg}</p> : null}
      </section>
    </div>
  );
}

