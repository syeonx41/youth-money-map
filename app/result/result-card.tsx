// ③ 결과 카드 1장. 결과 화면 모델(ResultCard)만 그려요.
// 카드 전체가 상품 상세 화면(④) 링크예요. 어떤 줄을 보여줄지는 모델이 카드 종류별로 정해 둬요.
import Link from "next/link";
import type { ConflictBanner, ResultCard, ResultCardKind } from "@/lib/result/result-view";

const ELIGIBLE_CARD = "border-2 border-gray-800 bg-white";
const ELIGIBLE_BADGE = "bg-gray-800 text-white";

const CARD_STYLE: Record<ResultCardKind, string> = {
  eligible: ELIGIBLE_CARD,
  eligibleSwitch: ELIGIBLE_CARD,
  needsCheck: "border-2 border-dashed border-gray-500 bg-white",
  ineligible: "border border-gray-300 bg-gray-50 text-gray-500",
  owned: "border border-gray-300 bg-gray-100 text-gray-600",
};

const BADGE_STYLE: Record<ResultCardKind, string> = {
  eligible: ELIGIBLE_BADGE,
  eligibleSwitch: ELIGIBLE_BADGE,
  needsCheck: "border border-dashed border-gray-600 text-gray-800",
  ineligible: "border border-gray-400 text-gray-500",
  owned: "border border-gray-400 text-gray-600",
};

export function ResultCardView({ card }: { card: ResultCard }) {
  return (
    <li>
      <Link href={card.href} className={`flex flex-col gap-2 rounded-xl px-4 py-4 ${CARD_STYLE[card.kind]}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-base font-bold">{card.productName}</span>
          <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${BADGE_STYLE[card.kind]}`}>
            {card.badge}
          </span>
        </div>

        {card.metLabels.length > 0 && (
          <p className="text-sm text-gray-800">{card.metLabels.map((l) => `✔ ${l}`).join(" · ")}</p>
        )}

        {card.unknownLabels.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-sm text-gray-800">
            {card.unknownLabels.map((l, i) => (
              <li key={i}>? {l} → 모름</li>
            ))}
          </ul>
        )}

        {card.reason && (
          <p className="text-sm">
            ✖ {card.reason} · <span className="whitespace-nowrap underline">왜 안 되는지 보기 →</span>
          </p>
        )}

        {card.benefitLines.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-sm text-gray-600">
            {card.benefitLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        {card.checkAtApplyCount > 0 && (
          <p className="text-xs text-gray-500">ⓘ 신청할 때 확인할 조건 {card.checkAtApplyCount}개</p>
        )}
      </Link>
    </li>
  );
}

/** 목록 위 경고 띠 (중복 가입·갈아타기) */
export function ConflictBannerView({ banner }: { banner: ConflictBanner }) {
  return (
    <li className="rounded-xl border border-gray-400 bg-amber-50 px-4 py-3 text-sm text-gray-800">
      ⚠ {banner.text}
      {banner.switchHref && (
        <>
          {" "}
          <Link href={banner.switchHref} className="whitespace-nowrap underline">
            갈아타기 순서 보기 →
          </Link>
        </>
      )}
    </li>
  );
}
