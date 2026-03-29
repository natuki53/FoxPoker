import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: {
    template: "%s | FoxPoker",
    default: "FoxPoker - 全国のポーカー店舗情報が集まる",
  },
  description:
    "全国のアミューズメントポーカー店舗を横断検索。トーナメント情報・ゲーム種別・口コミを一元確認。",
  openGraph: {
    siteName: "FoxPoker",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] antialiased" suppressHydrationWarning>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
