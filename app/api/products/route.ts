/**
 * GET /api/products        → 상품 목록 (Product[])
 * GET /api/products?id=xxx → 상품 1개 (Product)
 */
import { NextResponse } from "next/server";
import { getProduct, products } from "@/lib/data";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json(products);

  const product = getProduct(id);
  if (!product) return NextResponse.json({ errors: [`상품 "${id}"을 찾을 수 없어요`] }, { status: 404 });
  return NextResponse.json(product);
}
