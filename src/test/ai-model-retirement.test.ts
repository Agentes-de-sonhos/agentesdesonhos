import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "supabase/functions");
const sources = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory()
    ? sources(join(directory, entry.name))
    : entry.name.endsWith(".ts") ? [join(directory, entry.name)] : []);

describe("Lovable AI model retirement compatibility", () => {
  it("does not call the chat models retired by Lovable on 20 October 2026", () => {
    const outdated = sources(root).filter((file) => /google\/gemini-2\.5-(?:pro|flash)["']/.test(readFileSync(file, "utf8")));
    expect(outdated).toEqual([]);
  });
  it("uses the documented gateway replacement in migrated entry points", () => {
    const entries = ["extract-business-card", "import-airfare-document", "hotel-rx", "contract-scope-ai",
      "parse-itinerary-ai", "import-full-package", "lead-wizard-ai", "ai-import-service",
      "check-travel-requirements", "help-assistant-chat", "import-hotel-document",
      "curate-news", "import-generic-service-document", "generate-content", "import-offer-ai",
      "generate-itinerary", "import-car-rental-document"];
    for (const entry of entries) {
      const source = readFileSync(join(root, entry, "index.ts"), "utf8");
      expect(source, entry).toContain("google/gemini-3.8-flash");
      expect(source, entry).toContain("ai.gateway.lovable.dev");
    }
    expect(readFileSync(join(root, "_shared/news-scraper.ts"), "utf8")).toContain("google/gemini-3.8-flash");
  });
  it("keeps supported pilot and voice models unchanged", () => {
    expect(readFileSync(join(root, "quote-ai-compose/index.ts"), "utf8")).toContain('const MODEL = "google/gemini-3.1-flash-lite"');
    expect(readFileSync(join(root, "kanban-voice-command/index.ts"), "utf8")).toContain('model: "openai/gpt-6-astra"');
  });
});
