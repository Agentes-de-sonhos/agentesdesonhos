import { addDays, format } from "date-fns";
import { parseLocalDate } from "@/lib/dateParsing";
import type { ItineraryDay } from "@/types/itinerary";

/**
 * Plans for adding/removing days in an itinerary. The mutation consumes
 * a flat `sequence` (final chronological order) where each slot either
 * points to an existing day (`dayId`) or represents a new empty day
 * (`dayId: undefined`).
 */
export interface DaySequenceSlot {
  dayId?: string;
}

export interface DayPlan {
  sequence: DaySequenceSlot[];
  newStartDate: string; // yyyy-MM-dd
  newEndDate: string;   // yyyy-MM-dd
}

export type AddDayPosition =
  | { kind: "end" }
  | { kind: "before"; dayId: string }
  | { kind: "after"; dayId: string };

export type DeleteDayMode = "keep_period" | "shorten_period";

function toYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Build a plan that inserts a new empty day at the requested position.
 * Start date stays the same; end date is always extended by one day
 * because the sequence grows by one slot.
 */
export function buildAddDayPlan(
  days: ItineraryDay[],
  position: AddDayPosition,
  itineraryStartDate: string,
): DayPlan {
  const sequence: DaySequenceSlot[] = days.map((d) => ({ dayId: d.id }));
  if (position.kind === "end") {
    sequence.push({});
  } else {
    const idx = days.findIndex((d) => d.id === position.dayId);
    if (idx < 0) {
      // Fallback: append.
      sequence.push({});
    } else {
      const insertAt = position.kind === "before" ? idx : idx + 1;
      sequence.splice(insertAt, 0, {});
    }
  }
  const start = parseLocalDate(itineraryStartDate);
  const newEnd = addDays(start, sequence.length - 1);
  return {
    sequence,
    newStartDate: itineraryStartDate,
    newEndDate: toYmd(newEnd),
  };
}

/**
 * Build a plan for removing a day. Two strategies:
 *
 * - `shorten_period`: drop the day and shrink the trip by one calendar
 *   day. If the first day is deleted, the start date moves forward one
 *   day (so the ex-second day keeps its original calendar date). All
 *   other cases keep the start date and pull the end date back by one.
 * - `keep_period`: drop the day, promote subsequent days one position
 *   and append an empty day at the end so the trip length is preserved.
 */
export function buildDeleteDayPlan(
  days: ItineraryDay[],
  dayId: string,
  mode: DeleteDayMode,
  itineraryStartDate: string,
  itineraryEndDate: string,
): DayPlan {
  const idx = days.findIndex((d) => d.id === dayId);
  const kept = days.filter((d) => d.id !== dayId).map((d) => ({ dayId: d.id }));
  const start = parseLocalDate(itineraryStartDate);
  const end = parseLocalDate(itineraryEndDate);

  if (mode === "keep_period") {
    return {
      sequence: [...kept, {}],
      newStartDate: itineraryStartDate,
      newEndDate: itineraryEndDate,
    };
  }

  // shorten_period
  const isFirst = idx === 0;
  const newStart = isFirst ? addDays(start, 1) : start;
  const newEnd = isFirst ? end : addDays(end, -1);
  return {
    sequence: kept,
    newStartDate: toYmd(newStart),
    newEndDate: toYmd(newEnd),
  };
}

/** Preview a slot's final calendar date for local UI (no DB call). */
export function previewSlotDate(plan: DayPlan, slotIndex: number): Date {
  const start = parseLocalDate(plan.newStartDate);
  return addDays(start, slotIndex);
}

/** Convenience for the "position" select in the add dialog. */
export function computeAddPreviewDate(
  days: ItineraryDay[],
  position: AddDayPosition,
  itineraryStartDate: string,
): Date {
  const plan = buildAddDayPlan(days, position, itineraryStartDate);
  const insertedIndex = plan.sequence.findIndex((s) => !s.dayId);
  return previewSlotDate(plan, Math.max(0, insertedIndex));
}