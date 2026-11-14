"use client";
// ③ 담당: 첫 화면 버튼. 이전 입력·결과를 비우고(처음부터 시작) 입력 화면으로 가요
import Link from "next/link";
import type { ProductCategory } from "@/types";
import { RESULT_TABS } from "@/lib/result/result-view";
import { useJudgeSession } from "@/lib/session/judge-session";

/** 첫 화면에서는 "청약·주거" 탭을 "청약"으로 짧게 보여줘요 */
const HOME_LABEL: Partial<Record<ProductCategory, string>> = { housing: "청약" };

const CATEGORY_BUTTONS = RESULT_TABS.map(({ id, label }) => ({ tab: id, label: HOME_LABEL[id] ?? label }));

/** "내 조건으로 찾기": 세션을 비우고(고른 탭 없음) 입력 1단계로 */
export function StartButton() {
  const { resetSession } = useJudgeSession();
  return (
    <Link
      href="/input"
      onClick={() => resetSession(null)}
      className="flex h-13 items-center justify-center rounded-lg bg-gray-800 font-semibold text-white"
    >
      내 조건으로 찾기
    </Link>
  );
}

/** [대출] [적금] [청약]: 세션을 비우고, 결과 화면에서 그 탭이 먼저 열려요 */
export function CategoryButtons() {
  const { resetSession } = useJudgeSession();
  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORY_BUTTONS.map(({ tab, label }) => (
        <Link
          key={tab}
          href="/input"
          onClick={() => resetSession(tab)}
          className="flex h-16 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
