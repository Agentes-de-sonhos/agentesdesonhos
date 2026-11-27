import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItaliaEmTremRouteMap } from "@/components/whitelabel/ItaliaEmTremRouteMap";
import { ITALIA_EM_TREM } from "@/lib/circuits/italiaEmTrem";

describe("Mapa Itália em Trem", () => {
  it("mostra as bases, as noites e a distinção entre trem e traslado", () => {
    render(<ItaliaEmTremRouteMap circuit={ITALIA_EM_TREM} />);
    const map = screen.getByRole("img", { name: /Roma → Nápoles → Sorrento → Nápoles → Bari → Lecce → Brindisi/ });
    expect(map.querySelectorAll('line[data-mode="train"]')).toHaveLength(3);
    expect(map.querySelectorAll('line[data-mode="transfer"]')).toHaveLength(2);
    for (const line of map.querySelectorAll("line")) expect(line).toHaveAttribute("stroke", "#2502ff");
    for (const circle of map.querySelectorAll("circle")) expect(circle).toHaveAttribute("fill", "#2502ff");
    expect(within(map).getByText("Sorrento")).toHaveAttribute("fill", "#171717");
    expect(within(map).getByText("5 noites")).toHaveAttribute("fill", "#171717");
    const legend = screen.getByRole("list", { name: "Legenda do mapa" });
    for (const swatch of legend.querySelectorAll("span")) expect(swatch).toHaveStyle({ borderColor: "#2502ff" });
    expect(within(map).getByText("Término · aeroporto")).toBeVisible();
  });

  it("abre o mapa ampliado e fecha pelo controle em português", () => {
    render(<ItaliaEmTremRouteMap circuit={ITALIA_EM_TREM} />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar mapa do roteiro" }));
    const dialog = screen.getByRole("dialog", { name: "Mapa do roteiro · Itália em Trem" });
    expect(within(dialog).getByRole("img")).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar mapa" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
