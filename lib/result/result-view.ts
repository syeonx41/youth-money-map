/**
 * ③ 결과 화면 모델: 판정 결과 + 상품 데이터 → 화면에 그릴 모델. 순수 함수만 있어요.
 * 결과 화면(app/result)은 이 모델만 그려요.
 *
 * 규칙 (spec "결과 화면 모델 모듈")
 * - 탭: 대출 · 적금 · 청약·주거. 탭 숫자는 화면에 보이는 카드 수예요 (API counts 아님)
 * - 숨김: 신규 가입이 끝났고(signupClosed) 가입 중이 아닌 상품
 * - 가입 중인 상품은 판정과 상관없이 "가입 중" 카드
 * - 정렬: 가능 → 확인 필요 → 해당 없음, 가입 중 카드는 맨 아래 (같은 상태 안에서는 데이터 순서)
 * - 상태 칩: 탭 안 가능/확인 필요/해당 없음 개수. 개수 0이면 비활성. 가입 중 카드는 세지 않아요
 * - 조건 요약 줄: 만 나이 · 연소득 · 가구 형태 · 주택·세대주 · 가입 상품. 모름(null)은 빼요
 * - 카드 내용: 가능 → 충족 조건(신청 시 확인 조건 제외)·혜택 요약 1~2줄·신청 시 확인 조건 개수
 *             확인 필요 → 모름 조건·신청 시 확인 조건 개수 / 해당 없음 → summaryReason / 가입 중 → 없음
 * - 경고 띠: 가능·확인 필요 카드의 conflicts만 (해당 없음·가입 중 카드는 엔진이 줘도 안 보여줘요).
 *   상태 칩으로 거른 카드의 경고 띠만 보여줘요 (visibleWarnings)
 */
import { formatManwon, manAge } from "@/lib/engine";
import type {
  ConditionStatus,
  ConflictWarning,
  HouseholdType,
  JudgeResponse,
  JudgeStatus,
  Product,
  ProductCategory,
  ProductJudgement,
  UserInput,
} from "@/types";

export const RESULT_TABS: { id: ProductCategory; label: string }[] = [
  { id: "loan", label: "대출" },
  { id: "saving", label: "적금" },
  { id: "housing", label: "청약·주거" },
];

export const STATUS_ORDER: JudgeStatus[] = ["eligible", "needsCheck", "ineligible"];

export const STATUS_LABEL: Record<JudgeStatus, string> = {
  eligible: "가능",
  needsCheck: "확인 필요",
  ineligible: "해당 없음",
};

/**
 * 카드 종류
 * - owned: 가입 중 (회색 카드, 판정 배지 대신 "가입 중")
 * - eligibleSwitch: 가능인데 가입 중인 상품과 동시 가입 불가 → "가능 · 전환 필요"
 */
export type ResultCardKind = "owned" | "eligible" | "eligibleSwitch" | "needsCheck" | "ineligible";

export const CARD_BADGE: Record<ResultCardKind, string> = {
  ...STATUS_LABEL,
  owned: "가입 중",
  eligibleSwitch: `${STATUS_LABEL.eligible} · 전환 필요`,
};

export interface ResultCard {
  productId: string;
  productName: string;
  kind: ResultCardKind;
  /** 카드 배지 문구 */
  badge: string;
  /** 상태 칩 필터에 쓰는 상태. 가입 중 카드는 null (어느 칩에도 안 들어가요) */
  filterStatus: JudgeStatus | null;
  /** 엔진 판정 그대로. 조건·이유·충돌 표시(04)에 써요 */
  judgement: ProductJudgement;
  /** 상품 데이터. 데이터에 없으면 null */
  product: Product | null;
  /** 카드를 누르면 가는 상품 상세 화면(④) */
  href: string;
  /** "✔ 조건" 목록. 가능 카드만, 신청 시 확인 조건은 빼요 */
  metLabels: string[];
  /** "? 조건 → 모름" 목록. 확인 필요 카드만 */
  unknownLabels: string[];
  /** "✖ 이유" 한 줄. 해당 없음 카드만, 아니면 null */
  reason: string | null;
  /** 혜택 요약 최대 2줄 (benefits.summary). 가능 카드만 */
  benefitLines: string[];
  /** "신청 시 확인할 조건 N개". 가능·확인 필요 카드만 세고, 나머지는 0 */
  checkAtApplyCount: number;
  /** 이 카드에서 나온 경고 띠. 가능·확인 필요 카드만 */
  warnings: ConflictBanner[];
}

