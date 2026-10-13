import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Limites100LegalPreviewPage from "@/pages/whitelabel/Limites100LegalPreviewPage";

describe("100 Limites — página de prévia jurídica", () => {
  it.each(["privacy", "terms"] as const)("renderiza %s com aviso, pendências e noindex", (kind) => {
    render(<Limites100LegalPreviewPage kind={kind} />);
    expect(screen.getByRole("note", { name: "Prévia para revisão" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(kind === "privacy" ? "Política de Privacidade" : "Termos de Uso");
    expect(document.body.textContent).not.toMatch(/\{\{|\[IF/);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
  });
});
