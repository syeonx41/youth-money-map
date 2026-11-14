// ③ 결과 카드 1장. 결과 화면 모델(ResultCard)만 그려요.
// 카드 전체가 상품 상세 화면(④) 링크예요. 어떤 줄을 보여줄지는 모델이 카드 종류별로 정해 둬요.
import Link from "next/link";
import type { ConflictBanner, ResultCard, ResultCardKind } from "@/lib/result/result-view";
import {
  AlertIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  HelpIcon,
  SwapIcon,
  XIcon,
  type IconProps,
} from "../ui/icons";
import { ProductArt } from "../ui/product-art";
import { STATUS_SOLID } from "../ui/status";

const CARD_STYLE: Record<ResultCardKind, string> = {
  eligible: "border-line bg-white",
  eligibleSwitch: "border-line bg-white",
  needsCheck: "border-check-line/70 bg-white",
  ineligible: "border-line bg-stop-soft/60",
  owned: "border-line bg-stop-soft/60",
};

const BADGE_STYLE: Record<ResultCardKind, string> = {
  eligible: STATUS_SOLID.eligible,
  eligibleSwitch: STATUS_SOLID.eligible,
  needsCheck: STATUS_SOLID.needsCheck,
  ineligible: STATUS_SOLID.ineligible,
  owned: "bg-white text-ink-soft ring-1 ring-inset ring-line",
};

const BADGE_ICON: Record<ResultCardKind, ((props: IconProps) => React.ReactNode) | null> = {
  eligible: CheckIcon,
  eligibleSwitch: SwapIcon,
  needsCheck: HelpIcon,
  ineligible: XIcon,
  owned: null,
};

export function ResultCardView({ card }: { card: ResultCard }) {
  const muted = card.kind === "ineligible" || card.kind === "owned";
  const BadgeIcon = BADGE_ICON[card.kind];

  return (
    <li>
      <Link
        href={card.href}
        className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 active:bg-sea ${CARD_STYLE[card.kind]}`}
      >
        <div className="flex items-start gap-3">
          <ProductArt productId={card.productId} category={card.judgement.category} muted={muted} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <span className={`text-base leading-snug font-bold ${muted ? "text-ink-soft" : "text-ink"}`}>
              {card.productName}
            </span>
            {card.product?.provider && <span className="text-xs text-ink-mute">{card.product.provider}</span>}
          </div>
          <span
            className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-full py-1 pr-2.5 pl-2 text-xs font-semibold ${BADGE_STYLE[card.kind]} ${
              BadgeIcon ? "" : "pl-2.5"
            }`}
          >
            {BadgeIcon && <BadgeIcon size={14} strokeWidth={2.25} />}
            {card.badge}
          </span>
        </div>

        {/* 가능: 충족한 조건 */}
        {card.metLabels.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink">
            {card.metLabels.map((label, i) => (
              <li key={i} className="flex items-center gap-1">
                <CheckIcon size={15} strokeWidth={2.5} className="text-go" />
                {label}
              </li>
            ))}
          </ul>
        )}

        {/* 확인 필요: 모른다고 넘긴 조건 */}
        {card.unknownLabels.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-check-soft px-3 py-3">
            <p className="text-[13px] font-semibold text-check">확인이 필요한 조건 {card.unknownLabels.length}개</p>
            <ul className="flex flex-wrap gap-1.5">
              {card.unknownLabels.map((label, i) => (
                <li
                  key={i}
                  className="rounded-full bg-white px-2.5 py-1 text-[13px] font-medium text-ink ring-1 ring-inset ring-check-line"
                >
                  {label}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-check">이 조건을 확인해 입력하면 결과가 확정돼요.</p>
          </div>
        )}

        {/* 해당 없음: 이유 한 줄 */}
        {card.reason && (
          <div className="flex flex-col gap-1.5 text-sm text-ink-soft">
            <p>{card.reason}</p>
            <span className="flex items-center gap-0.5 font-medium text-ink">
              자세한 이유 보기
              <ChevronRightIcon size={16} />
            </span>
          </div>
        )}

        {/* 가능: 혜택 요약 */}
        {card.benefitLines.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
            {card.benefitLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        {card.checkAtApplyCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <ClipboardCheckIcon size={15} />
            신청 시 확인할 조건 {card.checkAtApplyCount}개
          </p>
        )}
      </Link>
    </li>
  );
}

/** 목록 위 경고 띠 (중복 가입·갈아타기) */
export function ConflictBannerView({ banner }: { banner: ConflictBanner }) {
  return (
    <li className="flex items-start gap-2.5 rounded-2xl bg-check-soft px-4 py-3 text-sm leading-relaxed text-ink">
      <AlertIcon size={18} className="mt-0.5 text-check" />
      <div className="flex flex-col gap-1">
        <p>{banner.text}</p>
        {banner.switchHref && (
          <Link href={banner.switchHref} className="flex items-center gap-0.5 font-semibold text-check">
            갈아타기 순서 보기
            <ChevronRightIcon size={16} />
          </Link>
        )}
      </div>
    </li>
  );
}
