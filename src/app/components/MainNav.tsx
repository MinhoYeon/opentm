"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "마이페이지", href: "/mypage" },
  { label: "비용 및 절차 안내", href: "/guide" },
  { label: "Q&A", href: "/qa" },
  { label: "로그인/로그아웃", href: "/login" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200 sticky top-0 z-50">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          OpenTM
        </Link>
        <ul className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-4 text-sm sm:text-base">
          {navItems.map(({ label, href }) => {
            const isActive =
              href === "/"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  className={`rounded-full px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isActive
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export default MainNav;
