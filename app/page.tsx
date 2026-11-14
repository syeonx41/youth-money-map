// ③ 담당: 첫 화면 (와이어프레임 ① 첫 화면)
// 대표 일러스트 자리는 이미지가 없어서 비워 둬요.
import Link from "next/link";
import { products } from "@/lib/data";
import { latestAsOf, toDotDate } from "@/lib/home/data-as-of";
import { CategoryButtons, StartButton } from "./home-buttons";

const NOTICES = ["로그인 없이 이용", "입력 정보는 저장하지 않아요", "실제 신청은 공식 신청처로 연결"];

export default function HomePage() {
  const asOf = latestAsOf(products);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 px-5 py-4">
        <p className="text-lg font-bold">청년머니맵</p>
      </header>

      <main className="flex flex-col gap-5 px-5 py-8">
        <h1 className="text-2xl font-bold leading-snug">
          조건 한 번 입력으로
          <br />
          나에게 맞는 청년 금융상품 찾기
        </h1>
        <p className="text-sm leading-relaxed text-gray-600">
          대출 · 적금 · 청약 상품을 한 화면에서 비교하고, 상품별 혜택과 정부지원 내용도 함께 보여드려요.
        </p>

        <StartButton />

        <ul className="flex flex-col gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
          {NOTICES.map((text) => (
            <li key={text}>✓ {text}</li>
          ))}
        </ul>

        <CategoryButtons />

        <Link href="/dev/judge" className="text-center text-xs text-gray-500 underline">
          (개발용) 판정 API 테스트
        </Link>
      </main>

      <footer className="mt-auto border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
        정보 출처: 각 기관 공식 공고{asOf && ` · 기준일 ${toDotDate(asOf)}`}
      </footer>
    </div>
  );
}
