import { detectFileCapabilities } from "./parseFile";
import type { RaffleFilters, RaffleCapabilities, RaffleParticipant } from "./types";

/** Older winner rows may contain only a name, newer rows keep the snapshot. */
export function participantsFromWinnerHistory(
  history: Array<{ id: string; winner_name: string; winner_data: unknown }>,
): RaffleParticipant[] {
  return history.map((row) => {
    const snapshot = row.winner_data && typeof row.winner_data === "object"
      ? row.winner_data as Partial<RaffleParticipant> : {};
    return { ...snapshot, id: snapshot.id || row.id, name: snapshot.name || row.winner_name, raw: snapshot.raw || {} };
  });
}

/** Rebuild metadata instead of inheriting an unrelated upload. Saved filters
 * remain enforced when optional fields are unknown, failing eligibility closed. */
export function capabilitiesFromSnapshot(participants: RaffleParticipant[], filters: RaffleFilters): RaffleCapabilities {
  const raw = detectFileCapabilities(participants.map(p => p.raw || {}));
  return {
    attendance: raw.attendance || participants.some(p => typeof p.attended === "boolean"),
    registrationStatus: raw.registrationStatus || participants.some(p => !!p.registrationStatus),
    watchedMinutes: raw.watchedMinutes || filters.minWatchedMinutes !== null || participants.some(p => typeof p.watchedMinutes === "number"),
    survey: raw.survey || filters.onlySurveyAnswered || participants.some(p => typeof p.surveyAnswered === "boolean"),
    subscribers: filters.onlySubscribers || participants.some(p => typeof p.isSubscriber === "boolean"),
  };
}
