/** ④ 챗봇 추천 질문: 보고 있는 상품과 판정 결과에 맞춰 골라요 */
import type { Product, ProductJudgement } from "@/types";

export function suggestedQuestions(product: Product | null, judgement: ProductJudgement | null): string[] {
  if (!product) {
    return ["'가능' 상품 혜택을 비교해 줘요", "'확인 필요'는 왜 나와요?", "신청 일정이 가까운 상품은요?"];
  }

  const list: string[] = [];
  if (judgement?.conflicts.some((c) => c.switchGuide)) list.push("갈아타면 손해 없어요?");
  if (judgement?.status === "ineligible" && !judgement.signupClosed) list.push("왜 해당 없음이에요?");
  if (judgement?.status === "needsCheck") list.push("뭘 확인하면 돼요?");
  if (judgement?.status === "eligible") list.push("왜 가능으로 나왔어요?");
  if (product.benefits.governmentSupports?.length) list.push("정부 지원은 얼마나 받아요?");
  list.push("지금 신청할 수 있어요?", "필요 서류는요?");
  return list.slice(0, 3);
}
