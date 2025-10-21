import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";
import { AuthProvider } from "./providers/AuthProvider";
import { createServerClient } from "@/lib/supabaseServerClient";

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
  title: "진정상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
  description:
    "진정상표는 데이터 기반 상표 검색과 전문가 검수를 통해 브랜드의 진정성을 지키는 한국 시장 특화 상표 등록 파트너입니다.",
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
    },
  },
  openGraph: {
    title: "진정상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
    description:
      "브랜드의 이름을 안전하게 지켜내는 진정상표의 데이터 기반 상표 검색과 등록 서비스를 만나보세요.",
    url: "/",
    siteName: "진정상표",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/jinjung-hero.svg",
        width: 1200,
        height: 630,
        alt: "진정상표 브랜드 감성을 담은 추상 그래픽",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "진정상표 | 브랜드의 진정성을 지키는 상표 등록 파트너",
    description:
      "상표명 무료 조회부터 등록, 사후 관리까지. 진정상표와 함께라면 브랜드의 모든 순간이 안전해집니다.",
    images: [
      {
        url: "/jinjung-hero.svg",
        alt: "진정상표 브랜드 감성을 담은 추상 그래픽",
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <AuthProvider initialSession={session}>
          <div className="flex min-h-screen flex-col">
            <MainNav />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
