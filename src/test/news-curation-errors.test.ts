import { describe, it, expect } from "vitest";
import { friendlyCurationError } from "@/lib/newsCurationErrors";

describe("friendlyCurationError", () => {
  it("mascara erro SQL bruto", () => {
    const m = friendlyCurationError({ message: 'column "noticia_id" of relation "news_curation_audit" does not exist' });
    expect(m).not.toMatch(/column|relation/i);
    expect(m).toMatch(/inconsistência interna/i);
  });
  it("permissão", () => {
    expect(friendlyCurationError({ message: "not authorized" })).toMatch(/permissão/i);
  });
  it("data da notícia do dia", () => {
    expect(friendlyCurationError({ message: "invalid_curation_period: news was not published on 2026-08-10" })).toMatch(/publicada na data/i);
  });
  it("posição inválida", () => {
    expect(friendlyCurationError({ message: "position must be between 1 and 5" })).toMatch(/entre 1 e 5/);
  });
  it("fallback", () => {
    expect(friendlyCurationError(null)).toMatch(/Tente novamente/);
  });
});
