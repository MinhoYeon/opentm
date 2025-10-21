"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => searchParams.get("redirect") ?? "/mypage", [searchParams]);

  const supabase = useMemo(() => createBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setMessage(null);

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password.trim()) {
        setError("이메일과 비밀번호를 입력해 주세요.");
        return;
      }
      if (password !== passwordConfirm) {
        setError("비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      setIsSubmitting(true);
      try {
        const emailRedirectTo = `${window.location.origin}/login`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: name.trim() ? { name: name.trim() } : undefined,
            emailRedirectTo,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        // If email confirmation is disabled, session may be returned.
        if (data.session?.user) {
          // Best-effort profile upsert; ignore failures for now
          try {
            await supabase.from("profiles").upsert(
              { id: data.session.user.id, email: trimmedEmail, name: name.trim() || null },
              { onConflict: "id" }
            );
          } catch {}
          router.replace(redirectPath);
          return;
        }

        // Email confirmation required
        setMessage("확인 이메일을 보냈습니다. 받은 편지함을 확인해 주세요.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "회원가입 중 오류가 발생했습니다.";
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, name, password, passwordConfirm, redirectPath, supabase, router]
  );

  return (
    <div className="min-h-[60vh] space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-indigo-500">계정 생성</p>
        <h1 className="text-3xl font-semibold text-slate-900">회원가입</h1>
        <p className="text-sm text-slate-600">이메일과 비밀번호로 계정을 만들어 주세요.</p>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          이름(선택)
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="홍길동"
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="brand@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          비밀번호 확인
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "가입 처리 중..." : "회원가입"}
        </button>
        <p className="text-xs text-slate-500">가입 시 서비스 약관과 개인정보 처리방침에 동의하게 됩니다.</p>
      </form>
    </div>
  );
}

