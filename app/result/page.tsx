"use client";
// ③ 담당: 결과 화면 (와이어프레임 ③-1 ~ ③-3)
// - 판정 결과는 공유 세션에서 꺼내요. 새로고침하면 사라지니 다시 입력 안내를 보여줘요
// - 화면은 결과 화면 모델(lib/result/result-view)만 그려요
// - 헤더 "일정"은 담당이 정해지지 않아서 숨겨요
import Link from "next/link";
import { useMemo, useState } from "react";
import { products } from "@/lib/data";
import { buildResultView, filterCards, initialTab, toggleFilter } from "@/lib/result/result-view";
import { useJudgeSession } from "@/lib/session/judge-session";
import type { JudgeStatus, ProductCategory } from "@/types";
import { ResultCardView } from "./result-card";

const CHIP_STYLE: Record<JudgeStatus, string> = {
  eligible: "border border-gray-800",
  needsCheck: "border border-dashed border-gray-600",
  ineligible: "border border-gray-300 text-gray-600",
};

export default function ResultPage() {
  const { input, result, preferredTab } = useJudgeSession();
  const [tabId, setTabId] = useState<ProductCategory>(() => initialTab(preferredTab));
  const [filter, setFilter] = useState<JudgeStatus | null>(null);

  const view = useMemo(() => (result ? buildResultView(result, input, products) : null), [result, input]);

  if (!view) {
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

  const tab = view.tabs.find((t) => t.id === tabId) ?? view.tabs[0];
  const cards = filterCards(tab, filter);

  function selectTab(id: ProductCategory) {
    setTabId(id);
    setFilter(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 px-5 py-4">
        {/* 입력값이 남은 입력 화면 1단계로 가요. 다시 "결과 보기"를 누르면 새로 판정해요 */}
        <Link href="/input?step=1" className="text-sm text-gray-700">
          ← 조건 수정
        </Link>
        <h1 className="text-lg font-bold">조회 결과</h1>
        <span />
      </header>

      {view.summary.length > 0 && (
        <p className="bg-gray-100 px-5 py-3 text-sm text-gray-700">{view.summary.join(" · ")}</p>
      )}

      <nav className="grid grid-cols-3 border-b border-gray-200" role="tablist">
        {view.tabs.map((t) => {
          const active = t.id === tab.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              className={`py-3 text-base ${
                active ? "border-b-2 border-gray-900 font-bold text-gray-900" : "text-gray-500"
              }`}
            >
              {t.label} ({t.count})
            </button>
          );
        })}
      </nav>

      <main className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {tab.chips.map((chip) => {
            const active = filter === chip.status;
            return (
              <button
                key={chip.status}
                type="button"
                aria-pressed={active}
                disabled={chip.disabled}
                onClick={() => setFilter((current) => toggleFilter(current, chip.status))}
                className={`rounded-full px-3 py-1 text-sm ${CHIP_STYLE[chip.status]} ${
                  active ? "bg-gray-800 text-white" : ""
                } disabled:opacity-40`}
              >
                {chip.label} {chip.count}
              </button>
            );
          })}
        </div>

        {/* 04: 경고 띠(중복 가입·갈아타기) 자리 */}

        {cards.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <ResultCardView key={card.productId} card={card} />
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">이 탭에 보여줄 상품이 없어요.</p>
        )}

        <p className="mt-4 text-xs text-gray-500">판정은 참고용이고, 최종 자격은 신청처 심사로 결정돼요.</p>
      </main>
    </div>
  );
}
