import { describe, expect, it } from "vitest";
import { summarizeSchedules } from "../schedule";

const S = [
  { label: "1차", start: "2026-06-22", end: "2026-07-03" },
  { label: "2차", start: "2026-10-07", end: "2026-10-16" },
];

describe("신청 일정 요약 (④ 상세)", () => {
  it("일정이 없으면 상시", () => {
    expect(summarizeSchedules(undefined, "2026-11-14").kind).toBe("always");
    expect(summarizeSchedules([], "2026-11-14").kind).toBe("always");
  });

  it("모든 일정이 지나면 다음 모집 미정", () => {
    const r = summarizeSchedules(S, "2026-11-14");
    expect(r.kind).toBe("none");
    expect(r.items.every((s) => s.state === "ended")).toBe(true);
  });

  it("진행 중이면 마감까지 남은 날", () => {
    const r = summarizeSchedules(S, "2026-10-14");
    expect(r.kind).toBe("next");
    expect(r.items[1]).toMatchObject({ state: "open", daysLeft: 2 });
  });

  it("시작일·마감일 당일은 진행 중", () => {
    expect(summarizeSchedules(S, "2026-10-07").items[1].state).toBe("open");
    expect(summarizeSchedules(S, "2026-10-16").items[1]).toMatchObject({ state: "open", daysLeft: 0 });
  });

  it("예정이면 시작까지 남은 날", () => {
    const r = summarizeSchedules(S, "2026-06-17");
    expect(r.items[0]).toMatchObject({ state: "upcoming", daysLeft: 5 });
  });
});
