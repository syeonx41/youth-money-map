"use client";
// ③ 담당: 조건 입력 단계별 화면 (와이어프레임 ②-1 ~ ②-5)
// 선택값은 공유 세션 draft 에만 두고, 여기서는 그리기와 updateDraft 만 해요.
import { products } from "@/lib/data";
import { manAge, todayInSeoul } from "@/lib/engine";
import {
  EMPLOYMENT_OPTIONS,
  HOUSEHOLD_OPTIONS,
  REGION_OPTIONS,
  RESIDENCE_OPTIONS,
  chooseOwned,
  parseBirthDigits,
  toggleOwnedProduct,
  type DraftErrors,
  type InputDraft,
} from "@/lib/session/input-draft";

export interface StepProps {
  draft: InputDraft;
  updateDraft: (patch: Partial<InputDraft>) => void;
  /** "다음"을 눌렀을 때 이 단계에서 나온 오류 */
  errors: DraftErrors;
}

const UNKNOWN_NOTE = "모름 → '확인 필요'로 표시돼요";

/* ------------------------------------------------------------------ */
/* 공통 조각                                                            */
/* ------------------------------------------------------------------ */

function StepTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  const className = "text-sm font-medium text-gray-700";
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <p className={className}>{children}</p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-700">
      {message}
    </p>
  );
}

