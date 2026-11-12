import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLUB_MED_SNOW, getClubMedSnow } from "@/lib/clubMedSnow";

describe("catálogo Club Med na neve", () => {
  it("lista os 21 resorts pedidos e os chalés Valmorel e Grand Massif como produtos próprios", () => {
    expect(CLUB_MED_SNOW.filter((r) => r.kind === "resort")).toHaveLength(21);
    expect(getClubMedSnow("les-chalets-de-valmorel")?.relatedTo).toBe("valmorel");
    expect(getClubMedSnow("les-chalets-de-grand-massif-samoens-morillon")?.relatedTo).toBe("grand-massif-samoens-morillon");
  });
  it("todo hotel tem fonte oficial Club Med com data", () => {
    for (const r of CLUB_MED_SNOW) {
      expect(r.sources.length, r.slug).toBeGreaterThan(0);
      for (const s of r.sources) { expect(s.url).toMatch(/^https:\/\/www\.clubmed\./); expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
    }
  });
  it("todo slug do catálogo está na allowlist do servidor do Google (e só eles)", () => {
    const src = readFileSync(resolve(__dirname, "../../supabase/functions/club-med-snow-places/queries.ts"), "utf8");
    const keys = [...src.matchAll(/^ {2}"([a-z0-9-]+)":/gm)].map((m) => m[1]).sort();
    expect(keys).toEqual(CLUB_MED_SNOW.map((r) => r.slug).sort());
  });
  it("nunca promete neve garantida", () => {
    expect(JSON.stringify(CLUB_MED_SNOW).toLowerCase()).not.toMatch(/neve garantida(?! não)/);
  });
});
