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

import { Limites100LegalFooterPreview } from "@/components/whitelabel/Limites100LegalFooterPreview";
describe("100 Limites — rodapé legal de prévia", () => {
  it("separa sede jurídica do atendimento online em Lisboa", () => {
    render(<Limites100LegalFooterPreview />);
    const t = screen.getByTestId("limites100-legal-footer-preview").textContent ?? "";
    expect(t).toContain("Palhoça/SC, CEP 88133-060");
    expect(t).toContain("Atendimento online com Amanda Larini, atualmente em Lisboa, Portugal.");
    expect(t).toContain("Prévia para revisão");
    expect(t).not.toMatch(/\{\{|\[IF/);
  });
});
