"use client";
// ③ 담당: 첫 화면 버튼. 고른 탭을 공유 세션에 넣고 입력 화면으로 가요
import Link from "next/link";
import type { ProductCategory } from "@/types";
import { useJudgeSession } from "@/lib/session/judge-session";

const CATEGORY_BUTTONS: { tab: ProductCategory; label: string }[] = [
  { tab: "loan", label: "대출" },
  { tab: "saving", label: "적금" },
  { tab: "housing", label: "청약" },
];

/** "내 조건으로 찾기": 고른 탭을 비우고 입력 1단계로 */
export function StartButton() {
  const { setPreferredTab } = useJudgeSession();
  return (
    <Link
      href="/input"
      onClick={() => setPreferredTab(null)}
      className="flex h-13 items-center justify-center rounded-lg bg-gray-800 font-semibold text-white"
    >
      내 조건으로 찾기
    </Link>
  );
}

/** [대출] [적금] [청약]: 결과 화면에서 그 탭이 먼저 열려요 */
export function CategoryButtons() {
  const { setPreferredTab } = useJudgeSession();
  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORY_BUTTONS.map(({ tab, label }) => (
        <Link
          key={tab}
          href="/input"
          onClick={() => setPreferredTab(tab)}
          className="flex h-16 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
