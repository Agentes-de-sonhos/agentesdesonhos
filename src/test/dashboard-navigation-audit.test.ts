import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/components/dashboard", "src/components/dashboard/start"];

function files(dir: string): string[] {
  return readdirSync(dir)
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile() && p.endsWith(".tsx"));
}

const sources = ROOTS.flatMap(files).map((p) => [p, readFileSync(p, "utf8")] as const);

describe("dashboard navigation audit", () => {
  it("finds dashboard components to audit", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it("never uses window.open / window.location for internal routes", () => {
    const offenders: string[] = [];
    for (const [path, code] of sources) {
      if (/window\.open\(\s*["'`]\//.test(code)) offenders.push(`${path}: window.open internal`);
      if (/window\.location\.(href|assign|replace)\s*[=(]\s*["'`]\//.test(code)) {
        offenders.push(`${path}: window.location internal`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps individual news links external with a safe rel", () => {
    const news = readFileSync("src/components/dashboard/CuratedNewsFeed.tsx", "utf8");
    expect(news).toContain('window.open(item.url_original, "_blank", "noopener,noreferrer")');
  });
});