import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";
import LayoutWrapper from "./components/LayoutWrapper";
import { AuthProvider } from "./providers/AuthProvider";
import { createServerClient } from "@/lib/supabaseServerClient";
import type { Session } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jinjung.tm"),
  title: "오픈상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
  description:
    "오픈상표는 데이터 기반 상표 검색과 전문가 검수를 통해 브랜드의 진정성을 지키는 한국 시장 특화 상표 등록 파트너입니다.",
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
    },
  },
  openGraph: {
    title: "오픈상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
    description:
      "브랜드의 이름을 안전하게 지켜내는 오픈상표의 데이터 기반 상표 검색과 등록 서비스를 만나보세요.",
    url: "/",
    siteName: "오픈상표",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/jinjung-hero.svg",
        width: 1200,
        height: 630,
        alt: "오픈상표 브랜드 감성을 담은 추상 그래픽",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "오픈상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
    description:
      "상표명 무료 조회부터 등록, 사후 관리까지. 오픈상표와 함께라면 브랜드의 모든 순간이 안전해집니다.",
    images: [
      {
        url: "/jinjung-hero.svg",
        alt: "오픈상표 브랜드 감성을 담은 추상 그래픽",
      },
    ],
  },
  icons: {
    icon: "/jinjung-hero.svg",
    shortcut: "/jinjung-hero.svg",
    apple: "/jinjung-hero.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerClient();
  const [sessionRes, userRes] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const rawSession = sessionRes.data.session;
  const safeUser = userRes.data.user;

  const initialSession: Session | null =
    rawSession && safeUser
      ? {
          access_token: rawSession.access_token,
          refresh_token: rawSession.refresh_token,
          expires_at: rawSession.expires_at,
          expires_in: rawSession.expires_in,
          token_type: rawSession.token_type,
          provider_token: rawSession.provider_token,
          provider_refresh_token: rawSession.provider_refresh_token,
          user: safeUser,
        }
      : null;

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <AuthProvider initialSession={initialSession}>
          <div className="flex min-h-screen flex-col">
            <MainNav />
            <main className="flex-1">
              <LayoutWrapper>{children}</LayoutWrapper>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
