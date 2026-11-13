// ③ 담당: 결과 화면 (와이어프레임 ③-1 ~ ③-3)
// - JudgeResponse.results 를 category(loan/saving/housing) 탭으로 나눠 표시
// - 카드: productName, status 배지, summaryReason, conflicts 경고
// - 카드 클릭 → /products/[productId]
export default function ResultPage() {
  return (
    <main className="px-5 py-8">
      <h1 className="text-xl font-semibold">조회 결과</h1>
      <p className="mt-2 text-sm text-gray-600">TODO(③): 대출 · 적금 · 청약 탭</p>
    </main>
  );
}
