import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SiteLabPresentationEditor from "@/pages/sitelab/SiteLabPresentationEditor";
import { DEFAULT_SECTIONS } from "@/lib/agencySiteConfig";
import { loadPresentation } from "@/lib/sitelabPresentation";

describe("tela Apresentação (runtime)", () => {
  beforeEach(() => localStorage.clear());

  it("lista todas as seções, alterna, define identidade e persiste ao salvar", () => {
    const { unmount } = render(<SiteLabPresentationEditor />);
    for (const s of DEFAULT_SECTIONS) expect(screen.getByTestId(`sec-${s.key}`)).toBeTruthy();

    const faq = screen.getByTestId("sec-faq");
    const before = faq.getAttribute("aria-checked");
    fireEvent.click(faq);
    expect(faq.getAttribute("aria-checked")).not.toBe(before);

    fireEvent.change(screen.getByLabelText("Nome da agência"), { target: { value: "Prospect Viagens" } });
    fireEvent.change(screen.getByLabelText("Cor primária (hex)"), { target: { value: "#123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar apresentação" }));

    const saved = loadPresentation("sitelab-base");
    expect(saved.sections.faq).toBe(before !== "true");
    expect(saved.identity.name).toBe("Prospect Viagens");
    expect(saved.identity.primary).toBe("#123456");

    // "Recarregar": nova montagem lê o mesmo estado.
    unmount();
    render(<SiteLabPresentationEditor />);
    expect((screen.getByLabelText("Nome da agência") as HTMLInputElement).value).toBe("Prospect Viagens");
  });
});
