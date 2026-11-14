"use client";
// ③ 담당: 조건 입력 5단계 (와이어프레임 ②-1 ~ ②-5)
// - 단계는 ?step=1~5 로 바꿔요. URL 에는 단계 번호만 들어가요 (입력값은 넣지 않아요)
// - 선택값은 공유 세션(draft)에만 두고, draftToUserInput 으로 UserInput 을 만들어 판정해요
// - "다음"은 히스토리에 추가하고, "이전"·휴대폰 뒤로가기는 이전 단계로 가요
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { requestJudge } from "@/lib/api/client";
import {
  INPUT_STEPS,
  STEP_COUNT,
  draftToUserInput,
  errorsForStep,
  firstStepWithErrors,
  parseStep,
  type DraftErrors,
  type InputDraft,
} from "@/lib/session/input-draft";
import { useJudgeSession } from "@/lib/session/judge-session";
import { AgeStep, HouseholdStep, HousingStep, IncomeStep, OwnedStep, type StepProps } from "./steps";

/** 단계 목록과 같은 길이의 화면 목록 */
type StepViews<Steps extends readonly unknown[]> = { [I in keyof Steps]: (props: StepProps) => React.ReactNode };

/** INPUT_STEPS 와 같은 순서·같은 개수 (개수가 다르면 타입 오류) */
const STEP_VIEWS: StepViews<typeof INPUT_STEPS> = [
  AgeStep,
  IncomeStep,
  HouseholdStep,
  HousingStep,
  OwnedStep,
];

/**
 * 판정 요청 실패 종류
 * - input: 4xx. 입력값 문제라 다시 시도해도 같아요
 * - retry: 네트워크·5xx. 다시 시도할 수 있어요
 */
type RequestFailure = "input" | "retry";

/** requestJudge 는 "판정 요청 실패 (상태코드)" 오류를 던져요. 4xx 면 input, 나머지는 retry */
function failureKind(error: unknown): RequestFailure {
  return error instanceof Error && /\(4\d\d\)/.test(error.message) ? "input" : "retry";
}

export default function InputPage() {
  return (
    <Suspense fallback={null}>
      <InputFlow />
    </Suspense>
  );
}

function InputFlow() {
  const router = useRouter();
  const step = parseStep(useSearchParams().get("step"));
  const { draft, updateDraft, setJudged } = useJudgeSession();
  const [errors, setErrors] = useState<DraftErrors>({});
  const [requestFailure, setRequestFailure] = useState<RequestFailure | null>(null);
  const [loading, setLoading] = useState(false);

  // 이 화면 안에서 쌓은 히스토리 수. 0 이면 "이전"이 뒤로가기 대신 이전 단계로 바꿔요
  // (주소창에 ?step=3 을 바로 넣고 들어온 경우 뒤로가기가 앱 밖으로 나가지 않게)
  const depth = useRef(0);
  const lastStep = useRef(step);
  // 단계를 옮긴 뒤 보여줄 오류 (결과 보기를 눌렀는데 앞 단계에 오류가 있을 때)
  const carriedErrors = useRef<DraftErrors | null>(null);
  useEffect(() => {
    if (step > lastStep.current) depth.current += 1;
    if (step < lastStep.current) depth.current = Math.max(0, depth.current - 1);
    lastStep.current = step;
    setErrors(carriedErrors.current ?? {});
    // 실패 안내는 결과 보기를 누른 마지막 단계에서만 보여줘요
    setRequestFailure(null);
    carriedErrors.current = null;
    window.scrollTo(0, 0);
  }, [step]);

  const isLast = step === STEP_COUNT;
  const StepView = STEP_VIEWS[step - 1];

  /** 입력을 고치면 그 칸의 오류 문구는 지워요 (다시 확인은 다음·결과 보기에서) */
  function editDraft(patch: Partial<InputDraft>) {
    updateDraft(patch);
    setErrors((current) => {
      const keys = Object.keys(patch) as (keyof InputDraft)[];
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  }

  function goBack() {
    if (depth.current > 0) router.back();
    else router.replace(`/input?step=${step - 1}`);
  }

  async function judge() {
    const converted = draftToUserInput(draft);
    if (!converted.ok) {
      // 주소로 바로 5단계에 들어와 생년월일이 없는 경우 등: 오류가 있는 첫 단계로 보내요
      const firstBad = firstStepWithErrors(converted.errors) ?? step;
      const badErrors = errorsForStep(converted.errors, firstBad);
      if (firstBad === step) setErrors(badErrors);
      else {
        carriedErrors.current = badErrors;
        // 히스토리에 쌓지 않고 바꿔요. 이 단계부터는 "이전"이 뒤로가기 대신 바로 앞 단계로 가요
        depth.current = 0;
        router.replace(`/input?step=${firstBad}`);
      }
      return;
    }
    setRequestFailure(null);
    setLoading(true);
    try {
      const result = await requestJudge(converted.input);
      setJudged(converted.input, result);
      router.push("/result");
    } catch (error) {
      setRequestFailure(failureKind(error));
    } finally {
      setLoading(false);
    }
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (isLast) {
      void judge();
      return;
    }
    const converted = draftToUserInput(draft);
    const stepErrors = converted.ok ? {} : errorsForStep(converted.errors, step);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    router.push(`/input?step=${step + 1}`);
  }

  const { name } = INPUT_STEPS[step - 1];

  return (
    <form onSubmit={next} noValidate className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-gray-200 px-5 py-4">
        {step === 1 ? (
          <Link href="/" className="text-sm text-gray-600">
            ← 처음
          </Link>
        ) : (
          <button type="button" onClick={goBack} className="text-sm text-gray-600">
            ← 이전
          </button>
        )}
        <h1 className="text-lg font-bold">내 조건 입력</h1>
      </header>

      <div className="flex flex-col gap-2 px-5 pt-5">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {step} / {STEP_COUNT} 단계
          </span>
          <span>{name}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step}
          aria-label={`${step} / ${STEP_COUNT} 단계 · ${name}`}
          className="h-1.5 overflow-hidden rounded-full bg-gray-200"
        >
          <div className="h-full rounded-full bg-gray-700" style={{ width: `${(step / STEP_COUNT) * 100}%` }} />
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-6 px-5 py-6">
        <StepView draft={draft} updateDraft={editDraft} errors={errors} />
        {step > 1 && (
          <p className="text-xs text-gray-500">생년월일 말고는 몰라도 괜찮아요. 고르지 않은 항목은 &apos;확인 필요&apos;로 표시돼요.</p>
        )}
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-gray-200 bg-white px-5 py-4">
        {isLast && requestFailure === "input" && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            판정할 수 없는 입력이에요. 입력값을 확인해 주세요.
          </p>
        )}
        {isLast && requestFailure === "retry" && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">판정 요청에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => void judge()}
              disabled={loading}
              className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700"
            >
              다시 시도
            </button>
          </div>
        )}
        <div className="grid grid-cols-[2fr_3fr] gap-3">
          {step === 1 ? (
            <Link href="/" className="flex h-13 items-center justify-center rounded-lg border border-gray-400 bg-white">
              이전
            </Link>
          ) : (
            <button type="button" onClick={goBack} className="h-13 rounded-lg border border-gray-400 bg-white">
              이전
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-13 rounded-lg bg-gray-800 font-semibold text-white disabled:opacity-60"
          >
            {isLast ? (loading ? "판정하는 중…" : "결과 보기") : "다음"}
          </button>
        </div>
      </footer>
    </form>
  );
}
