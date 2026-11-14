"use client";
// ③ 담당: 결과 화면 (와이어프레임 ③-1 ~ ③-3)
// - 판정 결과는 공유 세션에서 꺼내요. 새로고침하면 사라지니 다시 입력 안내를 보여줘요
// - 지금은 상품명과 판정 배지 목록만 있어요 (03·04에서 탭·카드 완성)
import Link from "next/link";
import { useJudgeSession } from "@/lib/session/judge-session";
import type { JudgeStatus } from "@/types";

const BADGE: Record<JudgeStatus, { label: string; className: string }> = {
  eligible: { label: "가능", className: "bg-gray-800 text-white" },
  needsCheck: { label: "확인 필요", className: "border border-gray-500 text-gray-800" },
  ineligible: { label: "해당 없음", className: "bg-gray-100 text-gray-500" },
};

export default function ResultPage() {
  const { result } = useJudgeSession();

  if (!result) {
    return (
      <main className="flex flex-col items-center gap-4 px-5 py-16 text-center">
        <h1 className="text-xl font-semibold">조회 결과가 없어요</h1>
        <p className="text-sm text-gray-600">입력한 정보는 저장하지 않아요. 다시 입력해 주세요</p>
        <Link href="/input" className="flex h-12 items-center rounded-lg bg-gray-800 px-6 font-semibold text-white">
          조건 입력하기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 px-5 py-6">
      <header className="flex items-center gap-3">
        <Link href="/input" className="text-sm text-gray-600">
          ← 조건 수정
        </Link>
        <h1 className="text-lg font-bold">조회 결과</h1>
      </header>

      <ul className="flex flex-col gap-2">
        {result.results.map((r) => {
          const badge = r.owned
            ? { label: "가입 중", className: "bg-gray-200 text-gray-600" }
            : BADGE[r.status];
          return (
            <li
              key={r.productId}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 px-4 py-3"
            >
              <span className="font-medium">{r.productName}</span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-500">판정은 참고용이고, 최종 자격은 신청처 심사로 결정돼요.</p>
    </main>
  );
}
