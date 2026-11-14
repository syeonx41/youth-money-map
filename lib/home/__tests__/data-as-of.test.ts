/** ③ 첫 화면 기준일 계산 테스트 */
import { describe, expect, it } from "vitest";
import { products } from "@/lib/data";
import { latestAsOf, toDotDate } from "../data-as-of";

describe("latestAsOf", () => {
  it("asOf 중 가장 최근 날짜를 골라요", () => {
    expect(latestAsOf([{ asOf: "2026-10-01" }, { asOf: "2026-11-14" }, { asOf: "2026-09-30" }])).toBe("2026-11-14");
  });

  it("연·월이 달라도 날짜 순으로 비교해요", () => {
    expect(latestAsOf([{ asOf: "2025-12-31" }, { asOf: "2026-01-02" }])).toBe("2026-01-02");
  });

  it("상품이 없으면 null", () => {
    expect(latestAsOf([])).toBeNull();
  });

  it("형식이 틀린 asOf 는 건너뛰어요", () => {
    expect(latestAsOf([{ asOf: "2026/12/01" }, { asOf: "2026-11-01" }])).toBe("2026-11-01");
    expect(latestAsOf([{ asOf: "" }])).toBeNull();
  });

  it("실제 상품 데이터에서 가장 최근 asOf 를 돌려줘요", () => {
    const latest = latestAsOf(products);
    expect(latest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const p of products) expect(p.asOf <= latest!).toBe(true);
  });
});

describe("toDotDate", () => {
  it("YYYY-MM-DD 를 YYYY.MM.DD 로 바꿔요", () => {
    expect(toDotDate("2026-11-14")).toBe("2026.11.14");
  });
});
