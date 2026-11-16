// ④ 상품 상세 화면 본문 (와이어프레임 화면 11 가능 / 12 가능·전환 필요 / 13 해당 없음)
// - product: 상품 정보 (② data/products.json)
// - judgement: 판정 결과 (③ 공유 세션에서 꺼내요). 없으면 상품 정보와 조건 원문만 보여줘요
// - otherResults: 전체 판정 결과. '해당 없음'일 때 같은 분야의 '가능' 상품을 대신 보여줘요
// 색·아이콘·상품 그림은 ③의 app/ui 를 같이 써요
import Link from "next/link";
import { conflictText } from "@/lib/result/result-view";
import type {
  CheckAtApplyCondition,
  ConditionResult,
  ConflictWarning,
  JudgeStatus,
  Product,
  ProductCategory,
  ProductJudgement,
} from "@/types";
import {
  AlertIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ExternalIcon,
  HelpIcon,
  InfoIcon,
  SwapIcon,
  WalletIcon,
  XIcon,
  type IconProps,
} from "../../ui/icons";
import { ProductArt } from "../../ui/product-art";
import { STATUS_DOT, STATUS_ICON, STATUS_SOLID } from "../../ui/status";
import { summarizeSchedules, type ScheduleView } from "./schedule";

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  loan: "대출",
  saving: "적금",
  housing: "청약·주거",
};

const STATUS_LABEL: Record<JudgeStatus, string> = {
  eligible: "가능",
  needsCheck: "확인 필요",
  ineligible: "해당 없음",
};

/** 조건 1개 표시: 충족 / 미충족 / 모름 */
const CONDITION_VIEW: Record<"met" | "unmet" | "unknown", { label: string; status: JudgeStatus }> = {
  met: { label: "충족", status: "eligible" },
  unmet: { label: "미충족", status: "ineligible" },
  unknown: { label: "확인 필요", status: "needsCheck" },
};

const CONDITIONS_TITLE: Record<JudgeStatus, string> = {
  eligible: "왜 가능한가요?",
  needsCheck: "확인이 필요한 조건이 있어요",
  ineligible: "왜 안 되나요?",
};

export function chatHref(productId: string): string {
  return `/chat?productId=${encodeURIComponent(productId)}`;
}

interface Props {
  product: Product;
  judgement?: ProductJudgement | null;
  otherResults?: ProductJudgement[];
  /** 오늘 날짜 YYYY-MM-DD (한국 시간) */
  today: string;
  /** 다른 상품 상세로 가는 링크 (미리보기에서 바꿔 써요) */
  productHref?: (productId: string) => string;
  /** 판정 결과가 없을 때 안내 (새로고침 등). 없으면 기본 문구 */
  noJudgementNote?: string;
}

