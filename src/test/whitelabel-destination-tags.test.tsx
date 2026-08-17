import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DestinationTagsInput } from "@/components/whitelabel/DestinationTagsInput";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <DestinationTagsInput id="destinos" label="Destinos" value={value} onChange={setValue} placeholder="Digite e pressione Enter" />
  );
}

afterEach(cleanup);

const input = () => screen.getByLabelText(/Destinos/i) as HTMLInputElement;

describe("DestinationTagsInput — etiquetas dentro do campo", () => {
  it("não renderiza botão Adicionar", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Adicionar/i })).toBeNull();
  });

  it("Enter cria etiqueta dentro do campo e mantém o foco", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(input());
    await user.type(input(), "Orlando{Enter}");
    const field = screen.getByTestId("destinos-field");
    expect(field.textContent).toContain("Orlando");
    expect(field.contains(input())).toBe(true);
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe("");
    expect(input().placeholder).toBe("Digite outro destino...");
  });

  it("vírgula confirma e ignora duplicados e vazios", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "Miami,");
    await user.type(input(), " miami {Enter}");
    await user.type(input(), "   {Enter}");
    expect(screen.getAllByRole("button", { name: /^Remover/i })).toHaveLength(1);
  });

  it("Tab e blur confirmam o texto digitado", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "Roma");
    await user.tab();
    expect(screen.getByRole("button", { name: "Remover Roma" })).toBeTruthy();
    await user.click(input());
    await user.type(input(), "Lisboa");
    fireEvent.blur(input());
    expect(screen.getByRole("button", { name: "Remover Lisboa" })).toBeTruthy();
  });

  it("X remove a etiqueta e Backspace vazio remove a última", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Orlando, Miami, Nova York" />);
    await user.click(screen.getByRole("button", { name: "Remover Miami" }));
    expect(screen.queryByRole("button", { name: "Remover Miami" })).toBeNull();
    await user.click(input());
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remover Nova York" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remover Orlando" })).toBeTruthy();
  });

  it("clicar na área vazia do campo foca o input", () => {
    render(<Harness initial="Orlando" />);
    fireEvent.mouseDown(screen.getByTestId("destinos-field"));
    expect(document.activeElement).toBe(input());
  });

  it("campo não quebra a grade: flex-nowrap com rolagem interna", () => {
    render(<Harness initial="Orlando, Miami, Nova York" />);
    const field = screen.getByTestId("destinos-field");
    expect(field.className).toContain("overflow-x-auto");
    expect(field.className).toContain("whitespace-nowrap");
  });
});
