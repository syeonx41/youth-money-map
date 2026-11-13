/** 화면(③④)에서 API를 부를 때 쓰는 함수 */
import type { JudgeResponse, Product, UserInput } from "@/types";

export async function requestJudge(input: UserInput): Promise<JudgeResponse> {
  const res = await fetch("/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`판정 요청 실패 (${res.status})`);
  return res.json();
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`상품 조회 실패 (${res.status})`);
  return res.json();
}

/** '모름'을 모두 null 로 채운 빈 입력값. 입력 화면 초기값으로 써요 */
export const EMPTY_INPUT: UserInput = {
  birthDate: null,
  militaryMonths: null,
  region: null,
  annualIncome: null,
  employment: null,
  householdType: null,
  householdSize: null,
  householdIncome: null,
  ownsHouse: null,
  isHouseholdHead: null,
  residence: null,
  ownedProductIds: null,
  mainBank: null,
};
