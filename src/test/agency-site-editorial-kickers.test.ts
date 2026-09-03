import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");

function block(label: string): string {
  const start = source.indexOf(`case "${label}":`);
  expect(start).toBeGreaterThan(-1);
  // Find the matching closing brace for this case block at the top level.
  // We scan from the first 'return (' after the case label until the next
  // top-level `case "` or the end of the renderSection function.
  const returnStart = source.indexOf("return (", start);
  expect(returnStart).toBeGreaterThan(-1);
  let depth = 0;
  let i = returnStart;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        // Move past the closing semicolon/newline of this return statement.
        // The case block ends at the next top-level `case "` or `default:`.
        const nextCase = source.indexOf('case "', i);
        const nextDefault = source.indexOf("default:", i);
        const end = Math.min(
          nextCase === -1 ? len : nextCase,
          nextDefault === -1 ? len : nextDefault,
        );
        return source.slice(start, end);
      }
    }
    i++;
  }
  throw new Error(`Could not find end of block ${label}`);
}

describe("AgencySiteHome — editorial eyebrow colors", () => {
  it.each([
    ["signature", "assinatura/modelo base"],
    ["about", "sobre este modelo"],
    ["concierge", "atendimento personalizado/concierge"],
    ["faq", "antes de solicitar/perguntas frequentes"],
  ])("block %s (%s) uses dynamic brand primary", (key) => {
    const b = block(key);
    // The editorial branch must use the dynamic primary color.
    expect(b).toContain("text-[var(--brand-primary)]");
    // It must no longer use the secondary/yellow token for the eyebrow.
    expect(b).not.toContain("text-[hsl(var(--wl-red))] wl-kicker");
  });

  it("preserves secondary token on non-targeted editorial kickers", () => {
    // Credentials is another editorial block that should keep the secondary
    // accent unchanged — proving we did not remap globally.
    const credentials = block("credentials");
    expect(credentials).toContain("text-[hsl(var(--wl-red))] wl-kicker");
  });

  it("does not introduce hardcoded SiteLab purple in the source", () => {
    expect(source).not.toContain("text-[#4B2A6E]");
  });
});
