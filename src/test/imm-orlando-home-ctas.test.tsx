import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ submit: vi.fn(), state: "idle", error: null }),
}));
afterEach(cleanup);

describe("IMM Ingressos e parques homepage CTA colors", () => {
  it.each(["immturismo.com.br", "www.immturismo.com.br"])(
    "opts in only park and ticket actions, keeping their destinations on %s",
    (hostname) => {
      const { container } = render(<OrlandoTicketsSection hostname={hostname} />);
      const section = container.querySelector("#ingressos-orlando")!;
      expect(section).toHaveAttribute("data-imm-home-ctas");
      const learnMore = screen.getAllByRole("link", { name: /^Saiba mais$/ });
      expect(learnMore.map((link) => link.getAttribute("href"))).toEqual(["/disney", "/universal"]);
      for (const link of learnMore) expect(link).toHaveClass("wl-orlando-home-cta");
      const mapActions = screen.getAllByRole("button", { name: /^Explorar o mapa de / });
      expect(mapActions).toHaveLength(3);
      for (const button of mapActions) expect(button).toHaveClass("wl-orlando-home-cta");
      expect(screen.getByRole("link", { name: /Calcular meus dias/ })).toHaveAttribute("href", "/ingressos-orlando");
      expect(screen.getByRole("link", { name: /Calcular meus dias/ })).toHaveClass("wl-orlando-home-cta");
      expect(screen.getByRole("button", { name: "Próximo" })).not.toHaveClass("wl-orlando-home-cta");
      expect(screen.getByRole("link", { name: /Saiba mais sobre Walt Disney/ })).not.toHaveClass("wl-orlando-home-cta");
      fireEvent.click(mapActions[0]);
      expect(screen.getByRole("dialog", { name: /Mapa interativo do LEGOLAND/ })).toBeInTheDocument();
    },
  );

  it.each([
    ["immturismo.com.br", "page"],
    ["omundoemcores.com.br", "home"],
    ["immturismo.com.br.example.org", "home"],
  ] as const)("does not color %s in %s mode", (hostname, mode) => {
    const { container } = render(<OrlandoTicketsSection hostname={hostname} mode={mode} />);
    expect(container.querySelector("#ingressos-orlando")).not.toHaveAttribute("data-imm-home-ctas");
  });
});
