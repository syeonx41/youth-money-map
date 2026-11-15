// ④ 개발용 미리보기: ⑤ 정답 프로필(profiles.json)로 판정한 결과를 상세 화면에 넣어 확인해요
// 예: /products/youth-future-saving/preview?profile=P02
// 배포(production)에서는 열리지 않아요. 결과 화면(③) 연결이 끝나면 지워도 돼요
import Link from "next/link";
import { notFound } from "next/navigation";
import type { UserInput } from "@/types";
import { getProduct, medianIncome, products } from "@/lib/data";
import { judgeAll, todayInSeoul } from "@/lib/engine";
import profiles from "@/lib/engine/__tests__/profiles.json";
import ProductDetail from "../ProductDetail";

interface Profile {
  id: string;
  description: string;
  input: UserInput;
}

export default async function ProductDetailPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ profile?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { id } = await params;
  const { profile: profileId = "P01" } = await searchParams;
  const product = getProduct(id);
  const list = profiles as unknown as Profile[];
  const profile = list.find((p) => p.id === profileId);
  if (!product || !profile) notFound();

  const today = todayInSeoul();
  const res = judgeAll({ mainBank: null, ...profile.input }, products, medianIncome, today);
  const judgement = res.results.find((r) => r.productId === id) ?? null;

  return (
    <>
      <div className="bg-yellow-100 px-4 py-2 text-xs">
        <p className="font-semibold">
          개발용 미리보기 · {profile.id} {profile.description}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-2">
          {list.map((p) => (
            <Link key={p.id} href={`/products/${id}/preview?profile=${p.id}`} className={p.id === profile.id ? "font-bold" : "underline"}>
              {p.id}
            </Link>
          ))}
        </div>
      </div>
      <ProductDetail
        product={product}
        judgement={judgement}
        otherResults={res.results}
        today={today}
        productHref={(pid) => `/products/${pid}/preview?profile=${profile.id}`}
      />
    </>
  );
}
