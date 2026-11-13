/**
 * 청년머니맵 공통 데이터 형식
 *
 * 모든 파트(①엔진, ②데이터, ③④화면, ⑤테스트)가 이 파일을 기준으로 작업해요.
 * 바꿔야 할 때는 혼자 고치지 말고 단톡에 먼저 공유해 주세요.
 *
 * 규칙
 * - 금액 단위는 모두 "만원"이에요. (연소득 3,000만원 → 3000)
 * - 사용자가 '모름'을 고른 항목은 null 로 보내요.
 * - 날짜는 "YYYY-MM-DD" 문자열이에요.
 */

/* ------------------------------------------------------------------ */
/* 1. 사용자 입력 (③ 입력 화면 → POST /api/judge)                      */
/* ------------------------------------------------------------------ */

export type EmploymentType =
  | "employee" // 직장인
  | "smeEmployee" // 중소기업 재직
  | "selfEmployed" // 자영업
  | "student" // 학생·취준생
  | "other";

export type HouseholdType =
  | "single" // 1인 가구
  | "withParents" // 부모님과 함께
  | "married"; // 기혼·결혼 예정

export type ResidenceType =
  | "monthlyRent" // 월세
  | "jeonse" // 전세(예정 포함)
  | "parents" // 부모님 집
  | "other";

/** 시·도 이름. 지자체 상품 판정에 써요. 예: "서울", "경기", "부산" */
export type Region = string;

export interface UserInput {
  /** ① 나이: 생년월일 "YYYY-MM-DD" */
  birthDate: string | null;
  /** ① 병역 이행 기간(개월). 해당 없으면 0 */
  militaryMonths: number | null;
  /** ① 사는 지역(시·도) */
  region: Region | null;

  /** ② 본인 연소득(세전, 만원). 소득 없음이면 0 */
  annualIncome: number | null;
  /** ② 일하는 형태 */
  employment: EmploymentType | null;

  /** ③ 가구 형태 */
  householdType: HouseholdType | null;
  /** ③ 가구원 수(본인 포함) */
  householdSize: number | null;
  /** ③ 가구 전체 연소득(세전, 만원) */
  householdIncome: number | null;

  /** ④ 본인 명의 주택 보유 여부 */
  ownsHouse: boolean | null;
  /** ④ 세대주 여부 */
  isHouseholdHead: boolean | null;
  /** ④ 지금 사는 형태 */
  residence: ResidenceType | null;

  /** ⑤ 가입 중인 상품 id 목록. 없으면 [], 모르면 null */
  ownedProductIds: string[] | null;
  /** ⑤ 주로 쓰는 은행(우대금리 안내용, 선택) */
  mainBank?: string | null;
}

/* ------------------------------------------------------------------ */
/* 2. 상품 조건표 (② data/products.json)                               */
/* ------------------------------------------------------------------ */

export type ProductCategory = "loan" | "saving" | "housing";

interface ConditionBase {
  /** 상품 안에서 겹치지 않는 id. 예: "age", "income" */
  id: string;
  /** 화면에 보일 조건 이름. 예: "나이" */
  label: string;
  /** 공고 원문 문장 그대로. 판정 근거와 챗봇 출처로 써요 */
  sourceText: string;
}

/** 나이 조건. 병역 기간만큼 상한을 늘려주는 상품은 militaryMaxMonths 를 넣어요 */
export interface AgeCondition extends ConditionBase {
  type: "age";
  min: number;
  max: number;
  /** 병역 기간 인정 최대 개월 수 (예: 최대 6년 → 72). 없으면 인정 안 함 */
  militaryMaxMonths?: number;
}

/** 본인 연소득 상한(만원) */
export interface PersonalIncomeCondition extends ConditionBase {
  type: "personalIncome";
  max: number;
  /** 소득이 0원(학생·취준생)이어도 가입 가능한지. 기본 true */
  allowZero?: boolean;
}

/** 가구소득이 기준 중위소득의 몇 % 이하인지 */
export interface HouseholdIncomeRatioCondition extends ConditionBase {
  type: "householdIncomeRatio";
  maxPercent: number;
}

/** 가구 연소득 상한(만원). 부부 합산 기준 등 */
export interface HouseholdIncomeCondition extends ConditionBase {
  type: "householdIncome";
  max: number;
}

/** 무주택 */
export interface NoHouseCondition extends ConditionBase {
  type: "noHouse";
}

/** 세대주 */
export interface HouseholdHeadCondition extends ConditionBase {
  type: "householdHead";
}

/** 일하는 형태 제한 */
export interface EmploymentCondition extends ConditionBase {
  type: "employment";
  allowed: EmploymentType[];
}

/** 거주 지역 제한 (지자체 상품) */
export interface RegionCondition extends ConditionBase {
  type: "region";
  allowed: Region[];
}

/** 거주 형태 제한 (전세대출, 월세지원 등) */
export interface ResidenceCondition extends ConditionBase {
  type: "residence";
  allowed: ResidenceType[];
}

