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
import { AlertIcon, CalendarIcon, CardIcon, CheckIcon, ChevronLeftIcon, HouseIcon, InfoIcon, UsersIcon, WalletIcon } from "../ui/icons";
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

/** 진행 표시 아이콘과 짧은 이름. INPUT_STEPS 와 같은 순서예요 */
const STEP_ICONS = [CalendarIcon, WalletIcon, UsersIcon, HouseIcon, CardIcon];
const STEP_SHORT_NAME = INPUT_STEPS.map((s) => (s.name === "가입 중인 상품" ? "가입 상품" : s.name));

const STEP_DOT = {
  done: "bg-go text-white",
  now: "bg-go-soft text-go-deep ring-2 ring-go",
  todo: "bg-sea text-ink-mute",
};

const BACK_LINK = "flex h-10 items-center gap-0.5 justify-self-start rounded-lg pr-2 text-sm text-ink-soft";
const PREV_BUTTON =
  "flex h-13 items-center justify-center rounded-2xl border border-line bg-white text-base font-medium text-ink active:bg-sea";

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
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-3 pb-1">
        {step === 1 ? (
          <Link href="/" className={BACK_LINK}>
            <ChevronLeftIcon size={20} />
            처음
          </Link>
        ) : (
          <button type="button" onClick={goBack} className={BACK_LINK}>
            <ChevronLeftIcon size={20} />
            이전
          </button>
        )}
        <h1 className="text-base font-semibold text-ink">내 조건 입력</h1>
        <span />
      </header>

      {/* 진행 표시: 단계마다 아이콘 하나. 지난 단계는 체크로 바뀌어요 */}
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-valuenow={step}
        aria-label={`${step} / ${STEP_COUNT} 단계, ${name}`}
        className="flex items-start px-5 pt-4"
      >
        {INPUT_STEPS.map((s, i) => {
          const n = i + 1;
          const Icon = n < step ? CheckIcon : STEP_ICONS[i];
          const state = n < step ? "done" : n === step ? "now" : "todo";
          return (
            <div key={s.name} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : n <= step ? "bg-go" : "bg-line"}`} />
                <span className={`flex size-9 items-center justify-center rounded-full ${STEP_DOT[state]}`}>
                  <Icon size={18} strokeWidth={state === "done" ? 2.25 : 1.75} />
                </span>
                <span className={`h-0.5 flex-1 ${n === STEP_COUNT ? "invisible" : n < step ? "bg-go" : "bg-line"}`} />
              </div>
              <span className={`text-xs ${state === "now" ? "font-semibold text-go-deep" : "text-ink-mute"}`}>
                {STEP_SHORT_NAME[i]}
              </span>
            </div>
          );
        })}
      </div>

      <main className="flex flex-1 flex-col gap-7 px-5 pt-7 pb-6">
        <StepView draft={draft} updateDraft={editDraft} errors={errors} />
        {step > 1 && (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-mute">
            <InfoIcon size={16} className="mt-0.5" />
            생년월일 말고는 몰라도 괜찮아요. 고르지 않은 항목은 &apos;확인 필요&apos;로 표시돼요.
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-white px-5 py-3">
        {isLast && requestFailure === "input" && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            <AlertIcon size={18} className="mt-0.5" />
            판정할 수 없는 입력이에요. 입력값을 확인해 주세요.
          </p>
        )}
        {isLast && requestFailure === "retry" && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-bad-soft px-4 py-3">
            <p className="text-sm text-bad">판정 요청에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => void judge()}
              disabled={loading}
              className="shrink-0 rounded-lg border border-bad/40 bg-white px-3 py-1.5 text-sm font-semibold text-bad"
            >
              다시 시도
            </button>
          </div>
        )}
        <div className="grid grid-cols-[2fr_3fr] gap-2.5">
          {step === 1 ? (
            <Link href="/" className={PREV_BUTTON}>
              이전
            </Link>
          ) : (
            <button type="button" onClick={goBack} className={PREV_BUTTON}>
              이전
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-13 rounded-2xl bg-go text-base font-semibold text-white active:bg-go-deep disabled:opacity-60"
          >
            {isLast ? (loading ? "판정하는 중…" : "결과 보기") : "다음"}
          </button>
        </div>
      </footer>
    </form>
  );
}
