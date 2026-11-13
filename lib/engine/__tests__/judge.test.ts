import { describe, expect, it } from "vitest";
import { judgeAll } from "../judge";
import { ALL, LOAN_JEONSE, LOCAL_SEOUL, MEDIAN, SAVING_NEW, TODAY, profile } from "./fixtures";
import type { UserInput } from "@/types";

const judgeOne = (productId: string, input: UserInput) =>
  judgeAll(input, ALL, MEDIAN, TODAY).results.find((r) => r.productId === productId)!;

describe("상품 판정 규칙", () => {
  it("모든 조건 충족 → 가능", () => {
    const r = judgeOne(LOAN_JEONSE.id, profile());
    expect(r.status).toBe("eligible");
    expect(r.summaryReason).toBe("모든 조건을 충족해요");
  });

  it("미충족 1개라도 → 해당 없음, 이유는 미충족 조건", () => {
    const r = judgeOne(LOAN_JEONSE.id, profile({ annualIncome: 5500 }));
    expect(r.status).toBe("ineligible");
    expect(r.summaryReason).toContain("미충족");
    expect(r.conditions.find((c) => c.conditionId === "income")?.status).toBe("unmet");
  });

  it("미충족 없이 모름만 있으면 → 확인 필요", () => {
    const r = judgeOne(LOAN_JEONSE.id, profile({ isHouseholdHead: null }));
    expect(r.status).toBe("needsCheck");
    expect(r.summaryReason).toContain("세대주");
  });

  it("미충족과 모름이 같이 있으면 → 해당 없음", () => {
    const r = judgeOne(LOAN_JEONSE.id, profile({ ownsHouse: true, isHouseholdHead: null }));
    expect(r.status).toBe("ineligible");
  });
});

describe("경계값", () => {
  it("소득이 기준과 같으면 충족 (이하)", () => {
    expect(judgeOne(LOAN_JEONSE.id, profile({ annualIncome: 5000 })).status).toBe("eligible");
  });
  it("만 34세 마지막 날까지 충족", () => {
    // 1991-11-14생은 2026-11-13에 만 34세
    expect(judgeOne(LOAN_JEONSE.id, profile({ birthDate: "1991-11-14" })).status).toBe("eligible");
  });
  it("만 35세가 되는 날부터 미충족", () => {
    expect(judgeOne(LOAN_JEONSE.id, profile({ birthDate: "1991-11-13" })).status).toBe("ineligible");
  });
});

describe("병역 기간", () => {
  it("상한 초과지만 병역 반영 시 충족 → 가능, 이유에 반영 나이 표시", () => {
    const r = judgeOne(SAVING_NEW.id, profile({ birthDate: "1990-01-01", militaryMonths: 24 }));
    expect(r.status).toBe("eligible");
    expect(r.conditions[0].reason).toContain("병역 24개월 반영 시 만 34세");
  });
  it("상한 초과인데 병역 기간을 모르면 → 확인 필요", () => {
    const r = judgeOne(SAVING_NEW.id, profile({ birthDate: "1990-01-01", militaryMonths: null }));
    expect(r.status).toBe("needsCheck");
  });
  it("병역 인정이 없는 상품은 병역이 있어도 미충족", () => {
    const r = judgeOne(LOAN_JEONSE.id, profile({ birthDate: "1990-01-01", militaryMonths: 24 }));
    expect(r.status).toBe("ineligible");
  });
});

describe("기준 중위소득", () => {
  it("1인 가구 연 3,000만원(97.5%) → 150% 이하 충족", () => {
    const r = judgeOne(LOCAL_SEOUL.id, profile());
    expect(r.status).toBe("eligible");
    expect(r.conditions.find((c) => c.conditionId === "hh")?.reason).toContain("97.5%");
  });
  it("1인 가구 연 6,000만원(195%) → 150% 이하 미충족", () => {
    expect(judgeOne(LOCAL_SEOUL.id, profile({ householdIncome: 6000 })).status).toBe("ineligible");
  });
  it("가구원 수를 모르면 → 확인 필요", () => {
    expect(judgeOne(LOCAL_SEOUL.id, profile({ householdSize: null })).status).toBe("needsCheck");
  });
  it("다른 지역이면 → 해당 없음", () => {
    expect(judgeOne(LOCAL_SEOUL.id, profile({ region: "부산" })).status).toBe("ineligible");
  });
});

describe("중복 가입·갈아타기", () => {
  it("기존 상품 가입 중이면 경고 + 갈아타기 순서", () => {
    const r = judgeOne(SAVING_NEW.id, profile({ ownedProductIds: ["saving-old"] }));
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].kind).toBe("owned");
    expect(r.conflicts[0].switchGuide?.warning).toBe("먼저 해지 금지");
  });
  it("가입 상품을 모르면 확인 경고", () => {
    const r = judgeOne(SAVING_NEW.id, profile({ ownedProductIds: null }));
    expect(r.conflicts[0].kind).toBe("unknown");
  });
  it("가입 상품이 없으면 경고 없음", () => {
    expect(judgeOne(SAVING_NEW.id, profile({ ownedProductIds: [] })).conflicts).toHaveLength(0);
  });
  it("이미 가입한 상품은 owned 표시, 경고는 안 띄워요", () => {
    const r = judgeOne("saving-old", profile({ ownedProductIds: ["saving-old"] }));
    expect(r.owned).toBe(true);
    expect(r.conflicts).toHaveLength(0);
  });
});

describe("전체 결과", () => {
  it("가능 → 확인 필요 → 해당 없음 순으로 정렬", () => {
    const { results } = judgeAll(profile({ isHouseholdHead: null, region: "부산" }), ALL, MEDIAN, TODAY);
    const order = { eligible: 0, needsCheck: 1, ineligible: 2 };
    const ranks = results.map((r) => order[r.status]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
  it("탭별 개수를 세요", () => {
    const { counts } = judgeAll(profile(), ALL, MEDIAN, TODAY);
    expect(counts.loan.eligible).toBe(1);
    expect(counts.saving.eligible).toBe(2);
    expect(counts.housing.eligible).toBe(1);
  });
  it("모든 항목이 모름이면 해당 없음 없이 확인 필요만", () => {
    const empty = profile({
      birthDate: null, militaryMonths: null, region: null, annualIncome: null, employment: null,
      householdType: null, householdSize: null, householdIncome: null, ownsHouse: null,
      isHouseholdHead: null, residence: null, ownedProductIds: null,
    });
    const { results } = judgeAll(empty, ALL, MEDIAN, TODAY);
    expect(results.every((r) => r.status === "needsCheck")).toBe(true);
  });
});