/** 목록 위 경고 띠 1개 (중복 가입·갈아타기) */
export interface ConflictBanner {
  /** 경고가 붙은 카드의 상품 id */
  productId: string;
  /** owned: 가입 중인 상품과 동시 가입 불가 / unknown: 가입 여부를 몰라서 확인 필요 */
  kind: ConflictWarning["kind"];
  text: string;
  /** 갈아타기 안내가 있으면 "갈아타기 순서 보기 →" 링크(상품 상세), 없으면 null */
  switchHref: string | null;
}

export interface StatusChip {
  status: JudgeStatus;
  label: string;
  count: number;
  /** 개수가 0이면 누를 수 없어요 */
  disabled: boolean;
}

export interface ResultTab {
  id: ProductCategory;
  label: string;
  /** 탭 숫자 = 이 탭에 보이는 카드 수 (가입 중 카드 포함, 숨긴 상품 제외) */
  count: number;
  chips: StatusChip[];
  /** 정렬된 전체 카드. 칩 필터는 filterCards, 경고 띠는 visibleWarnings 로 골라요 */
  cards: ResultCard[];
}

export interface ResultView {
  /** 조건 요약 줄 항목. 화면에서 " · "로 이어 붙여요 */
  summary: string[];
  tabs: ResultTab[];
}

function cardKind(j: ProductJudgement): ResultCardKind {
  if (j.owned) return "owned";
  if (j.status === "eligible") return j.conflicts.some((c) => c.kind === "owned") ? "eligibleSwitch" : "eligible";
  return j.status;
}

/** 상품 상세 화면(④) 주소 */
export function productHref(productId: string): string {
  return `/products/${encodeURIComponent(productId)}`;
}

/** 챗봇 화면(④) 주소 */
export const CHAT_HREF = "/chat";

/** 받침이 있으면 withFinal, 없으면 withoutFinal (한글이 아니면 받침 없음으로 봐요) */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

/**
 * 경고 띠 문구. 엔진 message 와 뜻은 같고, 어느 상품 이야기인지 상품 이름을 앞에 붙여요.
 * (엔진 message 는 조사가 받침과 안 맞을 때가 있어서 화면에서 다시 써요)
 * - owned: 가입 중인 상품과 실제로 동시 가입이 안 돼요
 * - unknown: 가입 여부를 몰라서 "가입 중이라면" 조건부로만 말해요
 */
export function conflictText(productName: string, c: Pick<ConflictWarning, "kind" | "conflictingProductName">): string {
  const other = c.conflictingProductName;
  return c.kind === "owned"
    ? `${josa(productName, "은", "는")} 가입 중인 ${josa(other, "과", "와")} 동시에 가입할 수 없어요.`
    : `${other}에 가입 중이라면 ${josa(productName, "과", "와")} 동시에 가입할 수 없어요. 가입 여부를 확인해 주세요.`;
}

function conflictBanner(productId: string, productName: string, c: ConflictWarning): ConflictBanner {
  const text = conflictText(productName, c);
  return { productId, kind: c.kind, text, switchHref: c.switchGuide ? productHref(productId) : null };
}

type CardContent = Pick<
  ResultCard,
  "metLabels" | "unknownLabels" | "reason" | "benefitLines" | "checkAtApplyCount" | "warnings"
>;

function cardContent(kind: ResultCardKind, j: ProductJudgement, product: Product | null): CardContent {
  const labels = (status: ConditionStatus) => j.conditions.filter((c) => c.status === status).map((c) => c.label);
  const checkAtApplyCount = labels("checkAtApply").length;
  const warnings = j.conflicts.map((c) => conflictBanner(j.productId, j.productName, c));
  const empty: CardContent = {
    metLabels: [],
    unknownLabels: [],
    reason: null,
    benefitLines: [],
    checkAtApplyCount: 0,
    warnings: [],
  };
  switch (kind) {
    case "eligible":
    case "eligibleSwitch":
      return {
        ...empty,
        metLabels: labels("met"),
        benefitLines: product?.benefits.summary.slice(0, 2) ?? [],
        checkAtApplyCount,
        warnings,
      };
    case "needsCheck":
      return { ...empty, unknownLabels: labels("unknown"), checkAtApplyCount, warnings };
    case "ineligible":
      return { ...empty, reason: j.summaryReason };
    case "owned":
      return empty;
  }
}

