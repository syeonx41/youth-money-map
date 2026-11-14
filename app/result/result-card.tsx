// ③ 결과 카드 1장. 결과 화면 모델(ResultCard)만 그려요.
// 지금은 상품명 + 배지만 있어요. 조건(✔ ? ✖)·혜택 요약·신청 시 확인 조건 개수·상세 링크는 04에서 이 아래에 붙여요.
import type { ResultCard, ResultCardKind } from "@/lib/result/result-view";

const CARD_STYLE: Record<ResultCardKind, string> = {
  eligible: "border-2 border-gray-800 bg-white",
  eligibleSwitch: "border-2 border-gray-800 bg-white",
  needsCheck: "border-2 border-dashed border-gray-500 bg-white",
  ineligible: "border border-gray-300 bg-gray-50 text-gray-500",
  owned: "border border-gray-300 bg-gray-100 text-gray-600",
};

const BADGE_STYLE: Record<ResultCardKind, string> = {
  eligible: "bg-gray-800 text-white",
  eligibleSwitch: "bg-gray-800 text-white",
  needsCheck: "border border-dashed border-gray-600 text-gray-800",
  ineligible: "border border-gray-400 text-gray-500",
  owned: "border border-gray-400 text-gray-600",
};

export function ResultCardView({ card }: { card: ResultCard }) {
  return (
    <li className={`flex flex-col gap-2 rounded-xl px-4 py-4 ${CARD_STYLE[card.kind]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-base font-bold">{card.productName}</span>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${BADGE_STYLE[card.kind]}`}>
          {card.badge}
        </span>
      </div>
      {/* 04: 카드 내용(조건·혜택·신청 시 확인 조건) 자리 */}
    </li>
  );
}
