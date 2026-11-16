/**
 * POST /api/chat — ④ 담당 (상품 Q&A 챗봇)
 *
 * 요청: ChatRequest (contract.ts)   응답: ChatReply 또는 { errors: string[] }
 * 원칙
 * - 사용자 입력 원본(UserInput)은 받지도 보내지도 않고, 판정 결과만 AI에 보내요
 * - 근거는 상품 데이터(sourceText, noticeExcerpt 등)와 판정 결과로 한정하고, 인용은 서버가 원문과 대조해요
 * - 공고에 없는 내용은 "공식 신청처에서 확인"으로 답해요
 * - 질문·답변은 저장하지 않고 로그에도 남기지 않아요
 * - AI는 Google Gemini API 를 써요. 키는 process.env.GEMINI_API_KEY 에서만 읽어요 (.env, Vercel 환경변수)
 */
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { products } from "@/lib/data";
import { todayInSeoul } from "@/lib/engine";
import type { ChatReply } from "./contract";
import { SYSTEM_RULES, buildMaterial, verifyCitations } from "./prompt";
import { parseChatRequest } from "./validate";

/** 기본 모델. 바꾸려면 GEMINI_MODEL 환경변수에 모델 이름을 넣어요 */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/**
 * 배포(Vercel)에서 이 API가 기다려 주는 최대 시간(초). 기본값이 짧으면 답변 중간에 끊겨요.
 * AI 호출은 그보다 먼저(AI_TIMEOUT_MS) 끝내서, 끊기는 대신 안내 문구를 돌려줘요.
 */
export const maxDuration = 60;
const AI_TIMEOUT_MS = 50_000;

/** 모델 답변 형식 (구조화 출력으로 강제하고, 받은 뒤 한 번 더 검사해요) */
const ReplySchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ label: z.string(), quote: z.string() })),
  followUps: z.array(z.string()),
});

const REPLY_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, quote: { type: "string" } },
        required: ["label", "quote"],
        additionalProperties: false,
      },
    },
    followUps: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "citations", "followUps"],
  additionalProperties: false,
};

const fail = (status: number, message: string) => NextResponse.json({ errors: [message] }, { status });

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return fail(503, "챗봇이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "JSON 형식이 아니에요");
  }

  const parsed = parseChatRequest(body, products);
  if (!parsed.ok) return fail(400, parsed.error);

  const material = buildMaterial(parsed.request, products, todayInSeoul());
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // 서버 혼잡(503 등) 같은 일시 오류만 1번 다시 시도해요. 전체 시간은 아래 abortSignal 로 묶어요
    httpOptions: { timeout: AI_TIMEOUT_MS, retryOptions: { attempts: 2, initialDelay: 1, httpStatusCodes: [500, 502, 503] } },
  });

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents: parsed.request.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: `${SYSTEM_RULES}\n\n${material.text}`,
        responseMimeType: "application/json",
        responseJsonSchema: REPLY_JSON_SCHEMA,
        maxOutputTokens: 8192,
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      },
    });

    const finish = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason || finish === FinishReason.SAFETY || finish === FinishReason.RECITATION) {
      return fail(422, "이 질문에는 답할 수 없어요. 상품 조건이나 혜택에 대해 물어봐 주세요");
    }
    if (finish === FinishReason.MAX_TOKENS) {
      return fail(502, "답변이 너무 길어져서 멈췄어요. 질문을 조금 좁혀서 다시 물어봐 주세요");
    }

    const text = response.text ?? "";
    const reply = ReplySchema.safeParse(JSON.parse(text));
    if (!reply.success) return fail(502, "답변을 만들지 못했어요. 다시 시도해 주세요");

    const result: ChatReply = {
      answer: reply.data.answer.trim(),
      citations: verifyCitations(reply.data.citations, material.sources).slice(0, 3),
      followUps: reply.data.followUps.slice(0, 3),
    };
    return NextResponse.json(result);
  } catch (error) {
    // 질문·답변 내용은 남기지 않고 오류 종류만 남겨요
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return fail(504, "답변이 너무 오래 걸려요. 질문을 짧게 바꿔서 다시 시도해 주세요");
    }
    if (error instanceof ApiError) {
      if (error.status === 429) return fail(429, "지금 질문이 많아요. 잠시 후 다시 시도해 주세요");
      console.error(`[chat] Gemini API 오류 ${error.status}`);
      return fail(502, "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요");
    }
    if (error instanceof SyntaxError) {
      return fail(502, "답변을 만들지 못했어요. 다시 시도해 주세요");
    }
    console.error("[chat] 알 수 없는 오류");
    return fail(500, "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요");
  }
}