export default function ProductDetail({
  product,
  judgement,
  otherResults,
  today,
  productHref = (pid) => `/products/${encodeURIComponent(pid)}`,
  noJudgementNote,
}: Props) {
  const checkAtApply = product.conditions.filter((c): c is CheckAtApplyCondition => c.type === "checkAtApply");
  const judged = judgement?.conditions.filter((c) => c.status !== "checkAtApply") ?? [];
  const alternatives =
    judgement && judgement.status !== "eligible" && !judgement.owned && otherResults
      ? otherResults.filter(
          (r) => r.productId !== product.id && r.category === product.category && r.status === "eligible" && !r.owned,
        )
      : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-3 pb-1">
        <Link href="/result" className="flex h-10 items-center gap-0.5 justify-self-start rounded-lg pr-2 text-sm text-ink-soft">
          <ChevronLeftIcon size={20} />
          결과
        </Link>
        <h1 className="text-base font-semibold text-ink">상품 상세</h1>
        <span />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pt-3 pb-8">
        <TitleBlock product={product} judgement={judgement} />

        {product.newSignupClosed && (
          <Notice tone="stop" icon={InfoIcon} title="신규 가입이 끝난 상품이에요">
            {product.signupClosedNote ?? "지금은 새로 가입할 수 없어요."} 이미 가입한 분은 계속 이용할 수 있어요.
          </Notice>
        )}

        {judgement?.conflicts.map((c) => (
          <ConflictBlock key={c.conflictingProductId} productName={product.name} conflict={c} />
        ))}

        {judgement ? (
          <Section title={judgement.signupClosed ? "가입 조건" : CONDITIONS_TITLE[judgement.status]}>
            <ul className="flex flex-col gap-3.5">
              {judged.map((c) => (
                <JudgedCondition key={c.conditionId} result={c} />
              ))}
            </ul>
          </Section>
        ) : (
          <NoJudgement product={product} note={noJudgementNote} />
        )}

        {checkAtApply.length > 0 && (
          <Section title="신청할 때 확인돼요" icon={ClipboardCheckIcon}>
            <p className="-mt-1 text-sm text-ink-soft">입력받지 않은 조건이라 판정에는 넣지 않았어요. 신청처 심사에서 확인해요.</p>
            <ul className="mt-3 flex flex-col gap-3">
              {checkAtApply.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="text-ink">
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-ink-soft"> · {c.description}</span>
                  </p>
                  <SourceText text={c.sourceText} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <BenefitsBlock product={product} />

        <ScheduleBlock product={product} today={today} />

        {alternatives.length > 0 && (
          <Section title="대신 이 상품은 어때요?">
            <ul className="flex flex-col gap-2">
              {alternatives.map((a) => (
                <li key={a.productId}>
                  <Link
                    href={productHref(a.productId)}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-3 py-2 active:bg-sea"
                  >
                    <ProductArt productId={a.productId} category={a.category} />
                    <span className="flex-1 font-semibold text-ink">{a.productName}</span>
                    <StatusBadge status="eligible" />
                    <ChevronRightIcon size={18} className="text-ink-mute" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="flex flex-col gap-1.5 pt-2 text-xs leading-relaxed text-ink-mute">
          <p>
            출처:{" "}
            <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {product.provider} 공고 원문
            </a>{" "}
            · 정보 기준일 {product.asOf}
          </p>
          <p className="flex items-start gap-1.5">
            <InfoIcon size={15} className="mt-px" />
            판정은 참고용이에요. 최종 자격은 신청처 심사로 결정돼요.
          </p>
        </footer>
      </main>

      <nav className="sticky bottom-0 flex gap-2 border-t border-line bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link
          href={chatHref(product.id)}
          className="flex h-13 flex-1 items-center justify-center gap-1.5 rounded-2xl font-semibold text-ink ring-1 ring-inset ring-line active:bg-sea"
        >
          <ChatIcon size={18} />
          AI에게 묻기
        </Link>
        <a
          href={product.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-13 flex-[1.6] items-center justify-center gap-1.5 rounded-2xl bg-go font-semibold text-white active:bg-go-deep"
        >
          {product.newSignupClosed ? "공식 안내 보기" : "공식 신청처로 이동"}
          <ExternalIcon size={17} />
        </a>
      </nav>
    </div>
  );
}

function TitleBlock({ product, judgement }: { product: Product; judgement?: ProductJudgement | null }) {
  const switchNeeded = !!judgement && !judgement.owned && judgement.conflicts.some((c) => c.kind === "owned");
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ProductArt productId={product.id} category={product.category} muted={judgement?.status === "ineligible"} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs text-ink-mute">
            {CATEGORY_LABEL[product.category]} · {product.provider}
          </span>
          <h2 className="text-xl leading-snug font-bold text-ink">{product.name}</h2>
        </div>
        {judgement && (
          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
            {judgement.owned ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line">가입 중</span>
            ) : (
              <StatusBadge status={judgement.status} />
            )}
            {switchNeeded && (
              <span className="flex items-center gap-1 rounded-full bg-check-soft px-2.5 py-1 text-xs font-semibold text-check ring-1 ring-inset ring-check-line">
                <SwapIcon size={13} strokeWidth={2.25} />
                전환 필요
              </span>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-ink-soft">{product.summary}</p>
      {judgement && !judgement.owned && (
        <p className="rounded-xl bg-sea px-3.5 py-2.5 text-sm font-medium text-ink">{judgement.summaryReason}</p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: JudgeStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_SOLID[status]}`}>
      <Icon size={13} strokeWidth={2.5} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: (props: IconProps) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white px-4 py-4">
      <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink">
        {Icon && <Icon size={18} className="text-ink-soft" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Notice({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "check" | "stop";
  icon: (props: IconProps) => React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const color = tone === "check" ? "border-check-line bg-check-soft" : "border-line bg-stop-soft";
  const iconColor = tone === "check" ? "text-check" : "text-stop";
  return (
    <div role="note" className={`flex gap-2.5 rounded-2xl border px-4 py-3.5 text-sm ${color}`}>
      <Icon size={19} className={`mt-px ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-1 text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

function ConflictBlock({ productName, conflict }: { productName: string; conflict: ConflictWarning }) {
  const guide = conflict.switchGuide;
  return (
    <Notice
      tone="check"
      icon={AlertIcon}
      title={conflict.kind === "owned" ? "동시에 가입할 수 없어요" : "가입 중인 상품을 확인해 주세요"}
    >
      <p>{conflictText(productName, conflict)}</p>
      {guide && (
        // 결과 화면의 "갈아타기 순서 보기"로 들어오면 순서가 바로 보이도록 펼쳐 둬요 (접을 수는 있어요)
        <details open className="group mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold text-check">
            {conflict.conflictingProductName}에서 갈아타는 순서
            <ChevronRightIcon size={16} className="transition-transform group-open:rotate-90" />
          </summary>
          <ol className="mt-1 flex flex-col gap-2 text-ink">
            {guide.steps.map((s, i) => (
              <li key={s} className="flex gap-2.5">
                <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-check ring-1 ring-inset ring-check-line">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {guide.warning && (
            <p className="mt-3 flex gap-1.5 rounded-xl bg-bad-soft px-3 py-2.5 font-medium text-bad">
              <XIcon size={17} strokeWidth={2.25} className="mt-px" />
              <span>하지 마세요: {guide.warning}</span>
            </p>
          )}
          {guide.sourceText && <SourceText text={guide.sourceText} />}
        </details>
      )}
    </Notice>
  );
}

function JudgedCondition({ result }: { result: ConditionResult }) {
  const view = CONDITION_VIEW[result.status as keyof typeof CONDITION_VIEW];
  const Icon = result.status === "met" ? CheckIcon : result.status === "unmet" ? XIcon : HelpIcon;
  return (
    <li className="flex gap-2.5 text-sm">
      <span
        role="img"
        aria-label={view.label}
        className={`mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full ${STATUS_DOT[view.status]}`}
      >
        <Icon size={13} strokeWidth={2.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{result.label}</p>
        <p className="text-ink-soft">{result.reason}</p>
        <SourceText text={result.sourceText} />
      </div>
    </li>
  );
}

function SourceText({ text }: { text: string }) {
  return (
    <details className="group mt-1">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-0.5 text-xs text-ink-mute underline underline-offset-2">
        공고 원문 보기
      </summary>
      <blockquote className="mt-1 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-soft">{text}</blockquote>
    </details>
  );
}

function NoJudgement({ product, note }: { product: Product; note?: string }) {
  const conditions = product.conditions.filter((c) => c.type !== "checkAtApply");
  return (
    <Section title="가입 조건">
      <p className="-mt-1 text-sm text-ink-soft">{note ?? "내 조건을 입력하면 조건마다 가능 여부를 알려드려요."}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {conditions.map((c) => (
          <li key={c.id} className="text-sm">
            <p className="font-semibold text-ink">{c.label}</p>
            <SourceText text={c.sourceText} />
          </li>
        ))}
      </ul>
      <Link
        href="/input"
        className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-go font-semibold text-white active:bg-go-deep"
      >
        내 조건으로 확인하기
      </Link>
    </Section>
  );
}

function BenefitsBlock({ product }: { product: Product }) {
  const b = product.benefits;
  const isLoan = product.category === "loan";
  return (
    <Section title="혜택" icon={WalletIcon}>
      <ul className="flex flex-col gap-1.5 text-sm text-ink">
        {b.summary.map((s) => (
          <li key={s} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-go" />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      {(b.baseRate !== undefined || b.maxPreferentialRate !== undefined) && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          {b.baseRate !== undefined && (
            <div className="rounded-xl bg-sea px-3 py-2.5">
              <dt className="text-xs text-ink-mute">{isLoan ? "대출금리" : "기본금리"}</dt>
              <dd className="mt-0.5 font-bold text-ink">연 {b.baseRate}%</dd>
            </div>
          )}
          {b.maxPreferentialRate !== undefined && (
            <div className="rounded-xl bg-sea px-3 py-2.5">
              <dt className="text-xs text-ink-mute">최고 우대</dt>
              <dd className="mt-0.5 font-bold text-go">+{b.maxPreferentialRate}%p</dd>
            </div>
          )}
        </dl>
      )}

      {b.preferentialRates && b.preferentialRates.length > 0 && (
        <SubList title={isLoan ? "금리 우대" : "우대금리"}>
          {b.preferentialRates.map((r) => (
            <li key={r.label}>
              <p className="flex justify-between gap-3">
                <span className="font-medium text-ink">{r.label}</span>
                <span className="shrink-0 font-semibold text-go">
                  {isLoan ? "-" : "+"}
                  {r.rate}%p
                </span>
              </p>
              {r.description && <p className="text-xs text-ink-mute">{r.description}</p>}
            </li>
          ))}
        </SubList>
      )}

      {b.governmentSupports && b.governmentSupports.length > 0 && (
        <SubList title="정부 지원">
          {b.governmentSupports.map((g) => (
            <li key={g.label}>
              <p className="font-medium text-ink">{g.label}</p>
              <p className="text-xs text-ink-mute">{g.description}</p>
            </li>
          ))}
        </SubList>
      )}

      {b.limit && (
        <SubList title="한도·기간">
          <li className="text-ink-soft">{b.limit}</li>
        </SubList>
      )}
    </Section>
  );
}

function SubList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="text-sm font-semibold text-ink-soft">{title}</h3>
      <ul className="mt-2 flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

function ScheduleBlock({ product, today }: { product: Product; today: string }) {
  if (product.newSignupClosed) return null;
  const summary = summarizeSchedules(product.schedules, today);
  return (
    <Section title="신청 일정" icon={CalendarIcon}>
      {summary.kind === "always" && (
        <p className="text-sm text-ink-soft">정해진 모집 기간 없이 신청할 수 있어요. 세부 일정은 신청처에서 확인해 주세요.</p>
      )}
      {summary.kind === "none" && <p className="text-sm font-semibold text-ink">다음 모집 일정은 아직 정해지지 않았어요.</p>}
      {summary.items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2.5 text-sm">
          {summary.items.map((s) => (
            <ScheduleItem key={`${s.label}-${s.start}`} item={s} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function ScheduleItem({ item }: { item: ScheduleView }) {
  const tag =
    item.state === "open"
      ? { text: item.daysLeft === 0 ? "오늘 마감" : `신청 중 · D-${item.daysLeft}`, className: "bg-go text-white" }
      : item.state === "upcoming"
        ? { text: `D-${item.daysLeft}`, className: "bg-check-soft text-check ring-1 ring-inset ring-check-line" }
        : { text: "마감", className: "bg-stop-soft text-stop" };
  return (
    <li className="flex items-center justify-between gap-3">
      <div className={item.state === "ended" ? "text-ink-mute" : "text-ink"}>
        <p className="font-medium">{item.label}</p>
        <p className="text-xs">
          {item.start} ~ {item.end}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tag.className}`}>{tag.text}</span>
    </li>
  );
}
