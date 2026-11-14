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
 */
import { formatManwon, manAge } from "@/lib/engine";
import type {
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
  owned: "가입 중",
  eligible: "가능",
  eligibleSwitch: "가능 · 전환 필요",
  needsCheck: "확인 필요",
  ineligible: "해당 없음",
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
  /** 상품 데이터. 혜택 요약 등(04)에 써요. 데이터에 없으면 null */
  product: Product | null;
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
  /** 정렬된 전체 카드. 칩 필터는 filterCards 로 걸러요 */
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
      return {
        productId: j.productId,
        productName: j.productName,
        kind,
        badge: CARD_BADGE[kind],
        filterStatus: kind === "owned" ? null : j.status,
        judgement: j,
        product: productById.get(j.productId) ?? null,
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

  return { summary: input ? summarizeInput(input, result.judgedAt, products) : [], tabs };
}

/** 칩 필터 적용. filter 가 null 이면 전체(가입 중 카드 포함), 아니면 그 상태 카드만 */
export function filterCards(tab: ResultTab, filter: JudgeStatus | null): ResultCard[] {
  if (filter === null) return tab.cards;
  return tab.cards.filter((c) => c.filterStatus === filter);
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
export function summarizeInput(input: UserInput, today: string, products: Product[]): string[] {
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
      const names = input.ownedProductIds.map((id) => products.find((p) => p.id === id)?.name ?? id);
      parts.push(`가입: ${names.join(", ")}`);
    }
  }

  return parts;
}
