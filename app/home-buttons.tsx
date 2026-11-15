"use client";
// ③ 담당: 첫 화면 버튼. 이전 입력·결과를 비우고(처음부터 시작) 입력 화면으로 가요
import Link from "next/link";
import type { ProductCategory } from "@/types";
import { RESULT_TABS } from "@/lib/result/result-view";
import { useJudgeSession } from "@/lib/session/judge-session";
import { ChevronRightIcon } from "./ui/icons";
import { CATEGORY_ICON } from "./ui/product-art";

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
      className="mt-2 flex h-14 items-center justify-between rounded-2xl bg-go pr-4 pl-6 text-[17px] font-semibold text-white active:bg-go-deep"
    >
      내 조건으로 찾기
      <ChevronRightIcon size={22} strokeWidth={2} />
    </Link>
  );
}

/** [대출] [적금] [청약]: 세션을 비우고, 결과 화면에서 그 탭이 먼저 열려요 */
export function CategoryButtons() {
  const { resetSession } = useJudgeSession();
  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORY_BUTTONS.map(({ tab, label }) => {
        const Icon = CATEGORY_ICON[tab];
        return (
          <Link
            key={tab}
            href="/input"
            onClick={() => resetSession(tab)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white px-4 py-4 text-[15px] font-semibold text-ink active:bg-sea"
          >
            <Icon size={24} className="text-go" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
