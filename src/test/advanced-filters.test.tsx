import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MapPin, Ship, Sparkles, Users } from "lucide-react";
import { AdvancedFilters } from "@/components/mapa-turismo/AdvancedFilters";

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (v: string) =>
    setSelected((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return (
    <AdvancedFilters
      groups={[
        { id: "positioning", label: "Posicionamento", icon: Sparkles, activeCount: 0, content: <button>Luxo</button> },
        {
          id: "regions",
          label: "Regiões",
          icon: MapPin,
          activeCount: selected.length,
          content: <button onClick={() => toggle("caribe")}>Caribe{selected.includes("caribe") ? " ✓" : ""}</button>,
        },
        { id: "size", label: "Porte e características", icon: Ship, activeCount: 0, content: <button>Navio pequeno</button> },
        { id: "traveler", label: "Perfil do viajante", icon: Users, activeCount: 2, content: <button>Família</button> },
      ]}
    />
  );
}

const tab = (name: RegExp) => screen.getByRole("tab", { name });

describe("AdvancedFilters", () => {
  it("inicia com o painel fechado e todos os acionadores em uma única barra", () => {
    render(<Harness />);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tabpanel", { hidden: true })).toHaveAttribute("hidden");
    screen.getAllByRole("tab").forEach((t) => expect(t).toHaveAttribute("aria-selected", "false"));
  });

  it("abre apenas um grupo e troca o conteúdo no mesmo painel", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab(/Posicionamento/));
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("hidden");
    expect(screen.getByText("Luxo")).toBeInTheDocument();

    await user.click(tab(/Regiões/));
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.queryByText("Luxo")).not.toBeInTheDocument();
    expect(screen.getByText("Caribe")).toBeInTheDocument();
    expect(tab(/Posicionamento/)).toHaveAttribute("aria-selected", "false");
  });

  it("segundo clique no acionador ativo recolhe o painel", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab(/Perfil do viajante/));
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("hidden");
    await user.click(tab(/Perfil do viajante/));
    expect(screen.getByRole("tabpanel", { hidden: true })).toHaveAttribute("hidden");
  });

  it("preserva a seleção ao fechar, trocar e reabrir o grupo", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab(/Regiões/));
    await user.click(screen.getByText("Caribe"));
    expect(screen.getByTestId("advanced-filter-badge-regions")).toHaveTextContent("1");

    await user.click(tab(/Porte e características/));
    await user.click(tab(/Regiões/));
    expect(screen.getByText("Caribe ✓")).toBeInTheDocument();
  });

  it("mostra badge de contagem só quando maior que zero", () => {
    render(<Harness />);
    expect(screen.queryByTestId("advanced-filter-badge-positioning")).toBeNull();
    expect(screen.getByTestId("advanced-filter-badge-traveler")).toHaveTextContent("2");
  });

  it("navega entre acionadores com as setas do teclado", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    tab(/Posicionamento/).focus();
    await user.keyboard("{ArrowRight}");
    expect(tab(/Regiões/)).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tab(/Posicionamento/)).toHaveFocus();
  });
});