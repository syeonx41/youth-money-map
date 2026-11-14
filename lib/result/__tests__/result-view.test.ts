/**
 * ③ 결과 화면 모델 테스트 (경계 ②: 판정 결과 → 결과 화면 모델)
 *
 * 실제 엔진(judgeAll)과 실제 상품 데이터로 정답 프로필을 판정해서 넣어요.
 * 엔진 판정이 정답과 맞는지는 ⑤ profiles 테스트가 보고, 여기서는 화면 모델만 봐요.
 * 상품 데이터가 바뀌면 탭별 개수 기대값도 같이 맞춰 주세요.
 */
import { describe, expect, it } from "vitest";
import { judgeAll } from "@/lib/engine";
import { medianIncome, products } from "@/lib/data";
import type { JudgeResponse, UserInput } from "@/types";
import { TODAY } from "@/lib/engine/__tests__/fixtures";
import profilesJson from "@/lib/engine/__tests__/profiles.json";
import {
  CARD_BADGE,
  buildResultView,
  conflictText,
  filterCards,
  initialTab,
  productHref,
  summarizeInput,
  toggleFilter,
  visibleWarnings,
  type ResultCard,
  type ResultTab,
  type ResultView,
} from "../result-view";

const profiles = profilesJson as unknown as { id: string; input: UserInput }[];

function profileInput(id: string): UserInput {
  const found = profiles.find((p) => p.id === id);
  if (!found) throw new Error(`프로필 ${id} 없음`);
  return { mainBank: null, ...found.input };
}

function judge(input: UserInput): JudgeResponse {
  return judgeAll(input, products, medianIncome, TODAY);
}

function viewOf(id: string): ResultView {
  const input = profileInput(id);
  return buildResultView(judge(input), input, products);
}

function tab(view: ResultView, id: ResultTab["id"]): ResultTab {
  const found = view.tabs.find((t) => t.id === id);
  if (!found) throw new Error(`탭 ${id} 없음`);
  return found;
}

const ids = (cards: { productId: string }[]) => cards.map((c) => c.productId);
const chipCounts = (t: ResultTab) => Object.fromEntries(t.chips.map((c) => [c.status, c.count]));

describe("탭", () => {
  it("순서와 이름은 대출 · 적금 · 청약·주거", () => {
    expect(viewOf("P01").tabs.map((t) => [t.id, t.label])).toEqual([
      ["loan", "대출"],
      ["saving", "적금"],
      ["housing", "청약·주거"],
    ]);
  });

  it("탭 숫자는 보이는 카드 수예요 (API counts 아님)", () => {
    const input = profileInput("P01");
    const result = judge(input);
    const view = buildResultView(result, input, products);
    expect(view.tabs.map((t) => t.count)).toEqual([3, 1, 2]);
    for (const t of view.tabs) expect(t.count).toBe(t.cards.length);
    // API counts 는 숨긴 도약계좌까지 세서 적금이 2개
    const apiSaving = Object.values(result.counts.saving).reduce((a, b) => a + b, 0);
    expect(apiSaving).toBe(2);
  });

  it("첫 화면에서 고른 탭을 먼저 열고, 없으면 대출", () => {
    expect(initialTab("saving")).toBe("saving");
    expect(initialTab("housing")).toBe("housing");
    expect(initialTab(null)).toBe("loan");
  });
});

describe("신규 가입 종료 상품", () => {
  it("P01: 가입 중이 아닌 청년도약계좌는 숨겨요", () => {
    const view = viewOf("P01");
    const all = view.tabs.flatMap((t) => ids(t.cards));
    expect(all).not.toContain("youth-leap-account");
    expect(ids(tab(view, "saving").cards)).toEqual(["youth-future-saving"]);
  });

  it("P02: 가입 중인 청년도약계좌는 '가입 중' 카드로 적금 탭 맨 아래에 있어요", () => {
    const saving = tab(viewOf("P02"), "saving");
    expect(saving.count).toBe(2);
    const last = saving.cards[saving.cards.length - 1];
    expect(last.productId).toBe("youth-leap-account");
    expect(last.kind).toBe("owned");
    expect(last.badge).toBe("가입 중");
    expect(last.filterStatus).toBeNull();
    expect(last.judgement.owned).toBe(true);
  });

  it("P02: 가입 중 카드는 상태 칩 개수에 들어가지 않아요", () => {
    expect(chipCounts(tab(viewOf("P02"), "saving"))).toEqual({ eligible: 1, needsCheck: 0, ineligible: 0 });
  });
});

