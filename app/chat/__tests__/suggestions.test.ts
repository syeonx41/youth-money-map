import { describe, expect, it } from "vitest";
import { judgeAll } from "@/lib/engine";
import { getProduct, medianIncome, products } from "@/lib/data";
import profiles from "@/lib/engine/__tests__/profiles.json";
import type { UserInput } from "@/types";
import { suggestedQuestions } from "../suggestions";

const input = (id: string) => (profiles as unknown as { id: string; input: UserInput }[]).find((p) => p.id === id)!.input;
const judge = (id: string, productId: string) =>
  judgeAll({ mainBank: null, ...input(id) }, products, medianIncome, "2026-11-15").results.find((r) => r.productId === productId)!;

describe("챗봇 추천 질문 (④)", () => {
  it("상품 없이 열면 전체 결과용 질문", () => {
    expect(suggestedQuestions(null, null)[0]).toContain("비교");
  });

  it("갈아타기 안내가 있으면 갈아타기 질문을 먼저", () => {
    const q = suggestedQuestions(getProduct("youth-future-saving")!, judge("P02", "youth-future-saving"));
    expect(q[0]).toBe("갈아타면 손해 없어요?");
  });

  it("해당 없음이면 이유 질문", () => {
    const q = suggestedQuestions(getProduct("youth-jeonse-loan")!, judge("P01", "youth-jeonse-loan"));
    expect(q).toContain("왜 해당 없음이에요?");
  });

  it("최대 3개", () => {
    expect(suggestedQuestions(getProduct("youth-future-saving")!, judge("P01", "youth-future-saving")).length).toBeLessThanOrEqual(3);
  });
});
