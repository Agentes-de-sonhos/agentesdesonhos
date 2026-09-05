import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { operationStageShowsWallet } from "@/lib/crmCardShortcuts";

const cardSrc = readFileSync("src/components/crm/operations/OperationCard.tsx", "utf-8");

const addNote = vi.fn();
const events: any[] = [];

vi.mock("@/hooks/useOperations", () => ({
  useOperationTimeline: () => ({ events, addNote, isLoading: false }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }));

import { QuickOperationNoteDialog } from "@/components/crm/operations/QuickOperationNoteDialog";

describe("menu de 3 pontinhos das Operações", () => {
  it("segue a ordem exata aprovada", () => {
    const labels = [
      "Editar viagem",
      "Conferir serviços",
      "Fazer checklist",
      "Criar anotações",
      "Anexar arquivos",
      "Etiquetas",
      "Gerar carteira digital",
      "Histórico",
      "Excluir operação",
    ];
    const positions = labels.map((l) => cardSrc.indexOf(`h-4 w-4" /> ${l}`));
    expect(positions.some((p) => p < 0)).toBe(false);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // "Mover" (MoveToStageMenu) é o primeiro item do menu
    expect(cardSrc.indexOf("<MoveToStageMenu")).toBeLessThan(positions[0]);
    // separador imediatamente antes de Excluir
    expect(cardSrc.indexOf("<DropdownMenuSeparator />")).toBeLessThan(positions[8]);
  });

  it("não mantém mais o item/modal de Editar cliente", () => {
    expect(cardSrc).not.toContain("EditClientDialog");
    expect(cardSrc).not.toContain("Editar cliente");
  });

  it("abre pop-ups focados (sem abas) para viagem, serviços, checklist e anexos", () => {
    expect(cardSrc).toContain('setFocusedSection("overview")');
    expect(cardSrc).toContain('setFocusedSection("services")');
    expect(cardSrc).toContain('setFocusedSection("checklist")');
    expect(cardSrc).toContain('setFocusedSection("attachments")');
    expect(cardSrc).toMatch(/<OperationDetailDialog[\s\S]*focused/);
  });

  it("carteira digital só nas 2 primeiras etapas da ordem configurada", () => {
    const stages = [{ key: "a" }, { key: "b" }, { key: "c" }];
    expect(operationStageShowsWallet(stages, "a")).toBe(true);
    expect(operationStageShowsWallet(stages, "b")).toBe(true);
    expect(operationStageShowsWallet(stages, "c")).toBe(false);
    expect(cardSrc).toContain("can(\"opportunities.generate_wallet\")");
  });
});

describe("pop-up de anotação da operação", () => {
  beforeEach(() => {
    addNote.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    events.length = 0;
  });

  const setup = (onOpenChange = vi.fn()) => {
    render(
      <QuickOperationNoteDialog operationId="op-1" contextLabel="Viagem X · Paris" open onOpenChange={onOpenChange} />
    );
    return onOpenChange;
  };

  it("salva a anotação e fecha só após sucesso", async () => {
    addNote.mockResolvedValue(undefined);
    const onOpenChange = setup();
    fireEvent.change(screen.getByPlaceholderText("Digite sua anotação..."), { target: { value: "Confirmar hotel" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotação" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith("Confirmar hotel"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("impede salvar vazio", () => {
    setup();
    expect(screen.getByRole("button", { name: "Salvar anotação" })).toBeDisabled();
  });

  it("impede duplicidade da mesma anotação", async () => {
    events.push({ id: "1", event_type: "manual_note", description: "Confirmar hotel" });
    setup();
    fireEvent.change(screen.getByPlaceholderText("Digite sua anotação..."), { target: { value: "Confirmar hotel" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotação" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(addNote).not.toHaveBeenCalled();
  });

  it("preserva o texto e avisa no erro", async () => {
    addNote.mockRejectedValue(new Error("falhou"));
    const onOpenChange = setup();
    const ta = screen.getByPlaceholderText("Digite sua anotação...") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Nota com erro" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anotação" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("falhou"));
    expect(ta.value).toBe("Nota com erro");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
