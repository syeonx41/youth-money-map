/**
 * ③ 입력 화면 선택값(draft) → 판정 입력(UserInput) 변환. 순수 함수만 있어요.
 *
 * 규칙 (spec "Implementation Decisions")
 * - 고르지 않은 항목(null·빈칸)과 '모름'("unknown") → null
 * - 생년월일만 필수: 8자리 숫자, 실제 있는 날짜
 * - 쉼표·공백은 지우고 숫자로 바꿔요. 소득 없음 → 0
 * - 1인 가구 → 가구원 수 1, 가구소득 = 본인 연소득
 * - 병역: 해당 없음 → 0, 다녀왔어요 + 개월 수 → 숫자, 개월 수 빈칸 → null
 * - 가입 상품: 체크한 상품 → id 목록, "없어요" → [], "잘 모르겠어요"·안 고름 → null
 * - 주거래 은행(mainBank)은 보내지 않아요
 */
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
  ownsHouse: null,
  isHouseholdHead: null,
  residence: null,
  ownedProductIds: [],
  ownedChoice: null,
};

/** 입력 칸별 오류 문구 */
export type DraftErrors = Partial<Record<keyof InputDraft, string>>;

export type DraftConversion = { ok: true; input: UserInput } | { ok: false; errors: DraftErrors };

/** 생년월일 8자리 → "YYYY-MM-DD". 형식이 틀리거나 없는 날짜면 오류 문구 */
export function parseBirthDigits(digits: string): { ok: true; date: string } | { ok: false; error: string } {
  const value = digits.replace(/[\s.\-/]/g, "");
  if (value === "") return { ok: false, error: "생년월일을 입력해 주세요" };
  if (!/^\d{8}$/.test(value)) return { ok: false, error: "생년월일 8자리를 숫자로 입력해 주세요 (예: 19990315)" };

  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (y < 1900 || !real) return { ok: false, error: "없는 날짜예요. 생년월일을 다시 확인해 주세요" };

  return { ok: true, date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` };
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

/** 입력 화면 선택값을 판정 입력값으로 바꿔요 */
export function draftToUserInput(draft: InputDraft): DraftConversion {
  const errors: DraftErrors = {};

  const birth = parseBirthDigits(draft.birthDigits);
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
    const size = parseCount(draft.householdSizeText);
    if (size === "invalid" || size === 0) errors.householdSizeText = "가구원 수를 1 이상 숫자로 입력해 주세요";
    else householdSize = size;
    const income = parseCount(draft.householdIncomeText);
    if (income === "invalid") errors.householdIncomeText = "가구 연소득을 만원 단위 숫자로 입력해 주세요";
    else householdIncome = income;
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
