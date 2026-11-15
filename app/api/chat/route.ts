/**
 * POST /api/chat — ④ 담당 (상품 Q&A 챗봇)
 *
 * 요청: ChatRequest (contract.ts)   응답: ChatReply 또는 { errors: string[] }
 * 원칙
 * - 사용자 입력 원본(UserInput)은 받지도 보내지도 않고, 판정 결과만 AI에 보내요
 * - 근거는 상품 데이터(sourceText, noticeExcerpt 등)와 판정 결과로 한정하고, 인용은 서버가 원문과 대조해요
 * - 공고에 없는 내용은 "공식 신청처에서 확인"으로 답해요
 * - 질문·답변은 저장하지 않고 로그에도 남기지 않아요
 * - API 키는 process.env.ANTHROPIC_API_KEY 에서만 읽어요 (.env, Vercel 환경변수)
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { products } from "@/lib/data";
import { todayInSeoul } from "@/lib/engine";
import type { ChatReply } from "./contract";
import { SYSTEM_RULES, buildMaterial, verifyCitations } from "./prompt";
import { parseChatRequest } from "./validate";

const MODEL = "claude-opus-5-5";

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
  if (!process.env.ANTHROPIC_API_KEY) {
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
  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // 거절되면 서버가 알맞은 대체 모델로 다시 답해요
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // 대화형 답변이라 빠르게 답하도록 낮은 effort 를 써요
      output_config: { effort: "low", format: { type: "json_schema", schema: REPLY_JSON_SCHEMA } },
      system: [
        { type: "text", text: SYSTEM_RULES },
        { type: "text", text: material.text },
      ],
      messages: parsed.request.messages,
    });

    if (response.stop_reason === "refusal") {
      return fail(422, "이 질문에는 답할 수 없어요. 상품 조건이나 혜택에 대해 물어봐 주세요");
    }
    if (response.stop_reason === "max_tokens") {
      return fail(502, "답변이 너무 길어져서 멈췄어요. 질문을 조금 좁혀서 다시 물어봐 주세요");
    }

    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
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
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "지금 질문이 많아요. 잠시 후 다시 시도해 주세요");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[chat] Claude API 오류 ${error.status}`);
      return fail(502, "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요");
    }
    if (error instanceof SyntaxError) {
      return fail(502, "답변을 만들지 못했어요. 다시 시도해 주세요");
    }
    console.error("[chat] 알 수 없는 오류");
    return fail(500, "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요");
  }
}
