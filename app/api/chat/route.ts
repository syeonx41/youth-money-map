/**
 * POST /api/chat  — ④ 담당
 *
 * 요청 예시: { productId: string, judgement: ProductJudgement, question: string }
 * 원칙
 * - 사용자 입력 원본(UserInput)은 AI에 보내지 않고 판정 결과(judgement)만 보내요
 * - 근거는 상품의 conditions[].sourceText 와 noticeExcerpt 로 한정해요
 * - 공고에 없는 내용은 "공식 신청처에서 확인해 주세요"로 답해요
 * - API 키는 process.env.AI_API_KEY 에서만 읽어요 (.env, Vercel 환경변수)
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ errors: ["챗봇 API는 ④ 담당이 구현 예정이에요"] }, { status: 501 });
}
