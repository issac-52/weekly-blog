import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "Browinfo — 한 주를 읽는 새로운 시선",
  description: "핵심만 선별하고, 맥락까지 연결하는 AI 주간 정보 매거진.",
  robots: { index: process.env.SITE_VISIBILITY==='public', follow: process.env.SITE_VISIBILITY==='public' },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}
        <Analytics />
      </body>
    </html>
  );
}
