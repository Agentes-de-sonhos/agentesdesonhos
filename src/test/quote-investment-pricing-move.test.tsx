import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { QuoteInvestmentDisplayCard } from "@/components/quote/QuoteInvestmentDisplayCard";

const pageSource = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");

const baseQuote = (extra: Record<string, unknown> = {}) => ({
  id: "q1",
  total_amount: 1000,
  services: [{ amount: 600 }, { amount: 400 }],
  ...extra,
});

describe("Etapa 2 — bloco de cálculo removido", () => {
  it("não renderiza QuotePricingModeCard na Etapa 2 e mantém o organizador", () => {
    expect(pageSource).not.toContain("<QuotePricingModeCard");
    expect(pageSource).toContain("<QuoteServicesOrganizer");
    expect(pageSource).toContain("onReorderServices={reorderServices}");
    expect(pageSource).toContain("onCreateSection={createSection}");
  });

  it("a UI de precificação existe apenas no item Investimento", () => {
    expect(pageSource).toContain("<QuoteInvestmentDisplayCard");
    expect(pageSource.match(/QuoteInvestmentDisplayCard/g)?.length).toBe(2); // import + uso
    expect(pageSource).not.toContain('id="hide-investment-total"');
  });
});

describe("QuoteInvestmentDisplayCard", () => {
  it("mostra as duas opções de exibição e a forma de cálculo quando total visível", () => {
    render(
      <QuoteInvestmentDisplayCard
        quote={baseQuote()}
        hideTotal={false}
        onChangeHideTotal={vi.fn()}
        onSavePricing={vi.fn()}
      />,
    );
    expect(screen.getByText("Exibição do investimento")).toBeInTheDocument();
    expect(screen.getByText("Valor total do orçamento")).toBeInTheDocument();
    expect(screen.getByText("Ocultar valor total do investimento")).toBeInTheDocument();
    expect(screen.getByText("Como calcular o valor total?")).toBeInTheDocument();
    expect(
      screen.getByText("O total do orçamento será calculado pela soma dos valores de todos os serviços."),
    ).toBeInTheDocument();
  });

  it("oculta a forma de cálculo quando o total está oculto, sem apagar configuração", () => {
    const onSavePricing = vi.fn();
    render(
      <QuoteInvestmentDisplayCard
        quote={baseQuote({ pricing_mode: "package", package_total_amount: 5000 })}
        hideTotal
        onChangeHideTotal={vi.fn()}
        onSavePricing={onSavePricing}
      />,
    );
    expect(screen.queryByText("Como calcular o valor total?")).not.toBeInTheDocument();
    expect(onSavePricing).not.toHaveBeenCalled();
  });

  it("ao voltar para total visível restaura modo pacote e valor preservado", () => {
    render(
      <QuoteInvestmentDisplayCard
        quote={baseQuote({ pricing_mode: "package", package_total_amount: 5000 })}
        hideTotal={false}
        onChangeHideTotal={vi.fn()}
        onSavePricing={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Valor total do pacote")).toHaveValue("R$ 5.000,00");
  });

  it("alternar para pacote exige valor e não salva vazio", async () => {
    const onSavePricing = vi.fn();
    render(
      <QuoteInvestmentDisplayCard
        quote={baseQuote()}
        hideTotal={false}
        onChangeHideTotal={vi.fn()}
        onSavePricing={onSavePricing}
      />,
    );
    fireEvent.click(screen.getByText("Valor fechado de pacote"));
    const field = await screen.findByLabelText("Valor total do pacote");
    expect(field).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar valor fechado" })).toBeDisabled();

    fireEvent.change(field, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar valor fechado" }));
    await waitFor(() =>
      expect(onSavePricing).toHaveBeenCalledWith({ pricingMode: "package", packageTotal: 1234.56 }),
    );
  });

  it("alterna exibição chamando o handler sem tocar na precificação", () => {
    const onChangeHideTotal = vi.fn();
    const onSavePricing = vi.fn();
    render(
      <QuoteInvestmentDisplayCard
        quote={baseQuote({ pricing_mode: "package", package_total_amount: 900 })}
        hideTotal={false}
        onChangeHideTotal={onChangeHideTotal}
        onSavePricing={onSavePricing}
      />,
    );
    fireEvent.click(screen.getByText("Ocultar valor total do investimento"));
    expect(onChangeHideTotal).toHaveBeenCalledWith(true);
    expect(onSavePricing).not.toHaveBeenCalled();
  });
});