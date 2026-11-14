import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { JudgeSessionProvider } from "@/lib/session/judge-session";

/** 본문·제목 공통 글꼴. 금액 숫자가 또렷하게 보여요 */
const plexKr = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "청년머니맵",
  description: "조건 입력 한 번으로 찾는 청년 맞춤형 금융상품 통합 조회 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={plexKr.variable}>
      <body>
        {/* 모바일 기준 화면 폭 */}
        <div className="mx-auto min-h-screen max-w-[430px] bg-white shadow-[0_0_0_1px_var(--color-line)]">
          {/* 입력값·판정 결과를 메모리에만 두는 공유 세션 (③④) */}
          <JudgeSessionProvider>{children}</JudgeSessionProvider>
        </div>
      </body>
    </html>
  );
}
