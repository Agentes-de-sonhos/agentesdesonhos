import { describe, it, expect } from "vitest";
import {
  isWithinOfficeHours,
  normalizeOfficeHours,
  describeOfficeHours,
  DEFAULT_OFFICE_HOURS,
  parseHm,
} from "@/lib/officeHours";

const TZ = "America/Sao_Paulo";

describe("officeHours", () => {
  it("parses HH:MM and rejects garbage", () => {
    expect(parseHm("08:30")).toBe(510);
    expect(parseHm("24:00")).toBe(1440);
    expect(parseHm("8h30")).toBeNull();
  });

  it("is open inside a weekday window (BRT)", () => {
    // 2026-08-05 is a Wednesday. 15:00 UTC = 12:00 BRT.
    expect(isWithinOfficeHours(DEFAULT_OFFICE_HOURS, TZ, new Date("2026-08-05T15:00:00Z"))).toBe(true);
  });

  it("is closed before opening and after closing", () => {
    // 09:00 UTC = 06:00 BRT
    expect(isWithinOfficeHours(DEFAULT_OFFICE_HOURS, TZ, new Date("2026-08-05T09:00:00Z"))).toBe(false);
    // 23:00 UTC = 20:00 BRT
    expect(isWithinOfficeHours(DEFAULT_OFFICE_HOURS, TZ, new Date("2026-08-05T23:00:00Z"))).toBe(false);
  });

  it("is closed on days without windows", () => {
    // 2026-08-09 is a Sunday, 15:00 UTC = 12:00 BRT
    expect(isWithinOfficeHours(DEFAULT_OFFICE_HOURS, TZ, new Date("2026-08-09T15:00:00Z"))).toBe(false);
  });

  it("supports overnight windows spilling into the next day", () => {
    const overnight = { fri: [["22:00", "02:00"] as [string, string]], sat: [] };
    // Friday 23:30 BRT -> 2026-08-08T02:30Z
    expect(isWithinOfficeHours(overnight, TZ, new Date("2026-08-08T02:30:00Z"))).toBe(true);
    // Saturday 01:30 BRT -> 2026-08-08T04:30Z (tail of Friday window)
    expect(isWithinOfficeHours(overnight, TZ, new Date("2026-08-08T04:30:00Z"))).toBe(true);
    // Saturday 03:00 BRT -> outside
    expect(isWithinOfficeHours(overnight, TZ, new Date("2026-08-08T06:00:00Z"))).toBe(false);
  });

  it("falls back to defaults when hours are empty", () => {
    expect(isWithinOfficeHours(null, TZ, new Date("2026-08-05T15:00:00Z"))).toBe(true);
  });

  it("normalizes malformed database payloads", () => {
    const normalized = normalizeOfficeHours({ mon: [["08:00", "12:00"], "junk", ["x", "y"]], zzz: [] });
    expect(normalized.mon).toEqual([["08:00", "12:00"]]);
    expect(normalized.sun).toEqual([]);
  });

  it("describes the schedule in Portuguese", () => {
    expect(describeOfficeHours(DEFAULT_OFFICE_HOURS)).toContain("Segunda: 08:00 às 18:00");
  });
});