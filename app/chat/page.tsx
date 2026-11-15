// ④ 담당: AI에게 물어보기 (와이어프레임 화면 15) → POST /api/chat
// - /chat?productId=xxx : 상품 상세에서 열면 그 상품 기준
// - /chat              : 결과 화면에서 열면 전체 조회 결과 기준
import { getProduct } from "@/lib/data";
import ChatView from "./ChatView";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const { productId } = await searchParams;
  const product = productId ? getProduct(productId) : undefined;

  return <ChatView productId={product?.id ?? null} />;
}
