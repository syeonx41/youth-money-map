import type { Condition, Product, UserInput } from "@/types";

const CATEGORIES = ["loan", "saving", "housing"];
const CONDITION_TYPES: Condition["type"][] = [
  "checkAtApply",
  "age",
  "personalIncome",
  "householdIncomeRatio",
  "householdIncome",
  "noHouse",
  "householdHead",
  "employment",
  "region",
  "residence",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ② 상품 JSON 검사. 문제 목록을 돌려줘요(비어 있으면 통과).
 * `npm test` 를 돌리면 data/products.json 이 자동으로 검사돼요.
 */
export function validateProducts(products: Product[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  products.forEach((p, i) => {
    const at = `상품[${i}] ${p.id ?? "(id 없음)"}`;
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`${at}: id는 영문 소문자·숫자·하이픈만 써요`);
    if (ids.has(p.id)) errors.push(`${at}: id가 중복돼요`);
    ids.add(p.id);
    if (!p.name) errors.push(`${at}: name이 비어 있어요`);
    if (!CATEGORIES.includes(p.category)) errors.push(`${at}: category는 loan/saving/housing 중 하나예요`);
    if (!p.applyUrl?.startsWith("http")) errors.push(`${at}: applyUrl이 링크가 아니에요`);
    if (!p.sourceUrl?.startsWith("http")) errors.push(`${at}: sourceUrl이 링크가 아니에요`);
    if (!DATE.test(p.asOf ?? "")) errors.push(`${at}: asOf는 YYYY-MM-DD 형식이에요`);
    if (!Array.isArray(p.benefits?.summary)) errors.push(`${at}: benefits.summary가 배열이 아니에요`);
    if (p.newSignupClosed !== undefined && typeof p.newSignupClosed !== "boolean")
      errors.push(`${at}: newSignupClosed는 true/false예요`);
    if (!Array.isArray(p.conditions) || p.conditions.length === 0) {
      errors.push(`${at}: conditions가 비어 있어요`);
    } else {
      const condIds = new Set<string>();
      p.conditions.forEach((c, j) => {
        const cat = `${at} 조건[${j}] ${c.id}`;
        if (!CONDITION_TYPES.includes(c.type)) errors.push(`${cat}: 모르는 조건 종류 "${c.type}"`);
        if (condIds.has(c.id)) errors.push(`${cat}: 조건 id가 중복돼요`);
        condIds.add(c.id);
        if (!c.sourceText) errors.push(`${cat}: sourceText(공고 원문)가 비어 있어요`);
        if (c.type === "age" && !(c.min <= c.max)) errors.push(`${cat}: min이 max보다 커요`);
        if (c.type === "householdIncomeRatio" && c.minPercent !== undefined && !(c.minPercent < c.maxPercent))
          errors.push(`${cat}: minPercent가 maxPercent보다 작아야 해요`);
        if (c.type === "checkAtApply" && !c.description) errors.push(`${cat}: description(화면 안내 문구)이 비어 있어요`);
      });
    }
    p.schedules?.forEach((s, j) => {
      if (!DATE.test(s.start) || !DATE.test(s.end)) errors.push(`${at} 일정[${j}]: 날짜 형식이 틀려요`);
    });
  });

  // 중복 가입 제한은 양쪽 상품에 모두 적혀 있어야 해요
  for (const p of products) {
    for (const otherId of p.exclusiveWith ?? []) {
      const other = products.find((o) => o.id === otherId);
      if (!other) errors.push(`${p.id}: exclusiveWith의 "${otherId}" 상품이 없어요`);
      else if (!other.exclusiveWith?.includes(p.id)) {
        errors.push(`${p.id} ↔ ${otherId}: 중복 가입 제한을 양쪽 상품에 모두 적어 주세요`);
      }
    }
  }
  return errors;
}

const nullableNumber = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
const nullableString = (v: unknown) => v === null || typeof v === "string";
const nullableBool = (v: unknown) => v === null || typeof v === "boolean";

/** API로 들어온 입력값 검사. 통과하면 UserInput, 아니면 오류 목록 */
export function parseUserInput(body: unknown): { ok: true; input: UserInput } | { ok: false; errors: string[] } {
  if (typeof body !== "object" || body === null) return { ok: false, errors: ["요청 본문이 객체가 아니에요"] };
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  // 빠진 항목은 '모름'(null)으로 처리해요
  const v = (key: string) => (b[key] === undefined ? null : b[key]);

  if (!nullableString(v("birthDate")) || (typeof b.birthDate === "string" && !DATE.test(b.birthDate)))
    errors.push("birthDate는 YYYY-MM-DD 또는 null이에요");
  for (const key of ["militaryMonths", "annualIncome", "householdSize", "householdIncome"]) {
    if (!nullableNumber(v(key))) errors.push(`${key}는 0 이상의 숫자 또는 null이에요`);
  }
  for (const key of ["region", "employment", "householdType", "residence"]) {
    if (!nullableString(v(key))) errors.push(`${key}는 문자열 또는 null이에요`);
  }
  for (const key of ["ownsHouse", "isHouseholdHead"]) {
    if (!nullableBool(v(key))) errors.push(`${key}는 true/false 또는 null이에요`);
  }
  const owned = v("ownedProductIds");
  if (!(owned === null || (Array.isArray(owned) && owned.every((x) => typeof x === "string"))))
    errors.push("ownedProductIds는 문자열 배열 또는 null이에요");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      birthDate: v("birthDate") as string | null,
      militaryMonths: v("militaryMonths") as number | null,
      region: v("region") as string | null,
      annualIncome: v("annualIncome") as number | null,
      employment: v("employment") as UserInput["employment"],
      householdType: v("householdType") as UserInput["householdType"],
      householdSize: v("householdSize") as number | null,
      householdIncome: v("householdIncome") as number | null,
      ownsHouse: v("ownsHouse") as boolean | null,
      isHouseholdHead: v("isHouseholdHead") as boolean | null,
      residence: v("residence") as UserInput["residence"],
      ownedProductIds: owned as string[] | null,
      mainBank: (v("mainBank") as string | null) ?? null,
    },
  };
}
