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
 * 가구 연소득(만원)을 기준 중위소득 대비 %로 환산해요. 반올림하지 않은 값이에요.
 * 조건 비교는 반드시 이 값으로 해요. (반올림 후 비교하면 150.01%가 150%로 통과돼요)
 */
export function householdIncomeRatioExact(
  table: MedianIncomeTable,
  householdIncomeManwon: number,
  householdSize: number,
): number | null {
  const monthly = monthlyMedianIncome(table, householdSize);
  if (monthly === null || householdIncomeManwon < 0) return null;
  const annualWon = householdIncomeManwon * 10000;
  return (annualWon / (monthly * 12)) * 100;
}

/**
 * 화면 표시용 기준 중위소득 %. 소수점 첫째 자리까지 반올림해요.
 * 예) 1인 가구, 연 3,000만원 → 3,000만 ÷ (2,564,238원 × 12) ≈ 97.5%
 */
export function householdIncomeRatio(
  table: MedianIncomeTable,
  householdIncomeManwon: number,
  householdSize: number,
): number | null {
  const exact = householdIncomeRatioExact(table, householdIncomeManwon, householdSize);
  return exact === null ? null : Math.round(exact * 10) / 10;
}

/**
 * % 표시 문구. 보통은 소수점 첫째 자리까지 보여주고,
 * 반올림하면 기준값과 같아 보이는데 실제로는 다를 때만 둘째 자리까지 보여줘요.
 * 예) 150.01% → "150.01%" (150.0%로 보이면 충족처럼 오해할 수 있어서)
 */
export function formatRatio(exact: number, limits: number[] = []): string {
  const one = Math.round(exact * 10) / 10;
  const near = limits.find((limit) => one === limit && exact !== limit);
  if (near === undefined) return `${one}%`;

  const two = Math.round(exact * 100) / 100;
  if (two !== near) return `${two.toFixed(2)}%`;
  // 둘째 자리까지도 기준값과 같으면 "48% 미만" / "150% 초과"로 보여줘요
  return `${near}% ${exact > near ? "초과" : "미만"}`;
}

/** 3000 → "3,000만원" */
export function formatManwon(value: number): string {
  return `${value.toLocaleString("ko-KR")}만원`;
}