function sortKey(card: ResultCard): number {
  return card.filterStatus === null ? STATUS_ORDER.length : STATUS_ORDER.indexOf(card.filterStatus);
}

/** 판정 결과를 결과 화면 모델로 바꿔요 */
export function buildResultView(result: JudgeResponse, input: UserInput | null, products: Product[]): ResultView {
  const productById = new Map(products.map((p) => [p.id, p]));

  const cards: ResultCard[] = result.results
    .filter((j) => j.owned || !j.signupClosed)
    .map((j) => {
      const kind = cardKind(j);
      const product = productById.get(j.productId) ?? null;
      return {
        productId: j.productId,
        productName: j.productName,
        kind,
        badge: CARD_BADGE[kind],
        filterStatus: kind === "owned" ? null : j.status,
        judgement: j,
        product,
        href: productHref(j.productId),
        ...cardContent(kind, j, product),
      };
    });

  const tabs = RESULT_TABS.map(({ id, label }) => {
    // Array.prototype.sort 는 안정 정렬이라 같은 상태 안에서는 원래 순서를 지켜요
    const tabCards = cards.filter((c) => c.judgement.category === id).sort((a, b) => sortKey(a) - sortKey(b));
    const chips = STATUS_ORDER.map((status) => {
      const count = tabCards.filter((c) => c.filterStatus === status).length;
      return { status, label: STATUS_LABEL[status], count, disabled: count === 0 };
    });
    return { id, label, count: tabCards.length, chips, cards: tabCards };
  });

  return { summary: input ? summarizeInput(input, result.judgedAt, productById) : [], tabs };
}

/** 칩 필터 적용. filter 가 null 이면 전체(가입 중 카드 포함), 아니면 그 상태 카드만 */
export function filterCards(tab: ResultTab, filter: JudgeStatus | null): ResultCard[] {
  if (filter === null) return tab.cards;
  return tab.cards.filter((c) => c.filterStatus === filter);
}

/** 목록 위 경고 띠: 칩 필터로 보이는 카드의 경고만, 카드 순서대로 */
export function visibleWarnings(tab: ResultTab, filter: JudgeStatus | null): ConflictBanner[] {
  return filterCards(tab, filter).flatMap((c) => c.warnings);
}

/** 칩을 누를 때: 같은 칩을 다시 누르면 해제 */
export function toggleFilter(current: JudgeStatus | null, pressed: JudgeStatus): JudgeStatus | null {
  return current === pressed ? null : pressed;
}

/** 처음 열 탭: 첫 화면에서 고른 탭, 없으면 대출 */
export function initialTab(preferred: ProductCategory | null): ProductCategory {
  return preferred ?? "loan";
}

const HOUSEHOLD_LABEL: Record<HouseholdType, string> = {
  single: "1인 가구",
  withParents: "부모님과 함께",
  married: "기혼·결혼 예정",
};

/** 조건 요약 줄. 모름(null) 항목은 빼요. today 는 만 나이 계산 기준일(판정 기준일) */
export function summarizeInput(
  input: UserInput,
  today: string,
  productById: ReadonlyMap<string, Pick<Product, "name">>,
): string[] {
  const parts: string[] = [];

  const age = input.birthDate ? manAge(input.birthDate, today) : null;
  if (age !== null) parts.push(`만 ${age}세`);

  if (input.annualIncome === 0) parts.push("소득 없음");
  else if (input.annualIncome !== null) parts.push(`연소득 ${formatManwon(input.annualIncome)}`);

  if (input.householdType !== null) parts.push(HOUSEHOLD_LABEL[input.householdType]);

  const house = input.ownsHouse === null ? null : input.ownsHouse ? "주택 보유" : "무주택";
  const head = input.isHouseholdHead === null ? null : input.isHouseholdHead ? "세대주" : "세대원";
  const housing = [house, head].filter((v) => v !== null).join(" ");
  if (housing) parts.push(housing);

  if (input.ownedProductIds !== null) {
    if (input.ownedProductIds.length === 0) parts.push("가입 상품 없음");
    else {
      const names = input.ownedProductIds.map((id) => productById.get(id)?.name ?? id);
      parts.push(`가입: ${names.join(", ")}`);
    }
  }

  return parts;
}
