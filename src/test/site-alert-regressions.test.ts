import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
describe("site alert source contracts", () => {
  it("preserves the distributed campanhas anchor around the configured featured experience", () => {
    const home = source("src/pages/whitelabel/AgencySiteHome.tsx");
    expect(home).toContain('id={profile.featuredExperience.id === "campanhas" ? undefined : "campanhas"}');
    expect(home).toContain('<AgencyFeaturedExperienceSection config={profile.featuredExperience}');
    expect(source("src/components/whitelabel/AgencyFeaturedExperienceSection.tsx")).toContain('id={config.id ?? "experiencia-destaque"}');
  });
  it("shared resort components do not inherit the 100 Limites brand", () => {
    for (const file of ["AgencyResortsSection", "BrazilResortsMap"]) {
      const text = source(`src/components/resorts-brasil/${file}.tsx`);
      expect(text).toContain('title = "Explore os resorts do Brasil"');
      expect(text).not.toContain("com a 100 Limites");
    }
  });
  it("domain migration is SELECT-only, active and bound to the existing agency helper", () => {
    const migration = source("supabase/migrations/20261111130000_agency_team_domain_read.sql");
    expect(migration).toContain("FOR SELECT TO authenticated");
    expect(migration).toContain("is_active\n  AND user_id = public.current_agency_id()");
    expect(migration).not.toMatch(/FOR (ALL|UPDATE|DELETE|INSERT)|TO anon|SECURITY DEFINER/);
    expect(migration.match(/CREATE POLICY/g)).toHaveLength(1);
  });
});
