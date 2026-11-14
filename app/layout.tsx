import type { Metadata, Viewport } from "next";
import "./globals.css";
import { JudgeSessionProvider } from "@/lib/session/judge-session";

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
    <html lang="ko">
      <body>
        {/* 모바일 기준 화면 폭 */}
        <div className="mx-auto min-h-screen max-w-[430px]">
          {/* 입력값·판정 결과를 메모리에만 두는 공유 세션 (③④) */}
          <JudgeSessionProvider>{children}</JudgeSessionProvider>
        </div>
      </body>
    </html>
  );
}
