/**
 * 테스트 경계 ①: 정답 프로필 20개를 입력 화면에서 넣을 수 있는지
 *
 * 프로필 입력값(UserInput)을 "화면에서 고를 수 있는 선택값"(InputDraft)으로 만든 뒤
 * draftToUserInput 으로 되돌리면 원래 값과 같아야 해요.
 * 화면 목록(지역·일하는 형태·가구·사는 형태·상품)에 없는 값이 나오면 실패해요.
 */
import { describe, expect, it } from "vitest";
import { products } from "@/lib/data";
import type { UserInput } from "@/types";
import profilesJson from "@/lib/engine/__tests__/profiles.json";
import {
  EMPLOYMENT_OPTIONS,
  EMPTY_DRAFT,
  HOUSEHOLD_OPTIONS,
  REGION_OPTIONS,
  RESIDENCE_OPTIONS,
  chooseOwned,
  draftToUserInput,
  toggleOwnedProduct,
  type InputDraft,
} from "../input-draft";

const profiles = profilesJson as unknown as { id: string; input: UserInput }[];

function pick<T extends string>(value: T | null, allowed: readonly T[], name: string): T | "unknown" {
  if (value === null) return "unknown";
  if (!allowed.includes(value)) throw new Error(`화면 ${name} 목록에 없는 값: ${value}`);
  return value;
}

function yesNo(value: boolean | null): "yes" | "no" | "unknown" {
  if (value === null) return "unknown";
  return value ? "yes" : "no";
}

/** 사람이 화면에서 고르듯 선택값을 만들어요. 화면으로 넣을 수 없는 값이면 오류 */
function chooseOnScreen(input: UserInput): InputDraft {
  if (input.mainBank !== undefined && input.mainBank !== null) throw new Error("주거래 은행 입력은 화면에 없어요");
  if (input.birthDate === null) throw new Error("생년월일은 필수예요");

  const draft: InputDraft = { ...EMPTY_DRAFT, ownedProductIds: [] };

  // 1단계 나이
  draft.birthDigits = input.birthDate.replace(/-/g, "");
  draft.region = pick(input.region, REGION_OPTIONS, "지역");
  if (input.militaryMonths === null) draft.military = "unknown";
  else if (input.militaryMonths === 0) draft.military = "none";
  else {
    draft.military = "served";
    draft.militaryMonthsText = String(input.militaryMonths);
  }

  // 2단계 소득 (쉼표를 넣어 입력)
  if (input.annualIncome === null) draft.incomeChoice = "unknown";
  else if (input.annualIncome === 0) draft.incomeChoice = "none";
  else draft.incomeText = input.annualIncome.toLocaleString("en-US");
  draft.employment = pick(
    input.employment,
    EMPLOYMENT_OPTIONS.map((o) => o.value),
    "일하는 형태",
  );

  // 3단계 가구
  draft.householdType = pick(
    input.householdType,
    HOUSEHOLD_OPTIONS.map((o) => o.value),
    "가구 형태",
  );
  if (draft.householdType === "single") {
    // 1인 가구는 가구원 수·가구소득 칸이 없어요. 1명·본인 소득이어야 화면으로 넣을 수 있어요
    if (input.householdSize !== 1 || input.householdIncome !== input.annualIncome) {
      throw new Error("1인 가구인데 가구원 수가 1이 아니거나 가구소득이 본인 소득과 달라요");
    }
  } else {
    if (input.householdSize === null) draft.householdSizeChoice = "unknown";
    else draft.householdSizeText = String(input.householdSize);
    if (input.householdIncome === null) draft.householdIncomeChoice = "unknown";
    else draft.householdIncomeText = input.householdIncome.toLocaleString("en-US");
  }

  // 4단계 주택
  draft.ownsHouse = yesNo(input.ownsHouse);
  draft.isHouseholdHead = yesNo(input.isHouseholdHead);
  draft.residence = pick(
    input.residence,
    RESIDENCE_OPTIONS.map((o) => o.value),
    "사는 형태",
  );

  // 5단계 가입 중인 상품 (화면 동작 함수로 고르기)
  const productIds = products.map((p) => p.id);
  if (input.ownedProductIds === null) Object.assign(draft, chooseOwned(draft, "unknown"));
  else if (input.ownedProductIds.length === 0) Object.assign(draft, chooseOwned(draft, "none"));
  else {
    for (const id of input.ownedProductIds) {
      if (!productIds.includes(id)) throw new Error(`화면 상품 목록에 없는 상품: ${id}`);
      Object.assign(draft, toggleOwnedProduct(draft, id));
    }
  }

  return draft;
}

describe("정답 프로필 20개를 화면 선택만으로 넣을 수 있어요", () => {
  it("프로필이 20개 있어요", () => {
    expect(profiles.length).toBe(20);
  });

  for (const profile of profiles) {
    it(`${profile.id}: 화면 선택값 → 변환하면 원래 입력값과 같아요`, () => {
      const draft = chooseOnScreen(profile.input);
      expect(draftToUserInput(draft)).toEqual({ ok: true, input: profile.input });
    });
  }
});

describe("화면 목록에 없는 값은 넣을 수 없어요", () => {
  const base = profiles[0].input;

  it("목록에 없는 지역", () => {
    expect(() => chooseOnScreen({ ...base, region: "서울특별시" })).toThrow(/지역/);
  });

  it("목록에 없는 일하는 형태", () => {
    expect(() => chooseOnScreen({ ...base, employment: "freelancer" as UserInput["employment"] })).toThrow(
      /일하는 형태/,
    );
  });

  it("상품 데이터에 없는 상품 id", () => {
    expect(() => chooseOnScreen({ ...base, ownedProductIds: ["no-such-product"] })).toThrow(/상품/);
  });

  it("1인 가구인데 가구소득이 본인 소득과 다르면", () => {
    expect(() => chooseOnScreen({ ...base, householdType: "single", householdIncome: 9999 })).toThrow(/1인 가구/);
  });
});

describe("화면 목록", () => {
  it("지역은 17개 시·도예요", () => {
    expect(REGION_OPTIONS).toHaveLength(17);
    expect(new Set(REGION_OPTIONS).size).toBe(17);
  });

  it("상품 데이터의 지역 조건 값은 모두 화면 지역 목록에 있어요", () => {
    for (const product of products) {
      for (const condition of product.conditions) {
        if (condition.type !== "region") continue;
        for (const region of condition.allowed) expect(REGION_OPTIONS, `${product.id}`).toContain(region);
      }
    }
  });
});
