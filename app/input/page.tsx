"use client";
// ③ 담당: 조건 입력 (와이어프레임 ②-1 ~ ②-5)
// - 선택값은 공유 세션(draft)에만 두고, draftToUserInput 으로 UserInput 을 만들어 판정해요
// - 지금은 1단계 생년월일만 있어요. 나머지 항목은 '모름'(null)으로 보내요 (02에서 5단계 완성)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJudge } from "@/lib/api/client";
import { draftToUserInput } from "@/lib/session/input-draft";
import { useJudgeSession } from "@/lib/session/judge-session";

export default function InputPage() {
  const router = useRouter();
  const { draft, updateDraft, setJudged } = useJudgeSession();
  const [birthError, setBirthError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRequestError(null);
    const converted = draftToUserInput(draft);
    if (!converted.ok) {
      setBirthError(converted.errors.birthDigits ?? null);
      return;
    }
    setBirthError(null);
    setLoading(true);
    try {
      const result = await requestJudge(converted.input);
      setJudged(converted.input, result);
      router.push("/result");
    } catch {
      setRequestError("판정 요청에 실패했어요. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <Link href="/" className="text-sm text-gray-600">
          ← 처음
        </Link>
        <h1 className="text-lg font-bold">내 조건 입력</h1>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5 py-6">
        <h2 className="text-xl font-bold">생년월일을 알려주세요</h2>
        <p className="text-sm text-gray-600">만 나이로 자동 계산해요.</p>
        <label htmlFor="birth" className="mt-2 text-sm font-medium text-gray-700">
          생년월일 (8자리)
        </label>
        <input
          id="birth"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          placeholder="예: 19990315"
          value={draft.birthDigits}
          onChange={(e) => updateDraft({ birthDigits: e.target.value.replace(/\D/g, "") })}
          aria-invalid={birthError !== null}
          aria-describedby={birthError ? "birth-error" : undefined}
          className="h-13 rounded-lg border border-gray-400 px-4 text-base"
        />
        {birthError && (
          <p id="birth-error" className="text-sm text-red-700">
            {birthError}
          </p>
        )}
        <p className="text-xs text-gray-500">나머지 조건은 &apos;모름&apos;으로 판정해요. &apos;확인 필요&apos;로 표시돼요.</p>
      </main>

      <footer className="flex flex-col gap-2 border-t border-gray-200 px-5 py-4">
        {requestError && (
          <p role="alert" className="text-sm text-red-700">
            {requestError}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-13 rounded-lg bg-gray-800 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "판정하는 중…" : "결과 보기"}
        </button>
      </footer>
    </form>
  );
}
