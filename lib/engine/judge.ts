import type {
  ConflictWarning,
  JudgeResponse,
  JudgeStatus,
  MedianIncomeTable,
  Product,
  ProductCategory,
  ProductJudgement,
  UserInput,
} from "@/types";
import { evaluateCondition, type JudgeContext } from "./conditions";

const STATUS_ORDER: Record<JudgeStatus, number> = { eligible: 0, needsCheck: 1, ineligible: 2 };

/** 중복 가입 경고 만들기 */
export function findConflicts(product: Product, input: UserInput, all: Product[]): ConflictWarning[] {
  const conflicts: ConflictWarning[] = [];
  for (const otherId of product.exclusiveWith ?? []) {
    const other = all.find((p) => p.id === otherId);
    const otherName = other?.name ?? otherId;
    const switchGuide = product.switchGuides?.find((g) => g.fromProductId === otherId);

    if (input.ownedProductIds === null) {
      conflicts.push({
        kind: "unknown",
        conflictingProductId: otherId,
        conflictingProductName: otherName,
        message: `${otherName}에 가입 중이라면 동시에 가입할 수 없어요. 가입 여부를 확인해 주세요`,
        switchGuide,
      });
    } else if (input.ownedProductIds.includes(otherId)) {
      conflicts.push({
        kind: "owned",
        conflictingProductId: otherId,
        conflictingProductName: otherName,
        message: switchGuide
          ? `가입 중인 ${otherName}과 동시에 가입할 수 없어요. 갈아타려면 순서를 꼭 확인하세요`
          : `가입 중인 ${otherName}과 동시에 가입할 수 없어요`,
        switchGuide,
      });
    }
  }
  return conflicts;
}

/** 상품 1개 판정 */
export function judgeProduct(product: Product, ctx: JudgeContext, all: Product[]): ProductJudgement {
  const conditions = product.conditions.map((c) => evaluateCondition(c, ctx));

  const unmet = conditions.filter((c) => c.status === "unmet");
  const unknown = conditions.filter((c) => c.status === "unknown");

  // 규칙: 미충족 1개라도 → 해당 없음 / 미충족 없고 모름 있음 → 확인 필요 / 모두 충족 → 가능
  let status: JudgeStatus;
  let summaryReason: string;
  if (unmet.length > 0) {
    status = "ineligible";
    summaryReason = unmet[0].reason;
  } else if (unknown.length > 0) {
    status = "needsCheck";
    summaryReason = unknown[0].reason;
  } else {
    status = "eligible";
    summaryReason = "모든 조건을 충족해요";
  }

  const owned = ctx.input.ownedProductIds?.includes(product.id) ?? false;

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    status,
    summaryReason,
    conditions,
    owned,
    conflicts: owned ? [] : findConflicts(product, ctx.input, all),
  };
}

function emptyCounts(): JudgeResponse["counts"] {
  const zero = (): Record<JudgeStatus, number> => ({ eligible: 0, needsCheck: 0, ineligible: 0 });
  return { loan: zero(), saving: zero(), housing: zero() };
}

/** 오늘 날짜 "YYYY-MM-DD" (한국 시간) */
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/**
 * 전체 판정. 결과는 가능 → 확인 필요 → 해당 없음 순으로 정렬해요.
 * @param today 테스트에서 날짜를 고정할 때 넘겨요. 기본은 오늘(한국 시간)
 */
export function judgeAll(
  input: UserInput,
  products: Product[],
  medianIncome: MedianIncomeTable,
  today: string = todayInSeoul(),
): JudgeResponse {
  const ctx: JudgeContext = { input, today, medianIncome };
  const results = products
    .map((p) => judgeProduct(p, ctx, products))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const counts = emptyCounts();
  for (const r of results) counts[r.category as ProductCategory][r.status] += 1;

  return { results, counts, judgedAt: today };
}
