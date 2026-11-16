/**
 * ④ 챗봇 요청 검사. 화면에서 온 값은 그대로 믿지 않고, 쓰는 칸만 골라 새로 만들어요.
 * (상품 정보와 공고 원문은 요청에서 받지 않고 서버의 data/products.json 에서 꺼내요)
 */
import type {
  ConditionResult,
  ConditionStatus,
  ConflictWarning,
  JudgeStatus,
  Product,
  ProductJudgement,
} from "@/types";
import { CHAT_LIMITS, type ChatRequest, type ChatTurn } from "./contract";

type Result = { ok: true; request: ChatRequest } | { ok: false; error: string };

const JUDGE_STATUS: JudgeStatus[] = ["eligible", "needsCheck", "ineligible"];
const CONDITION_STATUS: ConditionStatus[] = ["met", "unmet", "unknown", "checkAtApply"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function parseCondition(raw: unknown, product: Product): ConditionResult | null {
  if (!isObject(raw)) return null;
  const condition = product.conditions.find((c) => c.id === raw.conditionId);
  const status = raw.status as ConditionStatus;
  if (!condition || !CONDITION_STATUS.includes(status)) return null;
  // 이름·원문은 서버 데이터로, 상태·이유만 판정 결과에서 가져와요
  return {
    conditionId: condition.id,
    type: condition.type,
    label: condition.label,
    status,
    reason: str(raw.reason, 300),
    sourceText: condition.sourceText,
  };
}

function parseConflict(raw: unknown, products: Product[]): ConflictWarning | null {
  if (!isObject(raw)) return null;
  const other = products.find((p) => p.id === raw.conflictingProductId);
  if (!other || (raw.kind !== "owned" && raw.kind !== "unknown")) return null;
  return {
    kind: raw.kind,
    conflictingProductId: other.id,
    conflictingProductName: other.name,
    message: str(raw.message, 300),
  };
}

function parseJudgement(raw: unknown, products: Product[]): ProductJudgement | null {
  if (!isObject(raw)) return null;
  const product = products.find((p) => p.id === raw.productId);
  const status = raw.status as JudgeStatus;
  if (!product || !JUDGE_STATUS.includes(status)) return null;
  const conditions = Array.isArray(raw.conditions) ? raw.conditions : [];
  const conflicts = Array.isArray(raw.conflicts) ? raw.conflicts : [];
  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    status,
    summaryReason: str(raw.summaryReason, 300),
    conditions: conditions.map((c) => parseCondition(c, product)).filter((c): c is ConditionResult => c !== null),
    owned: raw.owned === true,
    signupClosed: product.newSignupClosed === true,
    conflicts: conflicts.map((c) => parseConflict(c, products)).filter((c): c is ConflictWarning => c !== null),
  };
}

export function parseChatRequest(body: unknown, products: Product[]): Result {
  if (!isObject(body)) return { ok: false, error: "요청 형식이 올바르지 않아요" };

  const productId = body.productId ?? null;
  if (productId !== null && !products.some((p) => p.id === productId)) {
    return { ok: false, error: "상품을 찾을 수 없어요" };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, error: "질문이 없어요" };
  }
  const messages: ChatTurn[] = [];
  for (const m of body.messages.slice(-CHAT_LIMITS.maxMessages)) {
    if (!isObject(m) || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return { ok: false, error: "대화 형식이 올바르지 않아요" };
    }
    const max = m.role === "user" ? CHAT_LIMITS.questionMaxLength : CHAT_LIMITS.answerMaxLength;
    if (m.role === "user" && m.content.length > max) {
      return { ok: false, error: `질문은 ${max}자까지 쓸 수 있어요` };
    }
    messages.push({ role: m.role, content: m.content.slice(0, max) });
  }
  // 첫 메시지는 질문이어야 해요 (잘라낸 뒤 답변으로 시작하면 빼요)
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  const last = messages.at(-1);
  if (!last || last.role !== "user" || last.content.trim() === "") {
    return { ok: false, error: "마지막 메시지는 질문이어야 해요" };
  }

  const rawJudgements = Array.isArray(body.judgements) ? body.judgements.slice(0, products.length) : [];
  const judgements = rawJudgements
    .map((j) => parseJudgement(j, products))
    .filter((j): j is ProductJudgement => j !== null)
    .filter((j) => productId === null || j.productId === productId);

  return { ok: true, request: { productId: productId as string | null, judgements, messages } };
}
