// ③ 판정 3종(가능·확인 필요·해당 없음)의 아이콘과 색. 첫 화면 범례·결과 칩·카드 배지가 같이 써요.
import type { JudgeStatus } from "@/types";
import { CheckIcon, HelpIcon, XIcon, type IconProps } from "./icons";

export const STATUS_ICON: Record<JudgeStatus, (props: IconProps) => React.ReactNode> = {
  eligible: CheckIcon,
  needsCheck: HelpIcon,
  ineligible: XIcon,
};

/** 채운 배지 (카드 배지, 고른 칩) */
export const STATUS_SOLID: Record<JudgeStatus, string> = {
  eligible: "bg-go text-white",
  needsCheck: "bg-check-soft text-check ring-1 ring-inset ring-check-line",
  ineligible: "bg-stop-soft text-stop",
};

/** 동그란 아이콘 배경 */
export const STATUS_DOT: Record<JudgeStatus, string> = {
  eligible: "bg-go text-white",
  needsCheck: "bg-check-soft text-check ring-1 ring-inset ring-check-line",
  ineligible: "bg-stop-soft text-stop ring-1 ring-inset ring-line",
};
