// ④ 담당: 상품 상세 / 해당 없음 상세 (와이어프레임 ④-1 ~ ④-3)
// - 상품 정보: lib/data.ts 의 getProduct(id) 또는 fetchProduct(id)
// - 판정 결과(ProductJudgement)는 결과 화면에서 넘겨받기 (방법은 ③과 정하기)
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="px-5 py-8">
      <h1 className="text-xl font-semibold">상품 상세</h1>
      <p className="mt-2 text-sm text-gray-600">TODO(④): {id} 상세 화면</p>
    </main>
  );
}
