import { describe, expect, it } from "vitest";
import { EMPTY_INPUT } from "@/lib/api/client";
import {
  EMPTY_DRAFT,
  chooseOwned,
  draftToUserInput,
  errorsForStep,
  parseBirthDigits,
  parseStep,
  toggleOwnedProduct,
  type InputDraft,
} from "../input-draft";

function convert(patch: Partial<InputDraft>) {
  return draftToUserInput({ ...EMPTY_DRAFT, ...patch });
}

describe("생년월일 8자리 → YYYY-MM-DD", () => {
  it("8자리를 날짜 형식으로 바꿔요", () => {
    expect(parseBirthDigits("19990315")).toEqual({ ok: true, date: "1999-03-15" });
  });

  it("윤년 2월 29일은 받아요", () => {
    expect(parseBirthDigits("20000229")).toEqual({ ok: true, date: "2000-02-29" });
    expect(parseBirthDigits("19960229")).toEqual({ ok: true, date: "1996-02-29" });
  });

  it("윤년이 아닌 해의 2월 29일은 거부해요", () => {
    expect(parseBirthDigits("19990229").ok).toBe(false);
    expect(parseBirthDigits("19000229").ok).toBe(false);
  });

  it("없는 날짜는 거부해요", () => {
    for (const digits of ["19990230", "19991301", "19990000", "19990431", "19990100"]) {
      expect(parseBirthDigits(digits).ok, digits).toBe(false);
    }
  });

  it("빈칸·자릿수 틀림·숫자 아님은 거부해요", () => {
    for (const digits of ["", "1999031", "199903150", "1999a315"]) {
      expect(parseBirthDigits(digits).ok, digits).toBe(false);
    }
  });
});

