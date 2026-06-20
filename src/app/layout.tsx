import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientErrorBoundary } from "@/components/client-error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCO-Vibe Fortune Coach | 사주 x 바이브 라이프 코칭",
  description: "TCO-Vibe Fortune Coach - 사주 명리 기반 AI 운세 코치. 전통 명리학의 정교한 절기 계산법과 실시간 감정 상태(Vibe Check-in)를 분석하여 최적의 의사결정과 행동 지침을 처방합니다.",
  openGraph: {
    title: "TCO-Vibe Fortune Coach | 사주 x 바이브 라이프 코칭",
    description: "전통 명리학의 정교한 절기 계산법과 실시간 감정 상태(Vibe Check-in)를 분석하여 최적의 의사결정과 행동 지침을 처방합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "TCO-Vibe Fortune Coach",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body className="min-h-full flex flex-col">
        <ClientErrorBoundary>{children}</ClientErrorBoundary>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </body>
    </html>
  );
}
