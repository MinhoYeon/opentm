"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "../providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") ?? "/mypage";
  const { isAuthenticated, isLoading, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, isLoading, redirectPath, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("이름과 이메일을 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      login({
        name: name.trim(),
        email: email.trim(),
      });
      router.replace(redirectPath);
    }, 300);
  };

  return (
    <div className="min-h-[60vh] space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-indigo-500">마이페이지 접속</p>
        <h1 className="text-3xl font-semibold text-slate-900">로그인</h1>
        <p className="text-sm text-slate-600">
          진정상표의 마이페이지는 로그인한 사용자만 이용할 수 있습니다. 간단한 정보 입력으로 로그인해 주세요.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          이름
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="홍길동"
            autoComplete="name"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          이메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="brand@example.com"
            autoComplete="email"
            required
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "로그인 중..." : "로그인하기"}
        </button>
        <p className="text-xs text-slate-500">
          실제 인증이 연결되기 전까지는 입력한 정보가 로컬에만 저장되며, 새로고침해도 로그인 상태가 유지됩니다.
        </p>
      </form>
    </div>
  );
}