export type Condition =
  | AgeCondition
  | PersonalIncomeCondition
  | HouseholdIncomeRatioCondition
  | HouseholdIncomeCondition
  | NoHouseCondition
  | HouseholdHeadCondition
  | EmploymentCondition
  | RegionCondition
  | ResidenceCondition;

export type ConditionType = Condition["type"];

/** 은행 우대금리 조건 1개 */
export interface PreferentialRate {
  label: string; // 예: "급여이체"
  rate: number; // %p, 예: 0.3
  description?: string;
}

/** 정부지원금 1개 (기여금, 이자지원, 비과세 등) */
export interface GovernmentSupport {
  label: string; // 예: "정부 기여금"
  description: string; // 예: "납입액의 6%, 월 최대 3만원"
}

export interface Benefits {
  /** 화면 카드에 보일 핵심 혜택 1~3줄 */
  summary: string[];
  /** 기본금리(%) */
  baseRate?: number;
  /** 최고 우대금리 합계(%p) */
  maxPreferentialRate?: number;
  preferentialRates?: PreferentialRate[];
  governmentSupports?: GovernmentSupport[];
  /** 대출 한도 등 자유 서술. 예: "최대 2억원" */
  limit?: string;
}

/** 신청 일정. 상시 신청이면 비워 둬요 */
export interface ApplySchedule {
  label: string; // 예: "2026년 12월 신청"
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/** 이미 가입한 상품에서 이 상품으로 갈아탈 때의 안내 */
export interface SwitchGuide {
  fromProductId: string;
  steps: string[];
  /** 하면 안 되는 것. 예: "심사 전에 기존 계좌부터 해지하지 마세요" */
  warning?: string;
  sourceText?: string;
}

export interface Product {
  id: string; // 영문 소문자-하이픈. 예: "youth-future-saving"
  name: string;
  category: ProductCategory;
  provider: string; // 운영기관
  summary: string; // 한 줄 소개
  conditions: Condition[];
  benefits: Benefits;
  /** 동시에 가입할 수 없는 상품 id 목록 (양쪽 상품 모두에 적어 주세요) */
  exclusiveWith?: string[];
  switchGuides?: SwitchGuide[];
  schedules?: ApplySchedule[];
  applyUrl: string; // 공식 신청 링크
  sourceUrl: string; // 공고 원문 링크
  asOf: string; // 정보 기준일 YYYY-MM-DD
  /** 챗봇(④)이 근거로 쓰는 공고 핵심 발췌 */
  noticeExcerpt?: string;
  /** 예시 데이터 표시. 실제 공고로 바꾸면 지워요 */
  isSample?: boolean;
}

/* ------------------------------------------------------------------ */
/* 3. 판정 결과 (POST /api/judge 응답 → ③ 결과, ④ 상세·챗봇)           */
/* ------------------------------------------------------------------ */

/** 상품 판정: 가능 / 확인 필요 / 해당 없음 */
export type JudgeStatus = "eligible" | "needsCheck" | "ineligible";

/** 조건 1개 판정: 충족 / 미충족 / 모름 */
export type ConditionStatus = "met" | "unmet" | "unknown";

export interface ConditionResult {
  conditionId: string;
  type: ConditionType;
  label: string;
  status: ConditionStatus;
  /** 화면에 보일 이유 문구. 예: "만 27세 → 나이 조건(만 19~34세) 충족" */
  reason: string;
  sourceText: string;
}

/** 중복 가입·갈아타기 안내 */
export interface ConflictWarning {
  /** owned: 가입 중인 상품과 동시 가입 불가 / unknown: 가입 여부를 몰라서 확인 필요 */
  kind: "owned" | "unknown";
  conflictingProductId: string;
  conflictingProductName: string;
  message: string;
  switchGuide?: SwitchGuide;
}

export interface ProductJudgement {
  productId: string;
  productName: string;
  category: ProductCategory;
  status: JudgeStatus;
  /** 카드에 보일 핵심 이유 1줄 */
  summaryReason: string;
  conditions: ConditionResult[];
  /** 이미 가입 중인 상품인지 */
  owned: boolean;
  conflicts: ConflictWarning[];
}

export interface JudgeResponse {
  results: ProductJudgement[];
  /** 탭 숫자용 */
  counts: Record<ProductCategory, Record<JudgeStatus, number>>;
  /** 판정에 쓴 기준일 */
  judgedAt: string;
}

/* ------------------------------------------------------------------ */
/* 4. 기준 중위소득 표 (② data/median-income.json)                      */
/* ------------------------------------------------------------------ */

export interface MedianIncomeTable {
  year: number;
  /** 가구원 수별 월 기준 중위소득(원). key 는 "1" ~ "6" */
  monthly: Record<string, number>;
  /** 표에 없는 큰 가구에 1명당 더하는 금액(원) */
  perAdditionalMember?: number;
  source: string;
  verified: boolean;
}
