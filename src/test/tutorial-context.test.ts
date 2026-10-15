import { describe, it, expect } from "vitest";
import { tutorialContextKey, tutorialEmbedUrl } from "@/lib/tutorialContext";

describe("tutorial context", () => {
  it("separates quote list from an opened quote", () => {
    expect(tutorialContextKey("/ferramentas-ia/gerar-orcamento")).toBe("/ferramentas-ia/gerar-orcamento");
    expect(tutorialContextKey("/ferramentas-ia/gerar-orcamento/3f2b1c4d-1111-2222-3333-444455556666"))
      .toBe("/ferramentas-ia/gerar-orcamento/:id");
  });
  it("converts youtube links to embed", () => {
    expect(tutorialEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123?rel=0");
  });
});
