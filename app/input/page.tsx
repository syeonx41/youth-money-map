// ③ 담당: 조건 입력 5단계 (와이어프레임 ②-1 ~ ②-5)
// - 초기값은 lib/api/client.ts 의 EMPTY_INPUT
// - '모름'은 null, 마지막 단계에서 requestJudge(input) 호출 후 /result 로 이동
export default function InputPage() {
  return (
    <main className="px-5 py-8">
      <h1 className="text-xl font-semibold">내 조건 입력</h1>
      <p className="mt-2 text-sm text-gray-600">TODO(③): 나이 → 소득 → 가구 → 주택 → 가입 상품</p>
    </main>
  );
}
