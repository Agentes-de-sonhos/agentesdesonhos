import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuoteAiComposeDialog } from "@/components/quote/ai-compose/QuoteAiComposeDialog";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

describe("botão inicial 'Montar com IA (teste)'", () => {
  const src = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
  const start = src.indexOf("  if (!id) {\n    return");
  const end = src.indexOf("</DashboardLayout>", start);
  const preBranch = src.slice(start, end);
  const rest = src.slice(end);

  it("o modal de pré-criação está montado no mesmo ramo (!id) do botão", () => {
    expect(start).toBeGreaterThan(0);
    expect(preBranch).toContain("setShowAiPre(true)");
    expect(preBranch).toContain("open={showAiPre}");
    expect(preBranch).toContain("onConfirmPlan=");
  });
  it("o editor mantém só o modal de orçamento criado (onConfirmService)", () => {
    expect(rest).not.toContain("open={showAiPre}");
    expect(rest).toContain("open={showAiCompose}");
    expect(rest).toContain("onConfirmService=");
  });
});

describe("modal de pré-criação", () => {
  it("abre e fechar não confirma nada (nenhum serviço, nenhum orçamento)", () => {
    const onConfirmPlan = vi.fn();
    const onOpenChange = vi.fn();
    render(<QuoteAiComposeDialog open onOpenChange={onOpenChange} onConfirmPlan={onConfirmPlan} />);
    expect(screen.getByText("Gerar prévia")).toBeTruthy();
    fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirmPlan).not.toHaveBeenCalled();
  });
});
