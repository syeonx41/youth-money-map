import { describe, expect, it } from "vitest";
import { EMPTY_INPUT } from "@/lib/api/client";
import { EMPTY_DRAFT, draftToUserInput, parseBirthDigits, type InputDraft } from "../input-draft";

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
