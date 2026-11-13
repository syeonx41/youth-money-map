import { describe, expect, it } from "vitest";
import { parseUserInput, validateProducts } from "../validate";
import { judgeAll } from "../judge";
import { medianIncome, products } from "@/lib/data";
import { TODAY, profile } from "./fixtures";

describe("② data/products.json 검사", () => {
  it("형식 오류가 없어요", () => {
    expect(validateProducts(products)).toEqual([]);
  });
  it("실제 데이터로 판정이 돌아가요", () => {
    const res = judgeAll(profile(), products, medianIncome, TODAY);
    expect(res.results).toHaveLength(products.length);
  });
});

describe("API 입력값 검사", () => {
  it("정상 입력 통과", () => {
    expect(parseUserInput(profile()).ok).toBe(true);
  });
  it("빠진 항목은 모름(null)으로 채워요", () => {
    const r = parseUserInput({ birthDate: "1999-03-15" });
    expect(r.ok && r.input.annualIncome).toBeNull();
  });
  it("잘못된 형식은 오류", () => {
    const r = parseUserInput({ birthDate: "1999/03/15", annualIncome: -1 });
    expect(r.ok).toBe(false);
  });
});
