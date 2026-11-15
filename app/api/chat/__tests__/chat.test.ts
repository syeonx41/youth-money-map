import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { judgeAll } from "@/lib/engine";
import { medianIncome, products } from "@/lib/data";
import profiles from "@/lib/engine/__tests__/profiles.json";
import type { UserInput } from "@/types";
import { buildMaterial, relatedProducts, verifyCitations } from "../prompt";
import { parseChatRequest } from "../validate";

const TODAY = "2026-11-15";
const P02 = (profiles as unknown as { id: string; input: UserInput }[]).find((p) => p.id === "P02")!;
const results = judgeAll({ mainBank: null, ...P02.input }, products, medianIncome, TODAY).results;
const future = results.find((r) => r.productId === "youth-future-saving")!;
const ask = (content: string) => [{ role: "user" as const, content }];

describe("챗봇 요청 검사 (④)", () => {
  it("없는 상품 id 는 거절", () => {
    const r = parseChatRequest({ productId: "nope", judgements: [], messages: ask("안녕") }, products);
    expect(r.ok).toBe(false);
  });

  it("질문이 없거나 너무 길면 거절", () => {
    expect(parseChatRequest({ productId: null, judgements: [], messages: [] }, products).ok).toBe(false);
    expect(parseChatRequest({ productId: null, judgements: [], messages: ask("가".repeat(501)) }, products).ok).toBe(false);
    expect(parseChatRequest({ productId: null, judgements: [], messages: ask("   ") }, products).ok).toBe(false);
  });

  it("마지막 메시지는 질문이어야 함", () => {
    const messages = [...ask("질문"), { role: "assistant", content: "답" }];
    expect(parseChatRequest({ productId: null, judgements: [], messages }, products).ok).toBe(false);
  });

  it("판정 결과의 원문·이름은 서버 데이터로 바꾸고, 보고 있는 상품 것만 남김", () => {
    const tampered = {
      ...future,
      productName: "가짜 이름",
      conditions: future.conditions.map((c) => ({ ...c, sourceText: "지어낸 원문", label: "가짜" })),
    };
    const other = results.find((r) => r.productId === "youth-housing-dream")!;
    const r = parseChatRequest(
      { productId: "youth-future-saving", judgements: [tampered, other], messages: ask("왜 가능해요?") },
      products,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.judgements).toHaveLength(1);
    const j = r.request.judgements[0];
    expect(j.productName).toBe("청년미래적금");
    expect(j.conditions.every((c) => c.sourceText !== "지어낸 원문" && c.label !== "가짜")).toBe(true);
    expect(j.status).toBe(future.status);
  });

  it("오래된 대화는 잘라내고 질문으로 시작하게 맞춤", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }));
    const r = parseChatRequest({ productId: null, judgements: [], messages }, products);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.messages.length).toBeLessThanOrEqual(12);
    expect(r.request.messages[0].role).toBe("user");
    expect(r.request.messages.at(-1)?.content).toBe("m14");
  });
});

describe("챗봇 자료 만들기 (④)", () => {
  it("미래적금을 보면 갈아타기로 얽힌 도약계좌도 자료에 넣음", () => {
    const ids = relatedProducts("youth-future-saving", products).map((p) => p.id);
    expect(ids).toContain("youth-leap-account");
    expect(ids).not.toContain("youth-jeonse-loan");
  });

  it("상품 없이 열면 전체 상품", () => {
    expect(relatedProducts(null, products)).toHaveLength(products.length);
  });

  it("오늘 날짜, 판정 결과, 갈아타기 순서가 자료에 들어감", () => {
    const m = buildMaterial({ productId: "youth-future-saving", judgements: [future], messages: ask("q") }, products, TODAY);
    expect(m.text).toContain(`<오늘>${TODAY}</오늘>`);
    expect(m.text).toContain("<판정결과 상품=\"청년미래적금\">");
    expect(m.text).toContain("갈아타는 순서");
    expect(m.text).toContain("특별중도해지");
  });

  it("판정 결과가 없으면 가능 여부를 말하지 말라고 적음", () => {
    const m = buildMaterial({ productId: "youth-future-saving", judgements: [], messages: ask("q") }, products, TODAY);
    expect(m.text).toContain("판정 결과: 없음");
  });

  it("사용자 입력 원본(생년월일 등)은 자료에 없음", () => {
    const m = buildMaterial({ productId: null, judgements: results, messages: ask("q") }, products, TODAY);
    expect(m.text).not.toContain(P02.input.birthDate!);
  });
});

describe("근거 인용 대조 (④)", () => {
  const sources = ["청년도약계좌에서 청년미래적금으로 갈아타려는 경우 ‘청년미래적금 계좌 개설 후 청년도약계좌 해지’ 필요"];

  it("자료에 있는 문장은 남김 (띄어쓰기·따옴표 차이는 무시)", () => {
    const kept = verifyCitations([{ label: "원문", quote: "청년미래적금 계좌 개설 후  청년도약계좌 해지" }], sources);
    expect(kept).toHaveLength(1);
  });

  it("지어낸 인용은 버림", () => {
    const kept = verifyCitations([{ label: "원문", quote: "신용점수 700점 이상이어야 해요" }], sources);
    expect(kept).toHaveLength(0);
  });
});

describe("POST /api/chat (④, Claude 는 가짜로 대체)", () => {
  const create = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    create.mockReset();
    vi.doMock("@anthropic-ai/sdk", async (orig) => {
      const real = (await orig()) as {
        default: { RateLimitError: unknown; APIError: unknown; APIConnectionTimeoutError: unknown };
      };
      class FakeAnthropic {
        static RateLimitError = real.default.RateLimitError;
        static APIError = real.default.APIError;
        static APIConnectionTimeoutError = real.default.APIConnectionTimeoutError;
        beta = { messages: { create } };
      }
      return { default: FakeAnthropic };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@anthropic-ai/sdk");
  });

  async function post(body: unknown) {
    const { POST } = await import("../route");
    return POST(new Request("http://test/api/chat", { method: "POST", body: JSON.stringify(body) }));
  }

  it("API 키가 없으면 503", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post({ productId: null, judgements: [], messages: ask("안녕") });
    expect(res.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("답변을 돌려주고, 지어낸 인용은 빼고, 입력 원본은 보내지 않음", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            answer: "네, 갈아탈 수 있어요.",
            citations: [
              { label: "갈아타기 원문", quote: "계좌개설 전 청년도약계좌 해지시 갈아타기 불가" },
              { label: "지어냄", quote: "무조건 이득이에요" },
            ],
            followUps: ["손해는 없어요?"],
          }),
        },
      ],
    });

    const res = await post({ productId: "youth-future-saving", judgements: [future], messages: ask("갈아탈 수 있어요?") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe("네, 갈아탈 수 있어요.");
    expect(data.citations).toEqual([{ label: "갈아타기 원문", quote: "계좌개설 전 청년도약계좌 해지시 갈아타기 불가" }]);

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(JSON.stringify(params)).not.toContain(P02.input.birthDate!);
  });

  it("거절되면 422", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    create.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(422);
  });

  it("Claude 응답이 너무 오래 걸리면 504 (배포 시간 제한 전에 끝냄)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const { default: RealAnthropic } = await vi.importActual<typeof import("@anthropic-ai/sdk")>("@anthropic-ai/sdk");
    create.mockRejectedValue(new RealAnthropic.APIConnectionTimeoutError());
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(504);
  });

  it("형식이 깨진 답변이면 502", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: "{\"answer\": 1}" }] });
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(502);
  });
});
