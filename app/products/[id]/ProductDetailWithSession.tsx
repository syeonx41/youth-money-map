"use client";
// ④ 상품 상세: ③ 공유 세션에서 이 상품의 판정 결과를 꺼내 화면에 넘겨요.
// 세션은 메모리에만 있어서, 새로고침하거나 결과 화면을 거치지 않고 들어오면 판정 없이 보여줘요.
import { useJudgeSession } from "@/lib/session/judge-session";
import type { Product } from "@/types";
import ProductDetail from "./ProductDetail";

export default function ProductDetailWithSession({ product, today }: { product: Product; today: string }) {
  const { result } = useJudgeSession();
  const judgement = result?.results.find((r) => r.productId === product.id) ?? null;

  return (
    <ProductDetail
      product={product}
      judgement={judgement}
      otherResults={result?.results}
      today={today}
      noJudgementNote={
        result
          ? undefined
          : "입력한 정보는 저장하지 않아서, 새로고침하면 판정 결과가 사라져요. 내 조건을 입력하면 조건마다 가능 여부를 알려드려요."
      }
    />
  );
}
