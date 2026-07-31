import { describe, expect, it } from "vitest";
import {
  describeNotifyWindow,
  isWithinNotifyWindow,
  nextNotifyAt,
  type NotifyWindow,
} from "@/lib/leadNotificationSchedule";

const win: NotifyWindow = {
  days: ["mon", "tue", "wed", "thu", "fri"],
  start: "08:00",
  end: "18:00",
  timezone: "America/Sao_Paulo",
};

// 2026-08-03 is a Monday. 15:00Z = 12:00 in São Paulo (UTC-3).
const mondayMidday = new Date("2026-08-03T15:00:00Z");
const mondayNight = new Date("2026-08-03T23:30:00Z"); // 20:30 local
const saturday = new Date("2026-08-08T15:00:00Z");

describe("lead notification window", () => {
  it("sends immediately inside business hours", () => {
    expect(isWithinNotifyWindow(win, mondayMidday)).toBe(true);
    expect(nextNotifyAt(win, mondayMidday)).toBeNull();
  });

  it("schedules for the next morning when out of hours", () => {
    expect(isWithinNotifyWindow(win, mondayNight)).toBe(false);
    const next = nextNotifyAt(win, mondayNight)!;
    expect(next.toISOString()).toBe("2026-08-04T11:00:00.000Z"); // Tue 08:00 local
  });

  it("skips days that are not selected", () => {
    expect(isWithinNotifyWindow(win, saturday)).toBe(false);
    const next = nextNotifyAt(win, saturday)!;
    expect(next.toISOString()).toBe("2026-08-10T11:00:00.000Z"); // Monday 08:00 local
  });

  it("supports overnight windows", () => {
    const overnight: NotifyWindow = { ...win, days: ["mon"], start: "20:00", end: "02:00" };
    expect(isWithinNotifyWindow(overnight, mondayNight)).toBe(true);
    // 2026-08-04T04:00Z = Tuesday 01:00 local, tail of Monday's window.
    expect(isWithinNotifyWindow(overnight, new Date("2026-08-04T04:00:00Z"))).toBe(true);
  });

  it("never sends when no day is selected", () => {
    const none: NotifyWindow = { ...win, days: [] };
    expect(isWithinNotifyWindow(none, mondayMidday)).toBe(false);
    expect(nextNotifyAt(none, mondayMidday)).toBeNull();
  });

  it("describes the window in pt-BR", () => {
    expect(describeNotifyWindow(win)).toBe("Seg, Ter, Qua, Qui, Sex • 08:00 às 18:00");
  });
});