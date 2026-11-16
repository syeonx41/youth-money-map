import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { judgeAll } from "@/lib/engine";
import { medianIncome, products } from "@/lib/data";
import profiles from "@/lib/engine/__tests__/profiles.json";
import type { UserInput } from "@/types";
import { AGE_RULE_NOTE, buildMaterial, relatedProducts, verifyCitations, withAgeRuleNote, withSavingLimitNote } from "../prompt";
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

describe("나이 질문 안내 고정 (④)", () => {
  it("상품을 보며 나이·병역을 물었는데 '상품마다' 안내가 없으면 붙임", () => {
    const out = withAgeRuleNote("만 34세라서 충족했어요.", "저 36살인데 군대 다녀왔으면 가입돼요?", "youth-future-saving");
    expect(out).toContain(AGE_RULE_NOTE);
  });

  it("이미 안내가 있거나, 나이 질문이 아니거나, 상품 없이 물으면 그대로", () => {
    expect(withAgeRuleNote("다른 상품은 기준이 달라요.", "나이 어떻게 계산해요?", "youth-future-saving")).not.toContain(AGE_RULE_NOTE);
    expect(withAgeRuleNote("6%예요.", "정부 기여금은 얼마나 받아요?", "youth-future-saving")).not.toContain(AGE_RULE_NOTE);
    expect(withAgeRuleNote("답", "나이 조건이 뭐예요?", null)).not.toContain(AGE_RULE_NOTE);
  });
});

describe("적금 납입 조건 고정 (④)", () => {
  const future = products.find((p) => p.id === "youth-future-saving")!;
  const loan = products.find((p) => p.id === "youth-jeonse-loan")!;

  it("기여금을 물었는데 월 한도·만기가 빠지면 납입 조건을 붙임", () => {
    const out = withSavingLimitNote("일반형은 6%예요.", "정부 기여금은 얼마나 받아요?", future);
    expect(out).toContain("납입 조건: 월 1천원~50만원 자유 납입 (연 600만원 한도), 3년 만기");
  });

  it("이미 50만원·3년이 있거나, 금액 질문이 아니거나, 대출 상품이면 그대로", () => {
    const full = "월 최대 50만원, 3년 만기예요.";
    expect(withSavingLimitNote(full, "정부 기여금은 얼마나 받아요?", future)).toBe(full);
    expect(withSavingLimitNote("답", "지금 바로 가입할 수 있어요?", future)).toBe("답");
    expect(withSavingLimitNote("답", "대출 얼마나 돼요?", loan)).toBe("답");
  });
});

describe("POST /api/chat (④, Gemini 는 가짜로 대체)", () => {
  const generateContent = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    generateContent.mockReset();
    vi.doMock("@google/genai", async (orig) => {
      const real = (await orig()) as typeof import("@google/genai");
      class FakeGoogleGenAI {
        models = { generateContent };
      }
      return { ...real, GoogleGenAI: FakeGoogleGenAI };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@google/genai");
  });

  async function post(body: unknown) {
    const { POST } = await import("../route");
    return POST(new Request("http://test/api/chat", { method: "POST", body: JSON.stringify(body) }));
  }

  const reply = (obj: unknown, finishReason = "STOP") => ({
    text: JSON.stringify(obj),
    candidates: [{ finishReason }],
  });

  it("API 키가 없으면 503", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await post({ productId: null, judgements: [], messages: ask("안녕") });
    expect(res.status).toBe(503);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("답변을 돌려주고, 지어낸 인용은 빼고, 입력 원본은 보내지 않음", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue(
      reply({
        answer: "네, 갈아탈 수 있어요.",
        citations: [
          { label: "갈아타기 원문", quote: "계좌개설 전 청년도약계좌 해지시 갈아타기 불가" },
          { label: "지어냄", quote: "무조건 이득이에요" },
        ],
        followUps: ["손해는 없어요?"],
      }),
    );

    const res = await post({ productId: "youth-future-saving", judgements: [future], messages: ask("갈아탈 수 있어요?") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe("네, 갈아탈 수 있어요.");
    expect(data.citations).toEqual([{ label: "갈아타기 원문", quote: "계좌개설 전 청년도약계좌 해지시 갈아타기 불가" }]);

    const params = generateContent.mock.calls[0][0];
    expect(params.model).toMatch(/^gemini-/);
    expect(params.contents).toEqual([{ role: "user", parts: [{ text: "갈아탈 수 있어요?" }] }]);
    expect(params.config.systemInstruction).toContain("<자료>");
    expect(JSON.stringify(params)).not.toContain(P02.input.birthDate!);
  });

  it("이전 AI 답변은 model 역할로 보냄", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue(reply({ answer: "답", citations: [], followUps: [] }));
    const messages = [...ask("q1"), { role: "assistant", content: "a1" }, ...ask("q2")];
    await post({ productId: null, judgements: [], messages });
    expect(generateContent.mock.calls[0][0].contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
  });

  it("안전 필터로 막히면 422", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "", candidates: [{ finishReason: "SAFETY" }] });
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(422);
  });

  it("사용량 초과(429)면 429", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { ApiError } = await vi.importActual<typeof import("@google/genai")>("@google/genai");
    generateContent.mockRejectedValue(new ApiError({ message: "quota", status: 429 }));
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(429);
  });

  it("기본 모델이 혼잡(503)하면 다른 모델로 한 번 더 물어봄", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { ApiError } = await vi.importActual<typeof import("@google/genai")>("@google/genai");
    generateContent
      .mockRejectedValueOnce(new ApiError({ message: "overloaded", status: 503 }))
      .mockResolvedValueOnce(reply({ answer: "답", citations: [], followUps: [] }));
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(200);
    const [first, second] = generateContent.mock.calls.map((c) => c[0].model);
    expect(first).not.toBe(second);
  });

  it("두 모델 모두 혼잡하면 502", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { ApiError } = await vi.importActual<typeof import("@google/genai")>("@google/genai");
    generateContent.mockRejectedValue(new ApiError({ message: "overloaded", status: 503 }));
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(502);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("응답이 너무 오래 걸리면 504 (배포 시간 제한 전에 끝냄)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(504);
  });

  it("형식이 깨진 답변이면 502", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "{\"answer\": 1}", candidates: [{ finishReason: "STOP" }] });
    const res = await post({ productId: null, judgements: [], messages: ask("질문") });
    expect(res.status).toBe(502);
  });
});
