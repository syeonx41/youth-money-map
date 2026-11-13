/** 나이 계산 */

/** "YYYY-MM-DD" → [년, 월, 일]. 형식이 틀리면 null */
export function parseDate(value: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo, d];
}

/** 만 나이를 개월 단위로 계산 (생일이 안 지난 달은 빼요) */
export function ageInMonths(birthDate: string, today: string): number | null {
  const b = parseDate(birthDate);
  const t = parseDate(today);
  if (!b || !t) return null;
  let months = (t[0] - b[0]) * 12 + (t[1] - b[1]);
  if (t[2] < b[2]) months -= 1;
  return months;
}

/** 만 나이(년) */
export function manAge(birthDate: string, today: string): number | null {
  const months = ageInMonths(birthDate, today);
  return months === null ? null : Math.floor(months / 12);
}

/**
 * 병역 기간을 뺀 만 나이.
 * 상품이 인정하는 최대 개월 수(maxMonths)까지만 빼요.
 * 예) 만 36세 1개월, 병역 24개월, 최대 72개월 → 만 34세
 */
export function ageAfterMilitary(
  birthDate: string,
  today: string,
  militaryMonths: number,
  maxMonths: number,
): number | null {
  const months = ageInMonths(birthDate, today);
  if (months === null) return null;
  const deducted = Math.max(0, Math.min(militaryMonths, maxMonths));
  return Math.floor((months - deducted) / 12);
}
