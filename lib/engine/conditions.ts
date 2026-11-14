import type {
  Condition,
  ConditionResult,
  ConditionStatus,
  EmploymentType,
  MedianIncomeTable,
  ResidenceType,
  UserInput,
} from "@/types";
import { ageAfterMilitary, manAge } from "./age";
import { formatManwon, formatRatio, householdIncomeRatioExact } from "./income";

export interface JudgeContext {
  input: UserInput;
  today: string; // YYYY-MM-DD
  medianIncome: MedianIncomeTable;
}

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  employee: "직장인",
  smeEmployee: "중소기업 재직",
  selfEmployed: "자영업",
  student: "학생·취준생",
  other: "기타",
};

const RESIDENCE_LABEL: Record<ResidenceType, string> = {
  monthlyRent: "월세",
  jeonse: "전세",
  parents: "부모님 집",
  other: "기타",
};

function result(
  condition: Condition,
  status: ConditionStatus,
  reason: string,
): ConditionResult {
  return {
    conditionId: condition.id,
    type: condition.type,
    label: condition.label,
    status,
    reason,
    sourceText: condition.sourceText,
  };
}

const metWord = (ok: boolean) => (ok ? "충족" : "미충족");

/** 조건 1개를 판정하고 이유 문구를 만들어요 */
export function evaluateCondition(condition: Condition, ctx: JudgeContext): ConditionResult {
  const { input } = ctx;

  switch (condition.type) {
    case "age": {
      const range = `만 ${condition.min}~${condition.max}세`;
      if (!input.birthDate) {
        return result(condition, "unknown", `생년월일을 입력하지 않아 나이 조건(${range}) 확인이 필요해요`);
      }
      const age = manAge(input.birthDate, ctx.today);
      if (age === null) {
        return result(condition, "unknown", `생년월일 형식을 확인할 수 없어 나이 조건(${range}) 확인이 필요해요`);
      }
      if (age >= condition.min && age <= condition.max) {
        return result(condition, "met", `만 ${age}세 → 나이 조건(${range}) 충족`);
      }
      if (age < condition.min) {
        return result(condition, "unmet", `만 ${age}세 → 나이 조건(${range}) 미충족 (최소 나이 미달)`);
      }
      // 상한 초과: 병역 기간 인정 여부 확인
      if (condition.militaryMaxMonths) {
        if (input.militaryMonths === null) {
          return result(
            condition,
            "unknown",
            `만 ${age}세 → 병역 기간(최대 ${condition.militaryMaxMonths / 12}년)을 빼면 해당될 수 있어요. 병역 기간 확인이 필요해요`,
          );
        }
        if (input.militaryMonths > 0) {
          const adjusted = ageAfterMilitary(
            input.birthDate,
            ctx.today,
            input.militaryMonths,
            condition.militaryMaxMonths,
          )!;
          const ok = adjusted <= condition.max;
          return result(
            condition,
            ok ? "met" : "unmet",
            `만 ${age}세(병역 ${input.militaryMonths}개월 반영 시 만 ${adjusted}세) → 나이 조건(${range}) ${metWord(ok)}`,
          );
        }
      }
      return result(condition, "unmet", `만 ${age}세 → 나이 조건(${range}) 미충족 (최대 나이 초과)`);
    }

    case "personalIncome": {
      const limit = `${formatManwon(condition.max)} 이하`;
      if (input.annualIncome === null) {
        return result(condition, "unknown", `연소득을 입력하지 않아 소득 조건(${limit}) 확인이 필요해요`);
      }
      if (input.annualIncome === 0 && condition.allowZero === false) {
        return result(condition, "unmet", `소득 없음 → 소득이 있어야 가입할 수 있어요`);
      }
      const ok = input.annualIncome <= condition.max;
      const shown = input.annualIncome === 0 ? "소득 없음" : `연소득 ${formatManwon(input.annualIncome)}`;
      return result(condition, ok ? "met" : "unmet", `${shown} → 소득 조건(${limit}) ${metWord(ok)}`);
    }

    case "householdIncomeRatio": {
      const { minPercent, maxPercent } = condition;
      const limit =
        minPercent !== undefined
          ? `기준 중위소득 ${minPercent}% 초과~${maxPercent}% 이하`
          : `기준 중위소득 ${maxPercent}% 이하`;
      if (input.householdIncome === null || input.householdSize === null) {
        return result(condition, "unknown", `가구소득이나 가구원 수를 몰라 가구 소득 조건(${limit}) 확인이 필요해요`);
      }
      // 비교는 반올림 전 값으로, 문구만 반올림해요
      const exact = householdIncomeRatioExact(ctx.medianIncome, input.householdIncome, input.householdSize);
      if (exact === null) {
        return result(condition, "unknown", `가구원 수를 확인할 수 없어 가구 소득 조건(${limit}) 확인이 필요해요`);
      }
      const overMin = minPercent === undefined || exact > minPercent;
      const underMax = exact <= maxPercent;
      const ok = overMin && underMax;
      const shown = formatRatio(exact, minPercent === undefined ? [maxPercent] : [minPercent, maxPercent]);
      const why = ok ? "" : !overMin ? " (하한 미달)" : " (상한 초과)";
      return result(
        condition,
        ok ? "met" : "unmet",
        `${input.householdSize}인 가구, 연 ${formatManwon(input.householdIncome)} → 기준 중위소득 ${shown} (${limit}) ${metWord(ok)}${why}`,
      );
    }

    case "checkAtApply": {
      return result(condition, "checkAtApply", `${condition.description} → 신청할 때 확인돼요`);
    }

    case "householdIncome": {
      const limit = `${formatManwon(condition.max)} 이하`;
      if (input.householdIncome === null) {
        return result(condition, "unknown", `가구소득을 입력하지 않아 가구 소득 조건(${limit}) 확인이 필요해요`);
      }
      const ok = input.householdIncome <= condition.max;
      return result(
        condition,
        ok ? "met" : "unmet",
        `가구 연소득 ${formatManwon(input.householdIncome)} → 가구 소득 조건(${limit}) ${metWord(ok)}`,
      );
    }

    case "noHouse": {
      if (input.ownsHouse === null) {
        return result(condition, "unknown", `주택 보유 여부를 몰라 무주택 조건 확인이 필요해요`);
      }
      return input.ownsHouse
        ? result(condition, "unmet", `주택 보유 → 무주택 조건 미충족`)
        : result(condition, "met", `무주택 → 무주택 조건 충족`);
    }

    case "householdHead": {
      if (input.isHouseholdHead === null) {
        return result(condition, "unknown", `세대주 여부를 몰라 세대주 조건 확인이 필요해요`);
      }
      return input.isHouseholdHead
        ? result(condition, "met", `세대주 → 세대주 조건 충족`)
        : result(condition, "unmet", `세대원 → 세대주 조건 미충족`);
    }

    case "employment": {
      const allowed = condition.allowed.map((e) => EMPLOYMENT_LABEL[e]).join("·");
      if (input.employment === null) {
        return result(condition, "unknown", `일하는 형태를 몰라 조건(${allowed}) 확인이 필요해요`);
      }
      const ok = condition.allowed.includes(input.employment);
      return result(
        condition,
        ok ? "met" : "unmet",
        `${EMPLOYMENT_LABEL[input.employment]} → 조건(${allowed}) ${metWord(ok)}`,
      );
    }

    case "region": {
      const allowed = condition.allowed.join("·");
      if (input.region === null) {
        return result(condition, "unknown", `사는 지역을 몰라 지역 조건(${allowed}) 확인이 필요해요`);
      }
      const ok = condition.allowed.includes(input.region);
      return result(condition, ok ? "met" : "unmet", `${input.region} 거주 → 지역 조건(${allowed}) ${metWord(ok)}`);
    }

    case "residence": {
      const allowed = condition.allowed.map((r) => RESIDENCE_LABEL[r]).join("·");
      if (input.residence === null) {
        return result(condition, "unknown", `사는 형태를 몰라 조건(${allowed}) 확인이 필요해요`);
      }
      const ok = condition.allowed.includes(input.residence);
      return result(
        condition,
        ok ? "met" : "unmet",
        `${RESIDENCE_LABEL[input.residence]} → 조건(${allowed}) ${metWord(ok)}`,
      );
    }

    default: {
      // 새 조건 종류를 types.ts에 추가했는데 여기서 처리하지 않으면 타입 오류가 나요
      const exhaustive: never = condition;
      return exhaustive;
    }
  }
}
