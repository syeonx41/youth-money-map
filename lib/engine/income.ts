import type { MedianIncomeTable } from "@/types";

/** 가구원 수별 월 기준 중위소득(원). 표에 없는 큰 가구는 1명당 추가 금액을 더해요 */
export function monthlyMedianIncome(table: MedianIncomeTable, householdSize: number): number | null {
  if (!Number.isInteger(householdSize) || householdSize < 1) return null;
  const direct = table.monthly[String(householdSize)];
  if (direct !== undefined) return direct;

  const sizes = Object.keys(table.monthly).map(Number).sort((a, b) => a - b);
  const largest = sizes[sizes.length - 1];
  if (largest === undefined || table.perAdditionalMember === undefined) return null;
  return table.monthly[String(largest)] + (householdSize - largest) * table.perAdditionalMember;
}

/**
 * 가구 연소득(만원)을 기준 중위소득 대비 %로 환산해요. 소수점 첫째 자리까지.
 * 예) 1인 가구, 연 3,000만원 → 3,000만 ÷ (2,564,238원 × 12) ≈ 97.5%
 */
export function householdIncomeRatio(
  table: MedianIncomeTable,
  householdIncomeManwon: number,
  householdSize: number,
): number | null {
  const monthly = monthlyMedianIncome(table, householdSize);
  if (monthly === null || householdIncomeManwon < 0) return null;
  const annualWon = householdIncomeManwon * 10000;
  const ratio = (annualWon / (monthly * 12)) * 100;
  return Math.round(ratio * 10) / 10;
}

/** 3000 → "3,000만원" */
export function formatManwon(value: number): string {
  return `${value.toLocaleString("ko-KR")}만원`;
}
