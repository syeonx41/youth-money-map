// ④ 담당: 상품 상세 (와이어프레임 화면 11 ~ 13)
// - 상품 정보는 lib/data.ts 의 getProduct(id)
// - 판정 결과는 ③ 공유 세션(useJudgeSession)에서 꺼내요 → ProductDetailWithSession
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { todayInSeoul } from "@/lib/engine";
import ProductDetailWithSession from "./ProductDetailWithSession";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return <ProductDetailWithSession product={product} today={todayInSeoul()} />;
}
