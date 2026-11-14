/**
 * ③ 입력 화면 선택값(draft) → 판정 입력(UserInput) 변환. 순수 함수만 있어요.
 *
 * 규칙 (spec "Implementation Decisions")
 * - 고르지 않은 항목(null·빈칸)과 '모름'("unknown") → null
 * - 생년월일만 필수: 8자리 숫자, 실제 있는 날짜, 오늘(한국 시간) 이전
 * - 쉼표·공백은 지우고 숫자로 바꿔요. 소득 없음 → 0
 * - 1인 가구 → 가구원 수 1, 가구소득 = 본인 연소득
 * - 가구원 수·가구소득: '모름'을 고르면 입력값과 상관없이 null
 * - 병역: 해당 없음 → 0, 다녀왔어요 + 개월 수 → 숫자, 개월 수 빈칸 → null
 * - 가입 상품: 체크한 상품 → id 목록, "없어요" → [], "잘 모르겠어요"·안 고름 → null
 * - 주거래 은행(mainBank)은 보내지 않아요
 */
import { todayInSeoul } from "@/lib/engine";
import type { EmploymentType, HouseholdType, Region, ResidenceType, UserInput } from "@/types";

/** 선택지에서 '모름'을 고른 값 */
export type UnknownChoice = "unknown";

/** 입력 화면 5단계의 선택값. null 은 아직 고르지 않음이에요 */
export interface InputDraft {
  /* 1단계 나이 */
  /** 생년월일 8자리 입력 그대로. 예: "19990315" */
  birthDigits: string;
  region: Region | UnknownChoice | null;
  /** 병역: 해당 없음 / 다녀왔어요 / 모름 */
  military: "none" | "served" | UnknownChoice | null;
  /** 다녀왔어요일 때 개월 수 입력 그대로 */
  militaryMonthsText: string;

  /* 2단계 소득 */
  /** 연소득(만원) 입력 그대로. 쉼표 허용 */
  incomeText: string;
  /** "소득 없음"(0) / "모름". 고르면 incomeText 보다 우선해요 */
  incomeChoice: "none" | UnknownChoice | null;
  employment: EmploymentType | UnknownChoice | null;

  /* 3단계 가구 */
  householdType: HouseholdType | UnknownChoice | null;
  /** 가구원 수(본인 포함) 입력 그대로. 1인 가구면 안 써요 */
  householdSizeText: string;
  /** 가구 전체 연소득(만원) 입력 그대로. 1인 가구면 안 써요 */
  householdIncomeText: string;
  /** 가구원 수 '모름'. 고르면 householdSizeText 보다 우선해요 */
  householdSizeChoice: UnknownChoice | null;
  /** 가구 연소득 '모름'. 고르면 householdIncomeText 보다 우선해요 */
  householdIncomeChoice: UnknownChoice | null;

  /* 4단계 주택 */
  ownsHouse: "yes" | "no" | UnknownChoice | null;
  isHouseholdHead: "yes" | "no" | UnknownChoice | null;
  residence: ResidenceType | UnknownChoice | null;

  /* 5단계 가입 중인 상품 */
  /** 체크한 상품 id */
  ownedProductIds: string[];
  /** "없어요"([]) / "잘 모르겠어요"(null). 상품을 체크하면 무시해요 */
  ownedChoice: "none" | UnknownChoice | null;
}

/** 아무것도 고르지 않은 처음 상태 */
export const EMPTY_DRAFT: InputDraft = {
  birthDigits: "",
  region: null,
  military: null,
  militaryMonthsText: "",
  incomeText: "",
  incomeChoice: null,
  employment: null,
  householdType: null,
  householdSizeText: "",
  householdIncomeText: "",
  householdSizeChoice: null,
  householdIncomeChoice: null,
  ownsHouse: null,
  isHouseholdHead: null,
  residence: null,
  ownedProductIds: [],
  ownedChoice: null,
};

/* ------------------------------------------------------------------ */
/* 화면 선택지. 입력 화면과 테스트(정답 프로필 입력 가능 여부)가 함께 써요 */
/* ------------------------------------------------------------------ */

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** 사는 지역: 17개 시·도 짧은 이름 (엔진·상품 데이터와 같은 값) */
export const REGION_OPTIONS: readonly Region[] = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

