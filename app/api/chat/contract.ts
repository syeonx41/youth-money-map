/**
 * ④ 챗봇 API 요청·응답 형식 (POST /api/chat). 챗봇 화면과 API가 같이 써요.
 *
 * 개인정보 원칙: 사용자 입력 원본(UserInput)은 보내지 않고, 판정 결과(ProductJudgement)만 보내요.
 */
import type { ProductJudgement } from "@/types";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  /** 보고 있던 상품 id. 결과 화면에서 바로 열었으면 null (전체 결과 기준으로 답해요) */
  productId: string | null;
  /** 판정 결과. 상품을 보고 있었으면 그 상품 것만, 아니면 전체. 판정 전이면 [] */
  judgements: ProductJudgement[];
  /** 지금까지 대화. 마지막은 사용자 질문이에요 */
  messages: ChatTurn[];
}

/** 답변 근거 1개: 어느 자료의 어떤 원문인지 */
export interface ChatCitation {
  label: string;
  quote: string;
}

export interface ChatReply {
  answer: string;
  /** 서버가 자료 원문과 대조해서 실제로 있는 문장만 남겨요 */
  citations: ChatCitation[];
  /** 이어서 물어볼 만한 질문 */
  followUps: string[];
}

export const CHAT_LIMITS = {
  /** 질문 한 번 최대 글자 수 */
  questionMaxLength: 500,
  /** 이전 답변 최대 글자 수 (넘으면 잘라서 보내요) */
  answerMaxLength: 2000,
  /** 보내는 대화 최대 개수 (질문+답변) */
  maxMessages: 12,
} as const;
