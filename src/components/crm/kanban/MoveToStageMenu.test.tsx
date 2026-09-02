import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoveToStageMenu } from "./MoveToStageMenu";

function setup(onMove = vi.fn()) {
  render(
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button>menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <MoveToStageMenu
          targets={[
            { id: "a", name: "Novo Lead" },
            { id: "b", name: "Em Negociação" },
            { id: "c", name: "Sem permissão", disabled: true },
          ]}
          currentStageId="a"
          onMoveToStage={onMove}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return onMove;
}

describe("MoveToStageMenu", () => {
  it("lista as colunas dinâmicas na ordem recebida e marca a atual como desabilitada", async () => {
    setup();
    fireEvent.click(screen.getByText("Mover"));
    await waitFor(() => expect(screen.getByText("Mover para")).toBeInTheDocument());
    const items = screen
      .getAllByRole("menuitem")
      .filter((i) => !i.textContent?.includes("Mover") || i.textContent?.includes("Lead"));
    const names = items.map((i) => i.textContent);
    expect(names[0]).toContain("Novo Lead");
    expect(names[1]).toContain("Em Negociação");
    expect(names[2]).toContain("Sem permissão");
    expect(items[0]).toHaveAttribute("data-disabled");
    expect(items[2]).toHaveAttribute("data-disabled");
  });

  it("chama onMoveToStage ao selecionar outra coluna e ignora a coluna atual", async () => {
    const onMove = setup();
    fireEvent.click(screen.getByText("Mover"));
    await waitFor(() => expect(screen.getByText("Mover para")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Novo Lead"));
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Em Negociação"));
    await waitFor(() => expect(onMove).toHaveBeenCalledWith("b"));
  });
});
