/**
 * POST /api/judge
 * 요청: UserInput (types.ts)  ※ 빠진 항목은 '모름'(null)으로 처리
 * 응답: JudgeResponse (types.ts)
 */
import { NextResponse } from "next/server";
import { judgeAll, parseUserInput } from "@/lib/engine";
import { medianIncome, products } from "@/lib/data";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["JSON 형식이 아니에요"] }, { status: 400 });
  }

  const parsed = parseUserInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  // 개인정보 원칙: 입력값은 판정에만 쓰고 저장하거나 로그로 남기지 않아요
  return NextResponse.json(judgeAll(parsed.input, products, medianIncome));
}