export const EMPLOYMENT_OPTIONS: readonly ChoiceOption<EmploymentType>[] = [
  { value: "employee", label: "직장인" },
  { value: "smeEmployee", label: "중소기업 재직" },
  { value: "selfEmployed", label: "자영업" },
  { value: "student", label: "학생·취준생" },
  { value: "other", label: "기타" },
];

export const HOUSEHOLD_OPTIONS: readonly ChoiceOption<HouseholdType>[] = [
  { value: "single", label: "혼자 살아요 (1인 가구)" },
  { value: "withParents", label: "부모님과 함께 살아요" },
  { value: "married", label: "결혼했어요 / 결혼 예정이에요" },
];

export const RESIDENCE_OPTIONS: readonly ChoiceOption<ResidenceType>[] = [
  { value: "monthlyRent", label: "월세" },
  { value: "jeonse", label: "전세 (예정 포함)" },
  { value: "parents", label: "부모님 집" },
  { value: "other", label: "기타" },
];

/** 입력 단계. 단계마다 확인하는 입력 칸이에요. 단계 번호는 배열 순서(1부터)예요 */
export const INPUT_STEPS = [
  { name: "나이", fields: ["birthDigits", "region", "military", "militaryMonthsText"] },
  { name: "소득", fields: ["incomeText", "incomeChoice", "employment"] },
  {
    name: "가구",
    fields: ["householdType", "householdSizeText", "householdIncomeText", "householdSizeChoice", "householdIncomeChoice"],
  },
  { name: "주택", fields: ["ownsHouse", "isHouseholdHead", "residence"] },
  { name: "가입 중인 상품", fields: ["ownedProductIds", "ownedChoice"] },
] as const satisfies readonly { name: string; fields: readonly (keyof InputDraft)[] }[];

export const STEP_COUNT = INPUT_STEPS.length;

/** URL 의 step 값 → 1~STEP_COUNT. 이상한 값이면 1 */
export function parseStep(value: string | null | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const step = Number(value);
  return step >= 1 && step <= STEP_COUNT ? step : 1;
}

/** 오류가 있는 첫 단계 번호. 오류가 없으면 null */
export function firstStepWithErrors(errors: DraftErrors): number | null {
  for (let step = 1; step <= STEP_COUNT; step += 1) {
    if (Object.keys(errorsForStep(errors, step)).length > 0) return step;
  }
  return null;
}

/** 오류 중 이 단계 입력 칸에 해당하는 것만 */
export function errorsForStep(errors: DraftErrors, step: number): DraftErrors {
  const fields: readonly (keyof InputDraft)[] = INPUT_STEPS[step - 1]?.fields ?? [];
  const picked: DraftErrors = {};
  for (const field of fields) if (errors[field]) picked[field] = errors[field];
  return picked;
}

/** 5단계: 상품 체크를 켜고 끄기. 체크하면 "없어요"·"잘 모르겠어요" 선택이 풀려요 */
export function toggleOwnedProduct(draft: InputDraft, productId: string): Partial<InputDraft> {
  const checked = draft.ownedProductIds.includes(productId);
  return {
    ownedProductIds: checked
      ? draft.ownedProductIds.filter((id) => id !== productId)
      : [...draft.ownedProductIds, productId],
    ownedChoice: null,
  };
}

/** 5단계: "없어요"·"잘 모르겠어요" 고르기. 고르면 상품 체크가 모두 풀려요. 같은 걸 다시 누르면 선택 해제 */
export function chooseOwned(draft: InputDraft, choice: "none" | UnknownChoice): Partial<InputDraft> {
  return { ownedProductIds: [], ownedChoice: draft.ownedChoice === choice ? null : choice };
}

/** 입력 칸별 오류 문구 */
export type DraftErrors = Partial<Record<keyof InputDraft, string>>;

export type DraftConversion = { ok: true; input: UserInput } | { ok: false; errors: DraftErrors };

