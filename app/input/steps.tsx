"use client";
// ③ 담당: 조건 입력 단계별 화면 (와이어프레임 ②-1 ~ ②-5)
// 선택값은 공유 세션 draft 에만 두고, 여기서는 그리기와 updateDraft 만 해요.
import { products } from "@/lib/data";
import { AlertIcon, CheckIcon, HelpIcon, InfoIcon } from "../ui/icons";
import { RegionMap } from "../ui/korea-map";
import { ProductArt } from "../ui/product-art";
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

const UNKNOWN_NOTE = "모름 ('확인 필요'로 표시돼요)";

/* ------------------------------------------------------------------ */
/* 공통 조각                                                            */
/* ------------------------------------------------------------------ */

function StepTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[22px] leading-snug font-bold tracking-tight text-ink">{title}</h2>
      <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  const className = "text-sm font-semibold text-ink";
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
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-bad">
      <AlertIcon size={16} className="mt-0.5" />
      {message}
    </p>
  );
}

/** 안내 상자 (ⓘ) */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-sea px-4 py-3 text-sm leading-relaxed text-ink-soft">
      <InfoIcon size={18} className="mt-0.5 text-ink-mute" />
      <span>{children}</span>
    </p>
  );
}

/**
 * 고르는 버튼.
 * unknown: '모름' 선택지. 물음표 아이콘을 붙이고 옅은 바탕으로 다른 선택지와 구분해요
 */
