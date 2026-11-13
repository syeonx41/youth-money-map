import type { MedianIncomeTable, Product, UserInput } from "@/types";

/** 테스트 날짜 고정 */
export const TODAY = "2026-11-13";

export const MEDIAN: MedianIncomeTable = {
  year: 2026,
  monthly: { "1": 2564238, "2": 4199292, "3": 5359036, "4": 6494738, "5": 7556719, "6": 8555952 },
  perAdditionalMember: 1000000,
  source: "test",
  verified: false,
};

/** 기본 프로필: 만 27세, 연 3,000만원, 1인 가구, 서울, 무주택 세대주, 전세 */
export function profile(overrides: Partial<UserInput> = {}): UserInput {
  return {
    birthDate: "1999-03-15",
    militaryMonths: 0,
    region: "서울",
    annualIncome: 3000,
    employment: "employee",
    householdType: "single",
    householdSize: 1,
    householdIncome: 3000,
    ownsHouse: false,
    isHouseholdHead: true,
    residence: "jeonse",
    ownedProductIds: [],
    mainBank: null,
    ...overrides,
  };
}

const base = {
  provider: "테스트",
  summary: "테스트",
  benefits: { summary: [] },
  applyUrl: "https://example.com",
  sourceUrl: "https://example.com",
  asOf: TODAY,
};

export const SAVING_NEW: Product = {
  ...base,
  id: "saving-new",
  name: "새 적금",
  category: "saving",
  conditions: [
    { id: "age", type: "age", label: "나이", min: 19, max: 34, militaryMaxMonths: 72, sourceText: "만 19~34세" },
    { id: "income", type: "personalIncome", label: "개인 소득", max: 6000, sourceText: "6,000만원 이하" },
    { id: "hh", type: "householdIncomeRatio", label: "가구 소득", maxPercent: 200, sourceText: "중위 200% 이하" },
  ],
  exclusiveWith: ["saving-old"],
  switchGuides: [{ fromProductId: "saving-old", steps: ["심사", "전환", "정리"], warning: "먼저 해지 금지" }],
};

export const SAVING_OLD: Product = {
  ...base,
  id: "saving-old",
  name: "기존 적금",
  category: "saving",
  conditions: [{ id: "age", type: "age", label: "나이", min: 19, max: 34, sourceText: "만 19~34세" }],
  exclusiveWith: ["saving-new"],
};

export const LOAN_JEONSE: Product = {
  ...base,
  id: "loan-jeonse",
  name: "전세대출",
  category: "loan",
  conditions: [
    { id: "age", type: "age", label: "나이", min: 19, max: 34, sourceText: "만 19~34세" },
    { id: "income", type: "personalIncome", label: "연소득", max: 5000, sourceText: "5,000만원 이하" },
    { id: "no-house", type: "noHouse", label: "무주택", sourceText: "무주택" },
    { id: "head", type: "householdHead", label: "세대주", sourceText: "세대주" },
    { id: "res", type: "residence", label: "전세", allowed: ["jeonse"], sourceText: "전세 계약자" },
  ],
};

export const LOCAL_SEOUL: Product = {
  ...base,
  id: "local-seoul",
  name: "서울 청년 지원",
  category: "housing",
  conditions: [
    { id: "region", type: "region", label: "지역", allowed: ["서울"], sourceText: "서울 거주" },
    { id: "hh", type: "householdIncomeRatio", label: "가구 소득", maxPercent: 150, sourceText: "중위 150% 이하" },
  ],
};

export const ALL = [SAVING_NEW, SAVING_OLD, LOAN_JEONSE, LOCAL_SEOUL];
