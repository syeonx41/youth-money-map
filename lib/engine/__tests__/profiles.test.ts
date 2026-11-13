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
 * - expectedOwned (선택): 이미 가입 중이라 owned: true 로 나와야 하는 상품 id 목록
 *     가입 중인 상품은 상태(가능/해당 없음)보다 '가입 중' 표시가 중요해서 expected 대신 여기에 적어요
 * - pending (선택): { 상품 id: { expected, reason } }
 *     공고 기준 정답은 있지만 지금 엔진·types.ts 로는 표현할 수 없는 칸이에요.
 *     실패로 두지 않고 it.todo 로 표시해요. 엔진이 고쳐지면 expected 로 옮겨 주세요.
 *
 * data/products.json 에 아직 없는 상품은 실패 대신 it.todo("② 데이터 대기")로 표시해요.
 * ② 데이터가 들어오면 그때부터 자동으로 진짜 테스트가 돼요.
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

interface PendingCell {
  expected: JudgeStatus;
  reason: string;
}

interface Profile {
  id: string;
  description: string;
  input: UserInput;
  expected: Record<string, JudgeStatus>;
  expectedConflicts?: string[];
  expectedOwned?: string[];
  pending?: Record<string, PendingCell>;
}

const profiles = profilesJson as unknown as Profile[];
const LABEL: Record<JudgeStatus, string> = { eligible: "가능", needsCheck: "확인 필요", ineligible: "해당 없음" };
const productIds = new Set(products.map((p) => p.id));
const WAITING = "(② data/products.json에 아직 없음)";

describe("정답 프로필", () => {
  it("프로필 id가 겹치지 않아요", () => {
    const ids = profiles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const profile of profiles) {
    describe(`${profile.id} ${profile.description}`, () => {
      const { results } = judgeAll({ mainBank: null, ...profile.input }, products, medianIncome, TODAY);

      for (const [productId, want] of Object.entries(profile.expected)) {
        if (!productIds.has(productId)) {
          it.todo(`${productId} → ${LABEL[want]} ${WAITING}`);
          continue;
        }
        it(`${productId} → ${LABEL[want]}`, () => {
          const got = results.find((r) => r.productId === productId)!;
          // 실패하면 판정 이유를 같이 보여줘요
          const detail = got.conditions.map((c) => c.reason).join(" / ");
          expect(`${LABEL[got.status]} (${detail})`).toBe(`${LABEL[want]} (${detail})`);
        });
      }

      for (const [productId, cell] of Object.entries(profile.pending ?? {})) {
        it.todo(`${productId} → ${LABEL[cell.expected]} [보류: ${cell.reason}]`);
      }

      for (const productId of profile.expectedOwned ?? []) {
        if (!productIds.has(productId)) {
          it.todo(`${productId} → 가입 중 ${WAITING}`);
          continue;
        }
        it(`${productId} → 가입 중`, () => {
          const got = results.find((r) => r.productId === productId)!;
          expect(got.owned).toBe(true);
        });
      }

      if (profile.expectedConflicts) {
        const title = `중복 가입 경고: ${profile.expectedConflicts.join(", ") || "없음"}`;
        const missing = profile.expectedConflicts.filter((id) => !productIds.has(id));
        if (missing.length > 0) {
          it.todo(`${title} (② data/products.json에 아직 없음: ${missing.join(", ")})`);
        } else {
          it(title, () => {
            const withConflict = results.filter((r) => r.conflicts.length > 0).map((r) => r.productId).sort();
            expect(withConflict).toEqual([...profile.expectedConflicts!].sort());
          });
        }
      }
    });
  }
});