describe("카드", () => {
  it("엔진 판정과 상품 데이터를 그대로 들고 있어요 (04 카드 내용용)", () => {
    const card = tab(viewOf("P01"), "saving").cards[0];
    expect(card.judgement.productId).toBe("youth-future-saving");
    expect(card.product?.id).toBe("youth-future-saving");
    expect(card.badge).toBe("가능");
  });

  it("P02: 청년미래적금은 '가능 · 전환 필요'", () => {
    const card = tab(viewOf("P02"), "saving").cards.find((c) => c.productId === "youth-future-saving");
    expect(card?.kind).toBe("eligibleSwitch");
    expect(card?.badge).toBe("가능 · 전환 필요");
    expect(card?.filterStatus).toBe("eligible");
  });
});

describe("정렬", () => {
  it("가능 → 확인 필요 → 해당 없음 → 가입 중 순서예요 (엔진 순서와 상관없이)", () => {
    const input = profileInput("P02");
    const result = judge(input);
    const reversed: JudgeResponse = { ...result, results: [...result.results].reverse() };
    const order = ["eligible", "needsCheck", "ineligible", null];
    for (const t of buildResultView(reversed, input, products).tabs) {
      const ranks = t.cards.map((c) => order.indexOf(c.filterStatus));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
    expect(ids(tab(buildResultView(reversed, input, products), "saving").cards)).toEqual([
      "youth-future-saving",
      "youth-leap-account",
    ]);
  });

  it("P02 대출 탭: 가능 1개 다음 해당 없음 2개", () => {
    const loan = tab(viewOf("P02"), "loan");
    expect(loan.cards.map((c) => c.kind)).toEqual(["eligible", "ineligible", "ineligible"]);
    expect(loan.cards[0].productId).toBe("youth-jeonse-loan");
  });
});

describe("상태 칩과 필터", () => {
  it("탭 안 상태별 개수, 0이면 비활성", () => {
    const loan = tab(viewOf("P01"), "loan");
    expect(loan.chips.map((c) => [c.label, c.count, c.disabled])).toEqual([
      ["가능", 2, false],
      ["확인 필요", 0, true],
      ["해당 없음", 1, false],
    ]);
  });

  it("P08: 모름이 많으면 확인 필요 칩에 모여요", () => {
    expect(chipCounts(tab(viewOf("P08"), "loan"))).toEqual({ eligible: 0, needsCheck: 2, ineligible: 1 });
  });

  it("칩을 누르면 그 상태만, 필터가 없으면 전체(가입 중 포함)", () => {
    const saving = tab(viewOf("P02"), "saving");
    expect(ids(filterCards(saving, null))).toEqual(["youth-future-saving", "youth-leap-account"]);
    expect(ids(filterCards(saving, "eligible"))).toEqual(["youth-future-saving"]);
    expect(filterCards(saving, "ineligible")).toEqual([]);

    const loan = tab(viewOf("P01"), "loan");
    expect(ids(filterCards(loan, "ineligible"))).toEqual(["youth-jeonse-loan"]);
  });

  it("같은 칩을 다시 누르면 해제, 다른 칩은 바꿔요", () => {
    expect(toggleFilter(null, "eligible")).toBe("eligible");
    expect(toggleFilter("eligible", "eligible")).toBeNull();
    expect(toggleFilter("eligible", "ineligible")).toBe("ineligible");
  });
});

describe("조건 요약 줄", () => {
  it("P02: 만 나이 · 연소득 · 가구 형태 · 무주택 세대주 · 가입 상품 이름", () => {
    expect(viewOf("P02").summary).toEqual([
      "만 31세",
      "연소득 4,200만원",
      "1인 가구",
      "무주택 세대주",
      "가입: 청년도약계좌",
    ]);
  });

  it("P01: 가입 상품이 없으면 '가입 상품 없음'", () => {
    expect(viewOf("P01").summary).toEqual(["만 27세", "연소득 3,000만원", "1인 가구", "무주택 세대주", "가입 상품 없음"]);
  });

  it("P08: 모름 항목은 빼요", () => {
    expect(viewOf("P08").summary).toEqual(["만 26세", "1인 가구"]);
  });

  it("소득 없음, 주택·세대주 한쪽만 모름, 그 밖의 가구 형태", () => {
    const input: UserInput = {
      ...profileInput("P01"),
      annualIncome: 0,
      householdType: "withParents",
      ownsHouse: null,
      isHouseholdHead: false,
      ownedProductIds: null,
    };
    expect(summarizeInput(input, TODAY, new Map(products.map((p) => [p.id, p])))).toEqual(["만 27세", "소득 없음", "부모님과 함께", "세대원"]);
  });

  it("입력값이 없으면 요약 줄도 비어요", () => {
    expect(buildResultView(judge(profileInput("P01")), null, products).summary).toEqual([]);
  });
});

function card(view: ResultView, productId: string): ResultCard {
  const found = view.tabs.flatMap((t) => t.cards).find((c) => c.productId === productId);
  if (!found) throw new Error(`카드 ${productId} 없음`);
  return found;
}

describe("카드 내용", () => {
  it("가능: ✔ 충족 조건에 신청 시 확인 조건이 섞이지 않아요", () => {
    const c = card(viewOf("P02"), "youth-jeonse-loan");
    expect(c.kind).toBe("eligible");
    expect(c.metLabels).toEqual(["나이", "연소득 (부부합산)", "무주택", "세대주", "전세 계약"]);
    const checkAtApplyLabels = c.judgement.conditions.filter((x) => x.status === "checkAtApply").map((x) => x.label);
    expect(checkAtApplyLabels.length).toBeGreaterThan(0);
    for (const l of checkAtApplyLabels) expect(c.metLabels).not.toContain(l);
  });

  it("가능: 혜택 요약은 benefits.summary 앞 2줄", () => {
    const c = card(viewOf("P02"), "youth-jeonse-loan");
    expect(c.product?.benefits.summary.length).toBeGreaterThan(2);
    expect(c.benefitLines).toEqual(c.product?.benefits.summary.slice(0, 2));
  });

  it("신청 시 확인 조건 개수: 버팀목 7개, 미래적금 2개, 주택드림 0개", () => {
    const view = viewOf("P02");
    expect(card(view, "youth-jeonse-loan").checkAtApplyCount).toBe(7);
    expect(card(view, "youth-future-saving").checkAtApplyCount).toBe(2);
    expect(card(view, "youth-housing-dream").checkAtApplyCount).toBe(0);
  });

  it("확인 필요: 모름 조건 label 만, 신청 시 확인 조건 개수도 보여줘요", () => {
    const c = card(viewOf("P08"), "youth-rent-loan");
    expect(c.kind).toBe("needsCheck");
    expect(c.unknownLabels).toEqual(["연소득 (부부합산)", "무주택", "단독세대주"]);
    expect(c.metLabels).toEqual([]);
    expect(c.benefitLines).toEqual([]);
    expect(c.reason).toBeNull();
    expect(c.checkAtApplyCount).toBe(8);
  });

  it("해당 없음: 핵심 이유(summaryReason) 한 줄만", () => {
    const c = card(viewOf("P02"), "sunshine-loan-youth");
    expect(c.kind).toBe("ineligible");
    expect(c.reason).toBe(c.judgement.summaryReason);
    expect(c.reason).toBe("연소득 4,200만원 → 소득 조건(3,500만원 이하) 미충족");
    expect(c.metLabels).toEqual([]);
    expect(c.unknownLabels).toEqual([]);
    expect(c.benefitLines).toEqual([]);
    expect(c.checkAtApplyCount).toBe(0);
  });

  it("가입 중: 카드 내용 줄이 없어요", () => {
    const c = card(viewOf("P02"), "youth-leap-account");
    expect([c.metLabels, c.unknownLabels, c.benefitLines, c.warnings]).toEqual([[], [], [], []]);
    expect(c.reason).toBeNull();
  });

  it("카드는 상품 상세 화면 링크예요", () => {
    for (const t of viewOf("P02").tabs) {
      for (const c of t.cards) expect(c.href).toBe(`/products/${c.productId}`);
    }
    expect(productHref("youth-future-saving")).toBe("/products/youth-future-saving");
  });
});

describe("경고 띠", () => {
  it("P02: 미래적금 '가능 · 전환 필요' + 경고 띠 + 갈아타기 순서 링크", () => {
    const saving = tab(viewOf("P02"), "saving");
    expect(saving.cards[0].badge).toBe("가능 · 전환 필요");
    expect(visibleWarnings(saving, null)).toEqual([
      {
        productId: "youth-future-saving",
        kind: "owned",
        text: "청년미래적금은 가입 중인 청년도약계좌와 동시에 가입할 수 없어요.",
        switchHref: "/products/youth-future-saving",
      },
    ]);
  });

  it("P02: 충돌이 없는 탭에는 경고 띠가 없어요", () => {
    const view = viewOf("P02");
    expect(visibleWarnings(tab(view, "loan"), null)).toEqual([]);
    expect(visibleWarnings(tab(view, "housing"), null)).toEqual([]);
  });

  it("P08: 가입 여부 모름이면 확인 필요 카드 위에 '가입 중이라면' 안내", () => {
    const view = viewOf("P08");
    const saving = visibleWarnings(tab(view, "saving"), null);
    expect(saving).toHaveLength(1);
    expect(saving[0].kind).toBe("unknown");
    expect(saving[0].text).toBe(
      "청년도약계좌에 가입 중이라면 청년미래적금과 동시에 가입할 수 없어요. 가입 여부를 확인해 주세요.",
    );
    // 미래적금에는 도약계좌에서 갈아타는 안내가 있어서 링크도 보여줘요
    expect(saving[0].switchHref).toBe("/products/youth-future-saving");

    const loan = tab(view, "loan");
    expect(visibleWarnings(loan, null).map((w) => [w.productId, w.kind, w.switchHref])).toEqual([["youth-rent-loan", "unknown", null]]);
  });

  it("P08: 해당 없음 카드의 충돌은 엔진이 줘도 보여주지 않아요", () => {
    const view = viewOf("P08");
    const jeonse = card(view, "youth-jeonse-loan");
    expect(jeonse.kind).toBe("ineligible");
    expect(jeonse.judgement.conflicts.length).toBeGreaterThan(0);
    expect(jeonse.warnings).toEqual([]);
    expect(visibleWarnings(tab(view, "loan"), null).map((w) => w.productId)).not.toContain("youth-jeonse-loan");
  });

  it("상태 칩으로 거르면 보이는 카드의 경고 띠만 남아요", () => {
    const loan = tab(viewOf("P08"), "loan");
    const rent = loan.cards.find((c) => c.productId === "youth-rent-loan")!;
    expect(rent.filterStatus).not.toBeNull();
    expect(visibleWarnings(loan, rent.filterStatus).map((w) => w.productId)).toEqual(["youth-rent-loan"]);
    for (const chip of loan.chips) {
      const shown = visibleWarnings(loan, chip.status);
      const cardIds = filterCards(loan, chip.status).map((c) => c.productId);
      for (const w of shown) expect(cardIds).toContain(w.productId);
      if (chip.status !== rent.filterStatus) expect(shown.map((w) => w.productId)).not.toContain("youth-rent-loan");
    }
  });
});

describe("경고 띠 문구", () => {
  it("owned: 가입 중인 상품과 실제로 동시 가입이 안 된다고 말해요 (받침에 맞는 조사)", () => {
    expect(conflictText("청년미래적금", { kind: "owned", conflictingProductName: "청년도약계좌" })).toBe(
      "청년미래적금은 가입 중인 청년도약계좌와 동시에 가입할 수 없어요.",
    );
    expect(conflictText("청년도약계좌", { kind: "owned", conflictingProductName: "청년미래적금" })).toBe(
      "청년도약계좌는 가입 중인 청년미래적금과 동시에 가입할 수 없어요.",
    );
  });

  it("unknown: 가입 여부를 모르니 '가입 중이라면' 조건부로만 말해요", () => {
    const text = conflictText("청년도약계좌", { kind: "unknown", conflictingProductName: "청년미래적금" });
    expect(text).toBe("청년미래적금에 가입 중이라면 청년도약계좌와 동시에 가입할 수 없어요. 가입 여부를 확인해 주세요.");
    expect(conflictText("청년미래적금", { kind: "unknown", conflictingProductName: "청년도약계좌" })).toContain(
      "청년미래적금과 동시에",
    );
  });
});

describe("카드 배지", () => {
  it("판정 배지는 상태 이름과 같아요", () => {
    expect(CARD_BADGE).toEqual({
      eligible: "가능",
      needsCheck: "확인 필요",
      ineligible: "해당 없음",
      owned: "가입 중",
      eligibleSwitch: "가능 · 전환 필요",
    });
  });
});
