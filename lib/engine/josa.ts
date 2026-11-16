/**
 * 받침에 맞는 조사를 붙여요.
 * 예) withJosa("청년도약계좌", "과", "와") → "청년도약계좌와"
 *     withJosa("청년미래적금", "과", "와") → "청년미래적금과"
 * 마지막 글자가 한글이 아니면(영문·숫자·괄호 등) 받침 없는 쪽을 써요.
 */
export function withJosa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.trim().charCodeAt(word.trim().length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = isHangul && (last - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? withFinal : withoutFinal}`;
}