function Choice({
  selected,
  unknown = false,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  unknown?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const look = selected
    ? unknown
      ? "border-check-line bg-check-soft font-semibold text-check"
      : "border-go bg-go-soft font-semibold text-go-deep"
    : unknown
      ? "border-transparent bg-sea text-ink-soft"
      : "border-line bg-white text-ink";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[15px] transition-colors ${look} ${className}`}
    >
      {unknown && <HelpIcon size={16} className={selected ? "" : "text-ink-mute"} />}
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
  unit,
  disabled = false,
  allowComma = false,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  /** 칸 오른쪽에 보이는 단위 (만원·개월·명) */
  unit?: string;
  disabled?: boolean;
  allowComma?: boolean;
  maxLength?: number;
}) {
  return (
    <>
      <div className="relative">
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
          className={`h-13 w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-ink-mute/70 focus:border-go focus:outline-none focus:ring-2 focus:ring-go/25 disabled:bg-sea disabled:text-ink-mute ${
            error ? "border-bad" : "border-line"
          } ${unit ? "pr-14" : ""}`}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-mute">
            {unit}
          </span>
        )}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </>
  );
}

/** 같은 값을 다시 누르면 선택을 풀어요 */
function toggle<T>(current: T | null, value: T): T | null {
  return current === value ? null : value;
}

/** 지역 '모름'. 칸이 좁아서 아이콘 없이 글자만 보여줘요 */
function RegionUnknown({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-xl border text-[15px] transition-colors ${
        selected ? "border-check-line bg-check-soft font-semibold text-check" : "border-transparent bg-sea text-ink-soft"
      }`}
    >
      모름
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 1단계 나이                                                           */
/* ------------------------------------------------------------------ */

export function AgeStep({ draft, updateDraft, errors }: StepProps) {
  const birth = draft.birthDigits.length === 8 ? parseBirthDigits(draft.birthDigits) : null;
  const age = birth?.ok ? manAge(birth.date, todayInSeoul()) : null;

  return (
    <>
      <StepTitle title="생년월일과 사는 지역을 알려주세요" description="생년월일은 만 나이로 자동 계산해요." />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="birth">생년월일 8자리</FieldLabel>
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
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              birth.ok ? "bg-go-soft text-go-deep" : "bg-bad-soft text-bad"
            }`}
          >
            {birth.ok ? <CheckIcon size={18} strokeWidth={2.25} /> : <AlertIcon size={18} />}
            {birth.ok ? `만 ${age}세로 계산돼요` : birth.error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <FieldLabel>사는 지역</FieldLabel>
          <span className="text-xs text-ink-mute">지도나 아래 버튼에서 선택</span>
        </div>
        <div className="rounded-2xl bg-sea px-4 pt-5 pb-2">
          <div className="mx-auto max-w-[270px]">
            <RegionMap
            regions={REGION_OPTIONS}
            value={draft.region === "unknown" ? null : draft.region}
            onSelect={(region) => updateDraft({ region: toggle(draft.region, region) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {REGION_OPTIONS.map((region) => (
            <Choice
              key={region}
              selected={draft.region === region}
              onClick={() => updateDraft({ region: toggle(draft.region, region) })}
              className="min-h-11 px-0"
            >
              {region}
            </Choice>
          ))}
          <RegionUnknown
            selected={draft.region === "unknown"}
            onClick={() => updateDraft({ region: toggle(draft.region, "unknown") })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>병역 사항 (선택)</FieldLabel>
        <p className="text-[13px] text-ink-mute">미필·면제·비대상은 &apos;해당 없음&apos;이에요.</p>
        <div className="grid grid-cols-3 gap-2">
          <Choice
            selected={draft.military === "served"}
            onClick={() => updateDraft({ military: toggle(draft.military, "served") })}
          >
            병역필
          </Choice>
          <Choice
            selected={draft.military === "none"}
            onClick={() => updateDraft({ military: toggle(draft.military, "none") })}
          >
            해당 없음
          </Choice>
          <Choice
            unknown
            selected={draft.military === "unknown"}
            onClick={() => updateDraft({ military: toggle(draft.military, "unknown") })}
          >
            모름
          </Choice>
        </div>
        {draft.military === "served" && (
          <>
            <div className="mt-2">
              <FieldLabel htmlFor="military-months">복무 기간</FieldLabel>
            </div>
            <NumberInput
              id="military-months"
              maxLength={3}
              unit="개월"
              placeholder="예: 18"
              value={draft.militaryMonthsText}
              onChange={(militaryMonthsText) => updateDraft({ militaryMonthsText })}
              error={errors.militaryMonthsText}
            />
            <p className="text-[13px] leading-relaxed text-ink-mute">
              일부 상품은 나이를 계산할 때 복무 기간만큼 빼 줘요. 모르면 비워 두세요. &apos;확인 필요&apos;로 표시돼요.
            </p>
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
      <StepTitle title="작년 연소득을 알려주세요" description="세전 기준이에요. 대략적인 금액이어도 괜찮아요." />

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="income">연소득</FieldLabel>
        <NumberInput
          id="income"
          allowComma
          maxLength={9}
          unit="만원"
          placeholder="예: 3000"
          value={draft.incomeText}
          onChange={(incomeText) => updateDraft({ incomeText, incomeChoice: null })}
          error={errors.incomeText}
        />
        <Choice
          selected={draft.incomeChoice === "none"}
          onClick={() => updateDraft({ incomeChoice: toggle(draft.incomeChoice, "none"), incomeText: "" })}
          className="justify-start px-4"
        >
          소득 없음 (학생·취준생 등)
        </Choice>
        <Choice
          unknown
          selected={draft.incomeChoice === "unknown"}
          onClick={() => updateDraft({ incomeChoice: toggle(draft.incomeChoice, "unknown"), incomeText: "" })}
          className="justify-start px-4"
        >
          {UNKNOWN_NOTE}
        </Choice>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>취업 상태</FieldLabel>
        <p className="text-[13px] text-ink-mute">우대금리와 정부지원금 판정에 써요.</p>
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
            unknown
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

/** 하나만 고르는 목록의 동그라미 표시 */
function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      className={`mr-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
        on ? "border-go" : "border-line"
      }`}
    >
      {on && <span className="size-2.5 rounded-full bg-go" />}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 3단계 가구                                                           */
/* ------------------------------------------------------------------ */

export function HouseholdStep({ draft, updateDraft, errors }: StepProps) {
  const single = draft.householdType === "single";

  return (
    <>
      <StepTitle title="가구 상황을 알려주세요" description="가구 소득 기준이 있는 상품 판정에 써요." />

      <div className="flex flex-col gap-2">
        {HOUSEHOLD_OPTIONS.map((option) => (
          <Choice
            key={option.value}
            selected={draft.householdType === option.value}
            onClick={() => updateDraft({ householdType: toggle(draft.householdType, option.value) })}
            className="justify-start px-4"
          >
            <RadioDot on={draft.householdType === option.value} />
            {option.label}
          </Choice>
        ))}
        <Choice
          unknown
          selected={draft.householdType === "unknown"}
          onClick={() => updateDraft({ householdType: toggle(draft.householdType, "unknown") })}
          className="justify-start px-4"
        >
          기타·모름
        </Choice>
      </div>

      {single ? (
        <Note>1인 가구는 가구원 수 1명, 가구 소득은 본인 연소득으로 계산해요.</Note>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="household-size">가구원 수 (본인 포함)</FieldLabel>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <NumberInput
                  id="household-size"
                  maxLength={2}
                  unit="명"
                  placeholder="예: 4"
                  value={draft.householdSizeChoice === "unknown" ? "" : draft.householdSizeText}
                  disabled={draft.householdSizeChoice === "unknown"}
                  onChange={(householdSizeText) => updateDraft({ householdSizeText })}
                  error={errors.householdSizeText}
                />
              </div>
              <Choice
                unknown
                selected={draft.householdSizeChoice === "unknown"}
                onClick={() =>
                  updateDraft({ householdSizeChoice: toggle(draft.householdSizeChoice, "unknown"), householdSizeText: "" })
                }
                className="h-13 w-[5.5rem] shrink-0"
              >
                모름
              </Choice>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="household-income">가구 전체 연소득</FieldLabel>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <NumberInput
                  id="household-income"
                  allowComma
                  maxLength={9}
                  unit="만원"
                  placeholder="예: 6000"
                  value={draft.householdIncomeChoice === "unknown" ? "" : draft.householdIncomeText}
                  disabled={draft.householdIncomeChoice === "unknown"}
                  onChange={(householdIncomeText) => updateDraft({ householdIncomeText })}
                  error={errors.householdIncomeText}
                />
              </div>
              <Choice
                unknown
                selected={draft.householdIncomeChoice === "unknown"}
                onClick={() =>
                  updateDraft({
                    householdIncomeChoice: toggle(draft.householdIncomeChoice, "unknown"),
                    householdIncomeText: "",
                  })
                }
                className="h-13 w-[5.5rem] shrink-0"
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
      <Choice unknown selected={value === "unknown"} onClick={() => onChange(toggle(value, "unknown"))}>
        모름
      </Choice>
    </div>
  );
}

export function HousingStep({ draft, updateDraft }: StepProps) {
  return (
    <>
      <StepTitle title="주택과 거주 상황을 알려주세요" description="청약과 전세대출 판정에 써요." />

      <div className="flex flex-col gap-2">
        <FieldLabel>본인 명의 주택</FieldLabel>
        <YesNoUnknown
          value={draft.ownsHouse}
          options={[
            { value: "no", label: "무주택" },
            { value: "yes", label: "보유" },
          ]}
          onChange={(ownsHouse) => updateDraft({ ownsHouse })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>세대주 여부</FieldLabel>
        <YesNoUnknown
          value={draft.isHouseholdHead}
          options={[
            { value: "yes", label: "세대주" },
            { value: "no", label: "세대원" },
          ]}
          onChange={(isHouseholdHead) => updateDraft({ isHouseholdHead })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel>현재 거주 형태</FieldLabel>
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
            unknown
            selected={draft.residence === "unknown"}
            onClick={() => updateDraft({ residence: toggle(draft.residence, "unknown") })}
            className="col-span-2"
          >
            모름
          </Choice>
        </div>
      </div>

      <Note>세대주는 주민등록상 세대의 대표자예요. 주민등록등본에서 확인할 수 있어요.</Note>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 5단계 가입 중인 상품                                                  */
/* ------------------------------------------------------------------ */

function CheckRow({
  checked,
  unknown = false,
  onChange,
  art,
  children,
}: {
  checked: boolean;
  /** "가입한 상품 없음"·"모름" 처럼 상품이 아닌 선택지 */
  unknown?: boolean;
  onChange: () => void;
  /** 왼쪽 상품 그림 */
  art?: React.ReactNode;
  children: React.ReactNode;
}) {
  const look = checked ? "border-go bg-go-soft" : unknown ? "border-transparent bg-sea" : "border-line bg-white";
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-go ${look}`}
    >
      {art}
      <span className="flex flex-1 flex-col gap-0.5 text-[15px] text-ink">{children}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
          checked ? "border-go bg-go text-white" : "border-line bg-white text-transparent"
        }`}
      >
        <CheckIcon size={16} strokeWidth={2.75} />
      </span>
    </label>
  );
}

export function OwnedStep({ draft, updateDraft }: StepProps) {
  return (
    <>
      <StepTitle
        title="이미 가입한 상품을 알려주세요"
        description="중복 가입 제한과 갈아타기 순서를 알려드려요. 여러 개 선택할 수 있어요."
      />

      <div className="flex flex-col gap-2">
        {products.map((product) => (
          <CheckRow
            key={product.id}
            checked={draft.ownedProductIds.includes(product.id)}
            onChange={() => updateDraft(toggleOwnedProduct(draft, product.id))}
            art={<ProductArt productId={product.id} category={product.category} size={40} />}
          >
            <span className="font-medium">{product.name}</span>
            {product.newSignupClosed && (
              <span className="text-xs text-ink-mute">{product.signupClosedNote ?? "신규 가입 종료"}</span>
            )}
          </CheckRow>
        ))}
        <CheckRow unknown checked={draft.ownedChoice === "none"} onChange={() => updateDraft(chooseOwned(draft, "none"))}>
          가입한 상품 없음
        </CheckRow>
        <CheckRow
          unknown
          checked={draft.ownedChoice === "unknown"}
          onChange={() => updateDraft(chooseOwned(draft, "unknown"))}
        >
          <span>모름</span>
          <span className="text-xs text-ink-mute">결과 화면에서 동시 가입 제한을 함께 안내해요</span>
        </CheckRow>
      </div>
    </>
  );
}