/**
 * 생년월일 8자리 → "YYYY-MM-DD". 형식이 틀리거나 없는 날짜, 오늘보다 뒤 날짜면 오류 문구
 * @param today 기준일 "YYYY-MM-DD". 테스트에서 날짜를 고정할 때 넘겨요. 기본은 오늘(한국 시간)
 */
export function parseBirthDigits(
  digits: string,
  today: string = todayInSeoul(),
): { ok: true; date: string } | { ok: false; error: string } {
  const value = digits.replace(/[\s.\-/]/g, "");
  if (value === "") return { ok: false, error: "생년월일을 입력해 주세요" };
  if (!/^\d{8}$/.test(value)) return { ok: false, error: "생년월일 8자리를 숫자로 입력해 주세요 (예: 19990315)" };

  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (y < 1900 || !real) return { ok: false, error: "없는 날짜예요. 생년월일을 다시 확인해 주세요" };

  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  // YYYY-MM-DD 는 문자열 비교가 날짜 비교와 같아요
  if (iso > today) return { ok: false, error: "아직 태어나지 않은 날짜예요" };

  return { ok: true, date: iso };
}

/** 숫자 입력 칸: 빈칸 → null, 쉼표·공백 제거 후 0 이상 정수, 그 외 "invalid" */
export function parseCount(text: string): number | null | "invalid" {
  const value = text.replace(/[\s,]/g, "");
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid";
  return Number(value);
}

function known<T extends string>(choice: T | UnknownChoice | null): T | null {
  return choice === null || choice === "unknown" ? null : choice;
}

function yesNo(choice: "yes" | "no" | UnknownChoice | null): boolean | null {
  if (choice === "yes") return true;
  if (choice === "no") return false;
  return null;
}

/**
 * 입력 화면 선택값을 판정 입력값으로 바꿔요
 * @param today 생년월일 확인 기준일. 기본은 오늘(한국 시간)
 */
export function draftToUserInput(draft: InputDraft, today: string = todayInSeoul()): DraftConversion {
  const errors: DraftErrors = {};

  const birth = parseBirthDigits(draft.birthDigits, today);
  if (!birth.ok) errors.birthDigits = birth.error;

  let militaryMonths: number | null = null;
  if (draft.military === "none") militaryMonths = 0;
  if (draft.military === "served") {
    const months = parseCount(draft.militaryMonthsText);
    if (months === "invalid") errors.militaryMonthsText = "개월 수를 숫자로 입력해 주세요";
    else militaryMonths = months;
  }

  let annualIncome: number | null = null;
  if (draft.incomeChoice === "none") annualIncome = 0;
  else if (draft.incomeChoice === null) {
    const income = parseCount(draft.incomeText);
    if (income === "invalid") errors.incomeText = "연소득을 만원 단위 숫자로 입력해 주세요";
    else annualIncome = income;
  }

  const householdType = known(draft.householdType);
  let householdSize: number | null = null;
  let householdIncome: number | null = null;
  if (householdType === "single") {
    householdSize = 1;
    householdIncome = annualIncome;
  } else {
    if (draft.householdSizeChoice !== "unknown") {
      const size = parseCount(draft.householdSizeText);
      if (size === "invalid" || size === 0) errors.householdSizeText = "가구원 수를 1 이상 숫자로 입력해 주세요";
      else householdSize = size;
    }
    if (draft.householdIncomeChoice !== "unknown") {
      const income = parseCount(draft.householdIncomeText);
      if (income === "invalid") errors.householdIncomeText = "가구 연소득을 만원 단위 숫자로 입력해 주세요";
      else householdIncome = income;
    }
  }

  let ownedProductIds: string[] | null = null;
  if (draft.ownedProductIds.length > 0) ownedProductIds = [...draft.ownedProductIds];
  else if (draft.ownedChoice === "none") ownedProductIds = [];

  if (!birth.ok || Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      birthDate: birth.date,
      militaryMonths,
      region: known(draft.region),
      annualIncome,
      employment: known(draft.employment),
      householdType,
      householdSize,
      householdIncome,
      ownsHouse: yesNo(draft.ownsHouse),
      isHouseholdHead: yesNo(draft.isHouseholdHead),
      residence: known(draft.residence),
      ownedProductIds,
    },
  };
}
