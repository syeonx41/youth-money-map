"use client";
// ③ 담당: 결과 화면 (와이어프레임 ③-1 ~ ③-3)
// - 판정 결과는 공유 세션에서 꺼내요. 새로고침하면 사라지니 다시 입력 안내를 보여줘요
// - 화면은 결과 화면 모델(lib/result/result-view)만 그려요
// - 헤더 "일정"은 담당이 정해지지 않아서 숨겨요
import Link from "next/link";
import { useMemo, useState } from "react";
import { products } from "@/lib/data";
import {
  CHAT_HREF,
  buildResultView,
  filterCards,
  initialTab,
  toggleFilter,
  visibleWarnings,
} from "@/lib/result/result-view";
import { useJudgeSession } from "@/lib/session/judge-session";
import type { JudgeStatus, ProductCategory } from "@/types";
import { ChatIcon, ChevronLeftIcon, InfoIcon, SlidersIcon } from "../ui/icons";
import { CATEGORY_ICON } from "../ui/product-art";
import { STATUS_ICON } from "../ui/status";
import { ConflictBannerView, ResultCardView } from "./result-card";

/** 고르지 않은 칩 */
const CHIP_IDLE = "bg-white text-ink ring-1 ring-inset ring-line";

/** 아이콘 색 (고르지 않은 칩) */
const CHIP_ICON: Record<JudgeStatus, string> = {
  eligible: "text-go",
  needsCheck: "text-check",
  ineligible: "text-stop",
};

/** 고른 칩 */
const CHIP_ACTIVE: Record<JudgeStatus, string> = {
  eligible: "bg-go text-white",
  needsCheck: "bg-check text-white",
  ineligible: "bg-stop text-white",
};

export default function ResultPage() {
  const { input, result, preferredTab } = useJudgeSession();
  const [tabId, setTabId] = useState<ProductCategory>(() => initialTab(preferredTab));
  const [filter, setFilter] = useState<JudgeStatus | null>(null);

  const view = useMemo(() => (result ? buildResultView(result, input, products) : null), [result, input]);

  if (!view) {
    return (
      <main className="flex flex-col items-center gap-4 px-5 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-sea text-ink-mute">
          <SlidersIcon size={26} />
        </span>
        <h1 className="text-xl font-bold text-ink">조회 결과가 없어요</h1>
        <p className="text-sm text-ink-soft">입력한 정보는 저장하지 않아요. 다시 입력해 주세요.</p>
        <Link
          href="/input"
          className="mt-2 flex h-13 items-center rounded-2xl bg-go px-7 font-semibold text-white active:bg-go-deep"
        >
          조건 입력하기
        </Link>
      </main>
    );
  }

  const tab = view.tabs.find((t) => t.id === tabId) ?? view.tabs[0];
  const cards = filterCards(tab, filter);
  const warnings = visibleWarnings(tab, filter);

  function selectTab(id: ProductCategory) {
    setTabId(id);
    setFilter(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-3 pb-1">
        {/* 입력값이 남은 입력 화면 1단계로 가요. 다시 "결과 보기"를 누르면 새로 판정해요 */}
        <Link
          href="/input?step=1"
          className="flex h-10 items-center gap-0.5 justify-self-start rounded-lg pr-2 text-sm text-ink-soft"
        >
          <ChevronLeftIcon size={20} />
          조건 수정
        </Link>
        <h1 className="text-base font-semibold text-ink">조회 결과</h1>
        <span />
      </header>

      {view.summary.length > 0 && (
        <section className="mx-5 mt-3 flex flex-col gap-2 rounded-2xl bg-sea px-4 py-3">
          <h2 className="text-xs font-semibold text-ink-mute">입력한 조건</h2>
          <ul className="flex flex-wrap gap-1.5">
            {view.summary.map((item) => (
              <li key={item} className="rounded-full bg-white px-2.5 py-1 text-[13px] text-ink">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-4 grid grid-cols-3 border-b border-line px-5" role="tablist">
        {view.tabs.map((t) => {
          const active = t.id === tab.id;
          const Icon = CATEGORY_ICON[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              className={`-mb-px flex items-center justify-center gap-1.5 border-b-2 py-3 text-[15px] ${
                active ? "border-go font-bold text-ink" : "border-transparent text-ink-mute"
              }`}
            >
              <Icon size={18} className={active ? "text-go" : ""} />
              {t.label}
              <span className={`text-[13px] font-semibold ${active ? "text-go" : ""}`}>{t.count}</span>
            </button>
          );
        })}
      </nav>

      <main className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-28">
        <div className="flex flex-wrap gap-2">
          {tab.chips.map((chip) => {
            const active = filter === chip.status;
            const Icon = STATUS_ICON[chip.status];
            return (
              <button
                key={chip.status}
                type="button"
                aria-pressed={active}
                disabled={chip.disabled}
                onClick={() => setFilter((current) => toggleFilter(current, chip.status))}
                className={`flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  active ? CHIP_ACTIVE[chip.status] : CHIP_IDLE
                }`}
              >
                <Icon size={16} strokeWidth={2.25} className={active ? "" : CHIP_ICON[chip.status]} />
                {chip.label}
                <span className="font-semibold">{chip.count}</span>
              </button>
            );
          })}
        </div>

        {warnings.length > 0 && (
          <ul className="flex flex-col gap-2">
            {warnings.map((banner) => (
              <ConflictBannerView key={`${banner.productId}-${banner.text}`} banner={banner} />
            ))}
          </ul>
        )}

        {cards.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <ResultCardView key={card.productId} card={card} />
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-ink-mute">이 탭에 보여줄 상품이 없어요.</p>
        )}

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-mute">
          <InfoIcon size={15} className="mt-px" />
          판정은 참고용이에요. 최종 자격은 각 신청처 심사로 결정돼요.
        </p>
      </main>

      {/* 떠 있는 버튼: 화면 폭(430px) 안 오른쪽 아래에 고정 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] justify-end px-5 pb-5">
        <Link
          href={CHAT_HREF}
          className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-ink pr-6 pl-5 font-semibold text-white shadow-[0_6px_20px_rgb(20_38_31/0.28)]"
        >
          <ChatIcon size={20} />
          AI에게 물어보기
        </Link>
      </div>
    </div>
  );
}
