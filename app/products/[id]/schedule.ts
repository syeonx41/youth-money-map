/** ④ 상품 상세: 신청 일정 상태 계산 */
import type { ApplySchedule } from "@/types";

export type ScheduleState = "open" | "upcoming" | "ended";

export interface ScheduleView extends ApplySchedule {
  state: ScheduleState;
  /** upcoming 이면 시작까지 남은 날, open 이면 마감까지 남은 날 */
  daysLeft: number | null;
}

export interface ScheduleSummary {
  /** always: 일정 정보 없음(상시) / next: 진행 중이거나 예정된 일정 있음 / none: 모두 지남 → 다음 모집 미정 */
  kind: "always" | "next" | "none";
  items: ScheduleView[];
}

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY);
}

/** 오늘(YYYY-MM-DD) 기준으로 일정마다 진행 중 / 예정 / 마감을 붙여요 */
export function summarizeSchedules(schedules: ApplySchedule[] | undefined, today: string): ScheduleSummary {
  if (!schedules || schedules.length === 0) return { kind: "always", items: [] };

  const items: ScheduleView[] = [...schedules]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => {
      if (today < s.start) return { ...s, state: "upcoming", daysLeft: daysBetween(today, s.start) };
      if (today > s.end) return { ...s, state: "ended", daysLeft: null };
      return { ...s, state: "open", daysLeft: daysBetween(today, s.end) };
    });

  const hasNext = items.some((s) => s.state !== "ended");
  return { kind: hasNext ? "next" : "none", items };
}
