import { describe, expect, it } from "vitest";
import { ageAfterMilitary, manAge } from "../age";
import { householdIncomeRatio, monthlyMedianIncome } from "../income";
import { MEDIAN } from "./fixtures";

describe("만 나이", () => {
  it("생일이 지났으면 그대로", () => {
    expect(manAge("1999-03-15", "2026-11-13")).toBe(27);
  });
  it("생일 전날이면 한 살 적게", () => {
    expect(manAge("1999-11-14", "2026-11-13")).toBe(26);
  });
  it("생일 당일이면 나이가 올라가요", () => {
    expect(manAge("1999-11-13", "2026-11-13")).toBe(27);
  });
  it("형식이 틀리면 null", () => {
    expect(manAge("19990315", "2026-11-13")).toBeNull();
  });
});

describe("병역 기간 반영 나이", () => {
  it("만 36세, 병역 24개월 → 만 34세", () => {
    expect(ageAfterMilitary("1990-01-01", "2026-11-13", 24, 72)).toBe(34);
  });
  it("인정 최대 개월 수까지만 빼요", () => {
    // 만 40세, 병역 96개월이어도 72개월만 인정 → 만 34세
    expect(ageAfterMilitary("1986-01-01", "2026-11-13", 96, 72)).toBe(34);
  });
});

describe("기준 중위소득 환산", () => {
  it("1인 가구 연 3,000만원 ≈ 97.5%", () => {
    expect(householdIncomeRatio(MEDIAN, 3000, 1)).toBe(97.5);
  });
  it("4인 가구 연 7,800만원 ≈ 100.1%", () => {
    expect(householdIncomeRatio(MEDIAN, 7800, 4)).toBe(100.1);
  });
  it("표에 없는 7인 가구는 1명당 추가 금액을 더해요", () => {
    expect(monthlyMedianIncome(MEDIAN, 7)).toBe(8555952 + 1000000);
  });
  it("가구원 수가 0이면 null", () => {
    expect(householdIncomeRatio(MEDIAN, 3000, 0)).toBeNull();
  });
});
