// ③ 담당: 첫 화면 (와이어프레임 ① 첫 화면)
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-5 px-5 py-8">
      <h1 className="text-2xl font-bold leading-snug">
        조건 한 번 입력으로
        <br />
        나에게 맞는 청년 금융상품 찾기
      </h1>
      <p className="text-sm text-gray-600">TODO(③): 서비스 소개, 로그인 없음·정보 저장 안 함 안내</p>
      <Link href="/input" className="flex h-13 items-center justify-center rounded-lg bg-gray-800 font-semibold text-white">
        내 조건으로 찾기
      </Link>
      <Link href="/dev/judge" className="text-center text-xs text-gray-500 underline">
        (개발용) 판정 API 테스트
      </Link>
    </main>
  );
}
