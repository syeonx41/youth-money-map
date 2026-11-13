/**
 * ⑤ 정답 프로필 테스트
 *
 * profiles.json 에 프로필을 추가하면 이 테스트가 자동으로 정답표와 비교해요.
 *
 * 프로필 형식
 * - id: "P01" 처럼 겹치지 않게
 * - description: 어떤 경우를 확인하는지 (경계값, '모름', 도약계좌 보유자 등)
 * - input: UserInput (types.ts). 모름은 null, 금액은 만원
 * - expected: { 상품 id: "eligible" | "needsCheck" | "ineligible" }
 *     확인하고 싶은 상품만 적어도 돼요
 * - expectedConflicts (선택): 중복 가입 경고가 떠야 하는 상품 id 목록
 *
 * 날짜는 TODAY(2026-11-13)로 고정해서 나이가 바뀌지 않게 해요.
 * 상품 데이터(data/products.json)가 바뀌면 정답도 같이 맞춰 주세요.
 */
import { describe, expect, it } from "vitest";
import { judgeAll } from "../judge";
import { medianIncome, products } from "@/lib/data";
import type { JudgeStatus, UserInput } from "@/types";
import { TODAY } from "./fixtures";
import profilesJson from "./profiles.json";

interface Profile {
  id: string;
  description: string;
  input: UserInput;
  expected: Record<string, JudgeStatus>;
  expectedConflicts?: string[];
}

const profiles = profilesJson as unknown as Profile[];
const LABEL: Record<JudgeStatus, string> = { eligible: "가능", needsCheck: "확인 필요", ineligible: "해당 없음" };

describe("정답 프로필", () => {
  it("프로필 id가 겹치지 않아요", () => {
    const ids = profiles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const profile of profiles) {
    describe(`${profile.id} ${profile.description}`, () => {
      const { results } = judgeAll({ mainBank: null, ...profile.input }, products, medianIncome, TODAY);

      for (const [productId, want] of Object.entries(profile.expected)) {
        it(`${productId} → ${LABEL[want]}`, () => {
          const got = results.find((r) => r.productId === productId);
          if (!got) throw new Error(`상품 "${productId}"이 data/products.json에 없어요`);
          // 실패하면 판정 이유를 같이 보여줘요
          const detail = got.conditions.map((c) => c.reason).join(" / ");
          expect(`${LABEL[got.status]} (${detail})`).toBe(`${LABEL[want]} (${detail})`);
        });
      }

      if (profile.expectedConflicts) {
        it(`중복 가입 경고: ${profile.expectedConflicts.join(", ")}`, () => {
          const withConflict = results.filter((r) => r.conflicts.length > 0).map((r) => r.productId).sort();
          expect(withConflict).toEqual([...profile.expectedConflicts!].sort());
        });
      }
    });
  }
});