describe("입력 선택값 → UserInput", () => {
  it("생년월일만 넣으면 나머지는 모두 null 이에요", () => {
    const result = convert({ birthDigits: "19990315" });
    expect(result).toEqual({
      ok: true,
      input: { ...EMPTY_INPUT, mainBank: undefined, birthDate: "1999-03-15" },
    });
    if (result.ok) expect("mainBank" in result.input).toBe(false);
  });

  it("생년월일이 없으면 생년월일 오류를 돌려줘요", () => {
    const result = convert({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.birthDigits).toBeTruthy();
  });

  it("없는 날짜면 생년월일 오류를 돌려줘요", () => {
    const result = convert({ birthDigits: "19990230" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.birthDigits).toBeTruthy();
  });

  it("'모름'을 고른 항목은 null 이에요", () => {
    const result = convert({
      birthDigits: "19990315",
      region: "unknown",
      military: "unknown",
      incomeChoice: "unknown",
      incomeText: "3000",
      employment: "unknown",
      householdType: "unknown",
      ownsHouse: "unknown",
      isHouseholdHead: "unknown",
      residence: "unknown",
      ownedChoice: "unknown",
    });
    expect(result).toEqual({ ok: true, input: { ...EMPTY_INPUT, mainBank: undefined, birthDate: "1999-03-15" } });
  });
});

function inputOf(patch: Partial<InputDraft>) {
  const result = convert({ birthDigits: "19990315", ...patch });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.input;
}

describe("1인 가구 자동 채움", () => {
  it("가구원 수 1명, 가구소득 = 본인 연소득 (쉼표 허용)", () => {
    const input = inputOf({ householdType: "single", incomeText: "3,000", householdSizeText: "4", householdIncomeText: "9000" });
    expect(input).toMatchObject({ annualIncome: 3000, householdType: "single", householdSize: 1, householdIncome: 3000 });
  });

  it("소득 없음이면 가구소득 0", () => {
    const input = inputOf({ householdType: "single", incomeChoice: "none", incomeText: "3000" });
    expect(input).toMatchObject({ annualIncome: 0, householdSize: 1, householdIncome: 0 });
  });

  it("소득 모름이면 가구소득도 null", () => {
    const input = inputOf({ householdType: "single", incomeChoice: "unknown", incomeText: "3000" });
    expect(input).toMatchObject({ annualIncome: null, householdSize: 1, householdIncome: null });
  });

  it("소득 빈칸이면 가구소득도 null", () => {
    expect(inputOf({ householdType: "single" })).toMatchObject({ annualIncome: null, householdIncome: null });
  });
});

describe("가구원 수·가구소득 (1인 가구가 아닐 때)", () => {
  it("입력한 숫자를 그대로 써요", () => {
    const input = inputOf({ householdType: "withParents", householdSizeText: "4", householdIncomeText: "8,000" });
    expect(input).toMatchObject({ householdSize: 4, householdIncome: 8000 });
  });

  it("'모름'을 고르면 입력값이 있어도 null", () => {
    const input = inputOf({
      householdType: "married",
      householdSizeText: "2",
      householdSizeChoice: "unknown",
      householdIncomeText: "9500",
      householdIncomeChoice: "unknown",
    });
    expect(input).toMatchObject({ householdSize: null, householdIncome: null });
  });

  it("가구원 수 0은 오류예요", () => {
    const result = convert({ birthDigits: "19990315", householdType: "withParents", householdSizeText: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.householdSizeText).toBeTruthy();
  });
});

describe("병역", () => {
  it("해당 없음 → 0", () => {
    expect(inputOf({ military: "none", militaryMonthsText: "18" }).militaryMonths).toBe(0);
  });

  it("다녀왔어요 + 개월 수 → 숫자", () => {
    expect(inputOf({ military: "served", militaryMonthsText: "21" }).militaryMonths).toBe(21);
  });

  it("다녀왔어요 + 개월 수 빈칸 → null", () => {
    expect(inputOf({ military: "served", militaryMonthsText: "" }).militaryMonths).toBeNull();
  });

  it("모름·안 고름 → null", () => {
    expect(inputOf({ military: "unknown" }).militaryMonths).toBeNull();
    expect(inputOf({}).militaryMonths).toBeNull();
  });
});

describe("가입 중인 상품", () => {
  it("없어요 → []", () => {
    expect(inputOf({ ownedChoice: "none" }).ownedProductIds).toEqual([]);
  });

  it("잘 모르겠어요 → null", () => {
    expect(inputOf({ ownedChoice: "unknown" }).ownedProductIds).toBeNull();
  });

  it("안 고름 → null", () => {
    expect(inputOf({}).ownedProductIds).toBeNull();
  });

  it("체크한 상품 → id 목록", () => {
    expect(inputOf({ ownedProductIds: ["youth-leap-account"] }).ownedProductIds).toEqual(["youth-leap-account"]);
  });

  it("상품을 체크하면 없어요/모름 선택이 풀려요", () => {
    const draft: InputDraft = { ...EMPTY_DRAFT, ownedChoice: "none" };
    expect(toggleOwnedProduct(draft, "youth-leap-account")).toEqual({
      ownedProductIds: ["youth-leap-account"],
      ownedChoice: null,
    });
  });

  it("체크한 상품을 다시 누르면 체크가 풀려요", () => {
    const draft: InputDraft = { ...EMPTY_DRAFT, ownedProductIds: ["a", "b"] };
    expect(toggleOwnedProduct(draft, "a").ownedProductIds).toEqual(["b"]);
  });

  it("없어요/모름을 고르면 상품 체크가 풀리고, 다시 누르면 선택 해제", () => {
    const draft: InputDraft = { ...EMPTY_DRAFT, ownedProductIds: ["a"] };
    expect(chooseOwned(draft, "unknown")).toEqual({ ownedProductIds: [], ownedChoice: "unknown" });
    expect(chooseOwned({ ...EMPTY_DRAFT, ownedChoice: "none" }, "none")).toEqual({
      ownedProductIds: [],
      ownedChoice: null,
    });
  });
});

describe("단계", () => {
  it("step 1~5 는 그대로, 이상한 값은 1", () => {
    expect(parseStep("3")).toBe(3);
    expect(parseStep("5")).toBe(5);
    for (const value of [null, undefined, "", "0", "6", "2.5", "abc", "-1", "01"]) {
      expect(parseStep(value), String(value)).toBe(1);
    }
  });

  it("단계별 오류만 골라요", () => {
    const errors = { birthDigits: "a", incomeText: "b", householdSizeText: "c" };
    expect(errorsForStep(errors, 1)).toEqual({ birthDigits: "a" });
    expect(errorsForStep(errors, 2)).toEqual({ incomeText: "b" });
    expect(errorsForStep(errors, 3)).toEqual({ householdSizeText: "c" });
    expect(errorsForStep(errors, 4)).toEqual({});
  });
});
