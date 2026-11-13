/** 판정 엔진 진입점. 화면·API는 여기서만 가져다 써요 */
export { judgeAll, judgeProduct, findConflicts, todayInSeoul } from "./judge";
export { evaluateCondition, type JudgeContext } from "./conditions";
export { manAge, ageAfterMilitary } from "./age";
export { householdIncomeRatio, monthlyMedianIncome, formatManwon } from "./income";
export { validateProducts, parseUserInput } from "./validate";
