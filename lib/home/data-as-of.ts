/** ③ 첫 화면 하단 기준일: 상품 데이터 asOf 중 가장 최근 날짜 */
import type { Product } from "@/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** asOf("YYYY-MM-DD") 중 가장 최근 날짜. 상품이 없거나 형식이 다 틀리면 null */
export function latestAsOf(products: Pick<Product, "asOf">[]): string | null {
  let latest: string | null = null;
  for (const { asOf } of products) {
    if (!DATE.test(asOf ?? "")) continue;
    // YYYY-MM-DD 는 문자열 비교가 날짜 비교와 같아요
    if (latest === null || asOf > latest) latest = asOf;
  }
  return latest;
}

/** "2026-11-14" → "2026.11.14" */
export function toDotDate(date: string): string {
  return date.split("-").join(".");
}
