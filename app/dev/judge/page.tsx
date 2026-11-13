"use client";
// ① 개발용: 화면이 완성되기 전에 판정 API를 직접 확인하는 페이지 (제출 전 삭제해도 돼요)
import { useState } from "react";
import { requestJudge } from "@/lib/api/client";
import type { JudgeResponse, UserInput } from "@/types";

const SAMPLE: UserInput = {
  birthDate: "1999-03-15",
  militaryMonths: 0,
  region: "서울",
  annualIncome: 3000,
  employment: "employee",
  householdType: "single",
  householdSize: 1,
  householdIncome: 3000,
  ownsHouse: false,
  isHouseholdHead: true,
  residence: "jeonse",
  ownedProductIds: ["sample-saving-b"],
  mainBank: null,
};

const BADGE = { eligible: "가능", needsCheck: "확인 필요", ineligible: "해당 없음" } as const;

export default function DevJudgePage() {
  const [text, setText] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState<JudgeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      setResult(await requestJudge(JSON.parse(text)));
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <main className="flex flex-col gap-3 px-4 py-6 text-sm">
      <h1 className="text-lg font-semibold">판정 API 테스트</h1>
      <label htmlFor="input" className="text-gray-600">
        입력값(UserInput, 모름은 null)
      </label>
      <textarea
        id="input"
        className="h-72 rounded border border-gray-400 p-2 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" onClick={run} className="h-11 rounded bg-gray-800 font-semibold text-white">
        판정하기
      </button>
      {error && <p className="text-red-700">{error}</p>}
      {result?.results.map((r) => (
        <section key={r.productId} className="rounded border border-gray-300 p-3">
          <div className="flex justify-between font-semibold">
            <span>{r.productName}</span>
            <span>{r.owned ? "가입 중" : BADGE[r.status]}</span>
          </div>
          <ul className="mt-2 list-disc pl-5 text-xs text-gray-700">
            {r.conditions.map((c) => (
              <li key={c.conditionId}>{c.reason}</li>
            ))}
          </ul>
          {r.conflicts.map((c) => (
            <p key={c.conflictingProductId} className="mt-2 text-xs text-amber-800">
              ⚠ {c.message}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
