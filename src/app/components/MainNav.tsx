"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "../providers/AuthProvider";

const baseNavItems = [
  { label: "상표명 무료 조회", href: "/search" },
  { label: "마이페이지", href: "/mypage", requiresAuth: true },
  { label: "비용 및 절차 안내", href: "/guide" },
  { label: "Q&A", href: "/qa" },
];

export function MainNav() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  const navItems = baseNavItems.map((item) => {
    const isRestricted = item.requiresAuth && !isAuthenticated;
    const targetHref = isRestricted
      ? `/login?redirect=${encodeURIComponent(item.href)}`
      : item.href;

    return {
      ...item,
      targetHref,
      isRestricted,
      isActive:
        !isRestricted &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    };
  });

  return (
    <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200 sticky top-0 z-50">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          OpenTM
        </Link>
        <ul className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-4 text-sm sm:text-base">
          {navItems.map(({ label, targetHref, isActive, isRestricted }) => {
            return (
              <li key={label} className="flex">
                <Link
                  href={targetHref}
                  prefetch={!isRestricted}
                  className={`rounded-full px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isActive
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  } ${
                    isRestricted ? "opacity-80" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex items-center gap-2">
            {!isLoading && isAuthenticated && user ? (
              <>
                <span className="hidden text-sm text-slate-500 sm:inline">
                  {(user.user_metadata?.full_name as string | undefined) ?? user.email ?? "로그인 사용자"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void logout().catch((error) => {
                      console.error("Failed to log out", error);
                    });
                  }}
                  className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                로그인
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default MainNav;
