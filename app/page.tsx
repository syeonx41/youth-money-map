// ③ 담당: 첫 화면 (와이어프레임 ① 첫 화면)
import Link from "next/link";
import { products } from "@/lib/data";
import { latestAsOf, toDotDate } from "@/lib/home/data-as-of";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/result/result-view";
import type { JudgeStatus } from "@/types";
import { CategoryButtons, StartButton } from "./home-buttons";
import { ExternalIcon, LockIcon, PinIcon, UserIcon } from "./ui/icons";
import { KoreaSilhouette } from "./ui/korea-map";
import { STATUS_DOT, STATUS_ICON } from "./ui/status";

const NOTICES = [
  { Icon: UserIcon, text: "로그인 없이 바로 이용" },
  { Icon: LockIcon, text: "입력 정보는 저장하지 않아요" },
  { Icon: ExternalIcon, text: "신청은 공식 신청처에서 진행" },
];

/** 판정 결과가 무슨 뜻인지 (README 판정 규칙) */
const STATUS_MEANING: Record<JudgeStatus, string> = {
  eligible: "입력한 조건을 모두 충족해요",
  needsCheck: "'모름'으로 둔 조건이 있어요",
  ineligible: "충족하지 않는 조건이 있어요",
};

export default function HomePage() {
  const asOf = latestAsOf(products);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-1.5 px-5 py-4 text-go-deep">
        <PinIcon size={22} strokeWidth={2} />
        <p className="text-lg font-bold tracking-tight text-ink">청년머니맵</p>
      </header>

      <main className="flex flex-col gap-8 pb-8">
        <section className="relative overflow-hidden bg-sea px-5 pt-9 pb-7">
          <KoreaSilhouette className="pointer-events-none absolute -top-2 -right-28 h-[330px] w-auto" />
          <div className="relative flex flex-col gap-4">
            <h1 className="text-[28px] leading-[1.3] font-bold tracking-tight text-ink">
              조건 한 번 입력으로
              <br />
              나에게 맞는 청년
              <br />
              금융상품 찾기
            </h1>
            <p className="max-w-[14.5rem] text-[15px] leading-relaxed text-ink-soft">
              대출, 적금, 청약 상품을 한 화면에서 비교하고 상품별 혜택과 정부지원 내용도 함께 보여드려요.
            </p>
            <StartButton />
          </div>
        </section>

        <section className="flex flex-col gap-3 px-5">
          <h2 className="text-base font-semibold text-ink">상품마다 세 가지로 알려드려요</h2>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            {STATUS_ORDER.map((status) => {
              const Icon = STATUS_ICON[status];
              return (
                <li key={status} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex size-7 items-center justify-center rounded-full ${STATUS_DOT[status]}`}>
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span className="w-[4.5rem] text-sm font-semibold text-ink">{STATUS_LABEL[status]}</span>
                  <span className="text-sm text-ink-soft">{STATUS_MEANING[status]}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3 px-5">
          <h2 className="text-base font-semibold text-ink">관심 있는 상품부터 보기</h2>
          <CategoryButtons />
        </section>

        <ul className="flex flex-col gap-2.5 px-5 text-sm text-ink-soft">
          {NOTICES.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon size={18} className="text-go" />
              {text}
            </li>
          ))}
        </ul>

        <Link href="/dev/judge" className="text-center text-xs text-ink-mute underline">
          (개발용) 판정 API 테스트
        </Link>
      </main>

      <footer className="mt-auto border-t border-line px-5 py-4 text-xs text-ink-mute">
        <p>정보 출처: 각 기관 공식 공고</p>
        {asOf && <p>기준일 {toDotDate(asOf)}</p>}
      </footer>
    </div>
  );
}
