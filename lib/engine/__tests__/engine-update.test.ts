/**
 * 2026-11-14 엔진 수정 테스트
 * 1. 신규 가입 종료 상품 (newSignupClosed)
 * 2. 신청 시 확인 조건 (checkAtApply)
 * 3. 중위소득 반올림 전 비교 (P19)
 * 4. 중위소득 하한 minPercent (P15)
 */
import { describe, expect, it } from "vitest";
import { judgeAll } from "../judge";
import { formatRatio, householdIncomeRatioExact } from "../income";
import { validateProducts } from "../validate";
import type { UserInput } from "@/types";
import { ALL_V2, MEDIAN, RENT_WITH_RANGE, SAVING_NEW, SAVING_OLD_CLOSED, TODAY, profile } from "./fixtures";

const judgeOne = (productId: string, input: UserInput) =>
  judgeAll(input, ALL_V2, MEDIAN, TODAY).results.find((r) => r.productId === productId)!;

describe("1. 신규 가입 종료 상품", () => {
  it("조건을 다 충족해도 해당 없음 + 종료 문구", () => {
    const r = judgeOne(SAVING_OLD_CLOSED.id, profile());
    expect(r.status).toBe("ineligible");
    expect(r.signupClosed).toBe(true);
    expect(r.summaryReason).toBe("신규 가입이 종료된 상품이에요 (2025년 12월 신규 가입 종료)");
  });
  it("결과 목록에는 그대로 남아 있어요", () => {
    const { results } = judgeAll(profile(), ALL_V2, MEDIAN, TODAY);
    expect(results.some((r) => r.productId === SAVING_OLD_CLOSED.id)).toBe(true);
  });
  it("종료 상품 자체에는 중복 가입 경고를 띄우지 않아요 (가입 여부를 몰라도)", () => {
    expect(judgeOne(SAVING_OLD_CLOSED.id, profile({ ownedProductIds: null })).conflicts).toHaveLength(0);
  });
  it("종료 상품을 가입 중이면 '가입 중' 표시는 그대로", () => {
    expect(judgeOne(SAVING_OLD_CLOSED.id, profile({ ownedProductIds: ["saving-old"] })).owned).toBe(true);
  });
  it("종료 상품 가입자에게 새 상품 갈아타기 안내는 계속 나와요", () => {
    const r = judgeOne(SAVING_NEW.id, profile({ ownedProductIds: ["saving-old"] }));
    expect(r.status).toBe("eligible");
    expect(r.conflicts[0].kind).toBe("owned");
    expect(r.conflicts[0].switchGuide?.steps.length).toBeGreaterThan(0);
  });
  it("종료 상품은 탭 개수에서 해당 없음으로 세요", () => {
    const { counts } = judgeAll(profile(), ALL_V2, MEDIAN, TODAY);
    expect(counts.saving).toEqual({ eligible: 1, needsCheck: 0, ineligible: 1 });
  });
});

describe("2. 신청 시 확인 조건", () => {
  it("판정에 영향 없이 안내 문구만 나와요", () => {
    // 1인 가구 연 3,000만원 = 97.5% → 하한·상한 충족, 보증금은 신청 시 확인
    const r = judgeOne(RENT_WITH_RANGE.id, profile());
    expect(r.status).toBe("eligible");
    const deposit = r.conditions.find((c) => c.conditionId === "deposit")!;
    expect(deposit.status).toBe("checkAtApply");
    expect(deposit.reason).toBe("임차보증금 5,000만원 이하 → 신청할 때 확인돼요");
  });
  it("다른 조건이 모름이면 확인 필요, 신청 시 확인 조건 때문은 아니에요", () => {
    const r = judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: null }));
    expect(r.status).toBe("needsCheck");
    expect(r.summaryReason).toContain("가구소득");
  });
  it("description이 비면 데이터 검사에서 걸러요", () => {
    const broken = {
      ...RENT_WITH_RANGE,
      conditions: [{ id: "x", type: "checkAtApply", label: "x", description: "", sourceText: "x" }],
    } as typeof RENT_WITH_RANGE;
    expect(validateProducts([broken]).join()).toContain("description");
  });
});

describe("3. 중위소득 반올림 전 비교 (P19)", () => {
  // 1인 가구 150% = 2,564,238 × 12 × 1.5 = 46,156,284원 → 4,616만원은 150.01%
  it("4,616만원은 150.01%로 계산돼요", () => {
    const exact = householdIncomeRatioExact(MEDIAN, 4616, 1)!;
    expect(exact > 150).toBe(true);
    expect(exact < 150.02).toBe(true);
  });
  it("150% 이하 조건에서 4,616만원은 미충족 (상한 초과)", () => {
    const r = judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: 4616 }));
    expect(r.status).toBe("ineligible");
    const hh = r.conditions.find((c) => c.conditionId === "hh")!;
    expect(hh.reason).toContain("150.01%");
    expect(hh.reason).toContain("상한 초과");
  });
  it("4,615만원(149.99%)은 충족", () => {
    expect(judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: 4615 })).status).toBe("eligible");
  });
  it("표시는 보통 소수 첫째 자리, 기준값과 헷갈릴 때만 둘째 자리", () => {
    expect(formatRatio(97.49)).toBe("97.5%");
    expect(formatRatio(150.012, [150])).toBe("150.01%");
    expect(formatRatio(150, [150])).toBe("150%");
    expect(formatRatio(150.001, [150])).toBe("150% 초과");
  });
});

describe("4. 중위소득 하한 (P15)", () => {
  // 1인 가구 48% = 2,564,238 × 12 × 0.48 = 14,770,011원
  it("하한 이하(39%)면 미충족 (하한 미달)", () => {
    const r = judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: 1200 }));
    expect(r.status).toBe("ineligible");
    expect(r.conditions.find((c) => c.conditionId === "hh")!.reason).toContain("하한 미달");
  });
  it("하한은 '초과'라서 1,478만원(48.03%)은 충족, 1,477만원(47.99996%)은 미충족", () => {
    expect(judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: 1478 })).status).toBe("eligible");
    const r = judgeOne(RENT_WITH_RANGE.id, profile({ householdIncome: 1477 }));
    expect(r.status).toBe("ineligible");
    // 반올림하면 48.00%로 보여서 오해할 수 있어 "48% 미만"으로 표시해요
    expect(r.conditions.find((c) => c.conditionId === "hh")!.reason).toContain("48% 미만");
  });
  it("문구에 범위가 같이 나와요", () => {
    const r = judgeOne(RENT_WITH_RANGE.id, profile());
    expect(r.conditions.find((c) => c.conditionId === "hh")!.reason).toContain("48% 초과~150% 이하");
  });
  it("minPercent가 maxPercent보다 크면 데이터 검사에서 걸러요", () => {
    const broken = {
      ...RENT_WITH_RANGE,
      conditions: [
        { id: "hh", type: "householdIncomeRatio", label: "x", minPercent: 200, maxPercent: 150, sourceText: "x" },
      ],
    } as typeof RENT_WITH_RANGE;
    expect(validateProducts([broken]).join()).toContain("minPercent");
  });
});
