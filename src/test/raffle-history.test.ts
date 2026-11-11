import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { capabilitiesFromSnapshot, participantsFromWinnerHistory } from "@/lib/raffle/history";
import { evaluateEligibility, participantKey } from "@/lib/raffle/eligibility";
import { DEFAULT_RAFFLE_FILTERS } from "@/lib/raffle/types";

describe("saved raffle winners", () => {
  it("loads winners before activating and resumes its own snapshot", () => {
    const page = readFileSync("src/pages/Sorteador.tsx", "utf8");
    const load = page.slice(page.indexOf("const loadRaffle ="), page.indexOf("const runDraw ="));
    expect(load.indexOf("if (winnersError)")).toBeLessThan(load.indexOf("setRaffleId(data.id)"));
    expect(load).toContain("setSessionWinners(excludeWinners ? participantsFromWinnerHistory(savedWinners || []) : [])");
    expect(load).toContain("savedParams?.removeWinners !== false");
    expect(load).not.toContain("setSessionWinners([])");
    expect(load).toContain("setResumedParticipants(");
    expect(page).toContain('resumedParticipants ?? (source === "academy_event"');
  });
  it("rebuilds capabilities and enforces restrictions for unknown values", () => {
    const participants = [
      { id: "yes", name: "Ana", raw: {}, watchedMinutes: 60, surveyAnswered: true, isSubscriber: true },
      { id: "no", name: "Bia", raw: {}, watchedMinutes: 5, surveyAnswered: false, isSubscriber: false },
      { id: "unknown", name: "Carol", raw: {} },
    ];
    for (const filter of [{ minWatchedMinutes: 30 }, { onlySurveyAnswered: true }, { onlySubscribers: true }]) {
      const filters = { ...DEFAULT_RAFFLE_FILTERS, ...filter };
      const capabilities = capabilitiesFromSnapshot(participants, filters);
      expect(evaluateEligibility(participants, filters, { capabilities }).map(r => r.eligible)).toEqual([true, false, false]);
      const missing = [participants[2]];
      expect(evaluateEligibility(missing, filters, { capabilities: capabilitiesFromSnapshot(missing, filters) })[0].eligible).toBe(false);
    }
    expect(capabilitiesFromSnapshot([{ id: "x", name: "X", raw: { minutos: "", pesquisa: "" } }], DEFAULT_RAFFLE_FILTERS)).toMatchObject({ watchedMinutes: true, survey: true, subscribers: false });
  });
  it("excludes a winner whose upload id changed", () => {
    const saved = participantsFromWinnerHistory([{ id: "win-1", winner_name: "Ana", winner_data: { id: "old", name: "Ana", email: "ANA@example.com" } }]);
    const results = evaluateEligibility([{ raw: {}, id: "new", name: "Ana", email: "ana@example.com" }, { raw: {}, id: "b", name: "Bia" }], DEFAULT_RAFFLE_FILTERS, { previousWinnerKeys: new Set(saved.map(participantKey)) });
    expect(results.map(r => r.eligible)).toEqual([false, true]);
  });
  it("handles name-only legacy rows and explicit repeat filters", () => {
    const saved = participantsFromWinnerHistory([{ id: "win-1", winner_name: "Ana", winner_data: null }]);
    const ctx = { previousWinnerKeys: new Set(saved.map(participantKey)) };
    expect(evaluateEligibility([{ raw: {}, id: "a", name: "Ana" }], DEFAULT_RAFFLE_FILTERS, ctx)[0].eligible).toBe(false);
    expect(evaluateEligibility([{ raw: {}, id: "a", name: "Ana" }], { ...DEFAULT_RAFFLE_FILTERS, excludePreviousWinners: false }, ctx)[0].eligible).toBe(true);
  });
});