/** 고르는 버튼. '모름'은 점선(dashed)으로 그려요 */
function Choice({
  selected,
  dashed = false,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  dashed?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const border = selected
    ? "border-2 border-gray-800 bg-gray-100 font-semibold"
    : dashed
      ? "border border-dashed border-gray-400 bg-gray-50"
      : "border border-gray-300 bg-white";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-12 rounded-lg px-3 py-2 text-sm ${border} ${className}`}
    >
      {children}
    </button>
  );
}

function NumberInput({
  id,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  allowComma = false,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  disabled?: boolean;
  allowComma?: boolean;
  maxLength?: number;
}) {
  return (
    <>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(allowComma ? /[^\d,]/g : /\D/g, ""))}
        aria-invalid={error !== undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-13 w-full rounded-lg border border-gray-400 px-4 text-base disabled:bg-gray-100 disabled:text-gray-400"
      />
      <FieldError id={`${id}-error`} message={error} />
    </>
  );
}

/** 같은 값을 다시 누르면 선택을 풀어요 */
function toggle<T>(current: T | null, value: T): T | null {
  return current === value ? null : value;
}

/* ------------------------------------------------------------------ */
/* 1단계 나이                                                           */
/* ------------------------------------------------------------------ */

export function AgeStep({ draft, updateDraft, errors }: StepProps) {
  const birth = draft.birthDigits.length === 8 ? parseBirthDigits(draft.birthDigits) : null;
  const age = birth?.ok ? manAge(birth.date, todayInSeoul()) : null;

  return (
    <>
      <StepTitle title="생년월일을 알려주세요" description="만 나이로 자동 계산해요. 병역 기간은 아래에서 따로 받아요." />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="birth">생년월일 (8자리)</FieldLabel>
        <NumberInput
          id="birth"
          maxLength={8}
          placeholder="예: 19990315"
          value={draft.birthDigits}
          onChange={(birthDigits) => updateDraft({ birthDigits })}
          error={errors.birthDigits}
        />
        {/* "다음"을 눌러 칸 아래 오류가 이미 보이면 같은 문구를 한 번 더 보여주지 않아요 */}
        {birth && (birth.ok || !errors.birthDigits) && (
          <p
            className={`rounded-lg border px-4 py-3 text-sm ${
              birth.ok ? "border-gray-200 bg-gray-50 text-gray-800" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {birth.ok ? `→ 만 ${age}세로 계산돼요` : birth.error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>사는 지역</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {REGION_OPTIONS.map((region) => (
            <Choice
              key={region}
              selected={draft.region === region}
              onClick={() => updateDraft({ region: toggle(draft.region, region) })}
            >
              {region}
            </Choice>
          ))}
          <Choice
            dashed
            selected={draft.region === "unknown"}
            onClick={() => updateDraft({ region: toggle(draft.region, "unknown") })}
            className="col-span-3"
          >
            모름
          </Choice>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>병역 이행 기간 (선택)</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          <Choice
            selected={draft.military === "none"}
            onClick={() => updateDraft({ military: toggle(draft.military, "none") })}
          >
            해당 없음
          </Choice>
          <Choice
            selected={draft.military === "served"}
            onClick={() => updateDraft({ military: toggle(draft.military, "served") })}
          >
            다녀왔어요
          </Choice>
          <Choice
            dashed
            selected={draft.military === "unknown"}
            onClick={() => updateDraft({ military: toggle(draft.military, "unknown") })}
          >
            모름
          </Choice>
        </div>
        {draft.military === "served" && (
          <>
            <FieldLabel htmlFor="military-months">복무 기간 (개월)</FieldLabel>
            <NumberInput
              id="military-months"
              maxLength={3}
              placeholder="예: 18 · 일부 상품은 나이 계산에서 빼줘요"
              value={draft.militaryMonthsText}
              onChange={(militaryMonthsText) => updateDraft({ militaryMonthsText })}
              error={errors.militaryMonthsText}
            />
            <p className="text-xs text-gray-500">모르면 비워두세요 → &apos;확인 필요&apos;로 표시돼요</p>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2단계 소득                                                           */
/* ------------------------------------------------------------------ */

export function IncomeStep({ draft, updateDraft, errors }: StepProps) {
  return (
    <>
      <StepTitle title="작년 연소득이 어느 정도인가요?" description="세전 기준이에요. 정확하지 않아도 괜찮아요." />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="income">연소득 (만원)</FieldLabel>
        <NumberInput
          id="income"
          allowComma
          maxLength={9}
          placeholder="예: 3000"
          value={draft.incomeText}
          onChange={(incomeText) => updateDraft({ incomeText, incomeChoice: null })}
          error={errors.incomeText}
        />
        <Choice
          selected={draft.incomeChoice === "none"}
          onClick={() => updateDraft({ incomeChoice: toggle(draft.incomeChoice, "none"), incomeText: "" })}
          className="text-left"
        >
          소득 없음 (학생 · 취준생)
        </Choice>
        <Choice
          dashed
          selected={draft.incomeChoice === "unknown"}
          onClick={() => updateDraft({ incomeChoice: toggle(draft.incomeChoice, "unknown"), incomeText: "" })}
          className="text-left"
        >
          {UNKNOWN_NOTE}
        </Choice>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>일하는 형태 (우대금리 · 지원금 판정에 써요)</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {EMPLOYMENT_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              selected={draft.employment === option.value}
              onClick={() => updateDraft({ employment: toggle(draft.employment, option.value) })}
            >
              {option.label}
            </Choice>
          ))}
          <Choice
            dashed
            selected={draft.employment === "unknown"}
            onClick={() => updateDraft({ employment: toggle(draft.employment, "unknown") })}
          >
            모름
          </Choice>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 3단계 가구                                                           */
/* ------------------------------------------------------------------ */

export function HouseholdStep({ draft, updateDraft, errors }: StepProps) {
  const single = draft.householdType === "single";

  return (
    <>
      <StepTitle title="지금 누구와 살고 있나요?" description="가구 소득 기준이 있는 상품 판정에 써요." />

      <div className="flex flex-col gap-2">
        {HOUSEHOLD_OPTIONS.map((option) => (
          <Choice
            key={option.value}
            selected={draft.householdType === option.value}
            onClick={() => updateDraft({ householdType: toggle(draft.householdType, option.value) })}
            className="text-left"
          >
            {draft.householdType === option.value ? "● " : "○ "}
            {option.label}
          </Choice>
        ))}
        <Choice
          dashed
          selected={draft.householdType === "unknown"}
          onClick={() => updateDraft({ householdType: toggle(draft.householdType, "unknown") })}
          className="text-left"
        >
          모름 / 기타
        </Choice>
      </div>

      {single ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          ⓘ 1인 가구는 가구원 수 1명, 가구 소득은 본인 연소득으로 계산해요.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="household-size">가구원 수 (본인 포함, 명)</FieldLabel>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <NumberInput
                  id="household-size"
                  maxLength={2}
                  placeholder="예: 4"
                  value={draft.householdSizeChoice === "unknown" ? "" : draft.householdSizeText}
                  disabled={draft.householdSizeChoice === "unknown"}
                  onChange={(householdSizeText) => updateDraft({ householdSizeText })}
                  error={errors.householdSizeText}
                />
              </div>
              <Choice
                dashed
                selected={draft.householdSizeChoice === "unknown"}
                onClick={() =>
                  updateDraft({ householdSizeChoice: toggle(draft.householdSizeChoice, "unknown"), householdSizeText: "" })
                }
                className="h-13 w-20 shrink-0"
              >
                모름
              </Choice>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="household-income">가구 전체 연소득 (만원)</FieldLabel>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <NumberInput
                  id="household-income"
                  allowComma
                  maxLength={9}
                  placeholder="모르면 비워두세요 → '확인 필요'로 표시"
                  value={draft.householdIncomeChoice === "unknown" ? "" : draft.householdIncomeText}
                  disabled={draft.householdIncomeChoice === "unknown"}
                  onChange={(householdIncomeText) => updateDraft({ householdIncomeText })}
                  error={errors.householdIncomeText}
                />
              </div>
              <Choice
                dashed
                selected={draft.householdIncomeChoice === "unknown"}
                onClick={() =>
                  updateDraft({
                    householdIncomeChoice: toggle(draft.householdIncomeChoice, "unknown"),
                    householdIncomeText: "",
                  })
                }
                className="h-13 w-20 shrink-0"
              >
                모름
              </Choice>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 4단계 주택                                                           */
/* ------------------------------------------------------------------ */

type YesNo = "yes" | "no" | "unknown" | null;

/** 두 가지 + 모름. options 순서대로 그려요 */
function YesNoUnknown({
  value,
  options,
  onChange,
}: {
  value: YesNo;
  options: [{ value: "yes" | "no"; label: string }, { value: "yes" | "no"; label: string }];
  onChange: (value: YesNo) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <Choice key={option.value} selected={value === option.value} onClick={() => onChange(toggle(value, option.value))}>
          {option.label}
        </Choice>
      ))}
      <Choice dashed selected={value === "unknown"} onClick={() => onChange(toggle(value, "unknown"))}>
        모름
      </Choice>
    </div>
  );
}

export function HousingStep({ draft, updateDraft }: StepProps) {
  return (
    <>
      <StepTitle title="집이 있나요?" description="청약 · 전세대출 판정에 써요." />

      <div className="flex flex-col gap-2">
        <FieldLabel>본인 명의 주택</FieldLabel>
        <YesNoUnknown
          value={draft.ownsHouse}
          options={[
            { value: "no", label: "없음" },
            { value: "yes", label: "있음" },
          ]}
          onChange={(ownsHouse) => updateDraft({ ownsHouse })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>세대주인가요?</FieldLabel>
        <YesNoUnknown
          value={draft.isHouseholdHead}
          options={[
            { value: "yes", label: "예" },
            { value: "no", label: "아니오" },
          ]}
          onChange={(isHouseholdHead) => updateDraft({ isHouseholdHead })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>지금 사는 형태</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {RESIDENCE_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              selected={draft.residence === option.value}
              onClick={() => updateDraft({ residence: toggle(draft.residence, option.value) })}
            >
              {option.label}
            </Choice>
          ))}
          <Choice
            dashed
            selected={draft.residence === "unknown"}
            onClick={() => updateDraft({ residence: toggle(draft.residence, "unknown") })}
            className="col-span-2"
          >
            모름
          </Choice>
        </div>
      </div>

      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        ⓘ 세대주 = 주민등록상 가구의 대표자예요. 등본에서 확인할 수 있어요.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 5단계 가입 중인 상품                                                  */
/* ------------------------------------------------------------------ */

function CheckRow({
  checked,
  dashed = false,
  onChange,
  children,
}: {
  checked: boolean;
  dashed?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  const border = checked
    ? "border-2 border-gray-800"
    : dashed
      ? "border border-dashed border-gray-400 bg-gray-50"
      : "border border-gray-300";
  return (
    <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-4 py-3 ${border}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-5 shrink-0 accent-gray-800" />
      <span className="flex flex-col text-sm">{children}</span>
    </label>
  );
}

export function OwnedStep({ draft, updateDraft }: StepProps) {
  return (
    <>
      <StepTitle
        title="이미 가입한 상품이 있나요?"
        description="중복 가입 제한과 갈아타기 순서를 알려드릴게요. 여러 개 고를 수 있어요."
      />

      <div className="flex flex-col gap-2">
        {products.map((product) => (
          <CheckRow
            key={product.id}
            checked={draft.ownedProductIds.includes(product.id)}
            onChange={() => updateDraft(toggleOwnedProduct(draft, product.id))}
          >
            <span>{product.name}</span>
            {product.newSignupClosed && (
              <span className="text-xs text-gray-500">{product.signupClosedNote ?? "신규 가입 종료"}</span>
            )}
          </CheckRow>
        ))}
        <CheckRow dashed checked={draft.ownedChoice === "none"} onChange={() => updateDraft(chooseOwned(draft, "none"))}>
          없어요
        </CheckRow>
        <CheckRow
          dashed
          checked={draft.ownedChoice === "unknown"}
          onChange={() => updateDraft(chooseOwned(draft, "unknown"))}
        >
          <span>잘 모르겠어요</span>
          <span className="text-xs text-gray-500">결과에서 동시 가입 제한을 확인하라고 알려드려요</span>
        </CheckRow>
      </div>
    </>
  );
}
