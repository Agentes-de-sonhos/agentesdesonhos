import { describe, it, expect } from "vitest";
import { buildServicePaymentConditions } from "@/lib/servicePaymentConditions";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const svc = (extra: Record<string, unknown> = {}) => ({
  id: "s1",
  service_type: "hotel",
  amount: 21609,
  ...extra,
});

describe("condições de pagamento por serviço (helper compartilhado)", () => {
  it("parcelas globais: 10x aplicadas ao valor do serviço", () => {
    const r = buildServicePaymentConditions(
      svc(),
      { payment_display_mode: "installments", installments_count: 10, payment_method_label: "Cartão de crédito" },
      fmt,
    );
    expect(r.rows[0].label).toBe("10x de");
    expect(r.rows[0].value).toBe(fmt(2160.9));
    expect(r.methodLabel).toBe("Cartão de crédito");
    expect(r.hasConditions).toBe(true);
  });

  it("condição específica do serviço tem prioridade sobre a global", () => {
    const r = buildServicePaymentConditions(
      svc({
        is_custom_payment: true,
        payment_type: "installments",
        installments: 4,
        payment_method: "Pix",
      }),
      { use_service_payment: true, payment_display_mode: "installments", installments_count: 10 },
      fmt,
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].label).toBe("4x de");
    expect(r.rows[0].value).toBe(fmt(21609 / 4));
    expect(r.methodLabel).toBe("Pix");
  });

  it("entrada + parcelas: exibe as duas linhas", () => {
    const r = buildServicePaymentConditions(
      svc({
        is_custom_payment: true,
        payment_type: "installments_with_entry",
        entry_value: 1609,
        installments: 5,
      }),
      { use_service_payment: true },
      fmt,
    );
    expect(r.rows.map((x) => x.label)).toEqual(["Entrada", "5x de"]);
    expect(r.rows[0].value).toBe(fmt(1609));
    expect(r.rows[1].value).toBe(fmt(20000 / 5));
  });

  it("à vista com desconto: exibe condição e valor calculado", () => {
    const r = buildServicePaymentConditions(
      svc({
        is_custom_payment: true,
        payment_type: "full_payment",
        discount_type: "percentage",
        discount_value: 10,
      }),
      { use_service_payment: true },
      fmt,
    );
    expect(r.rows[0].label).toBe("À vista (com desconto)");
    expect(r.rows[0].value).toBe(fmt(21609 * 0.9));
  });

  it("sem método configurado: methodLabel nulo", () => {
    const r = buildServicePaymentConditions(
      svc(),
      { payment_display_mode: "installments", installments_count: 10 },
      fmt,
    );
    expect(r.methodLabel).toBeNull();
  });

  it("total_only sem método: nada a exibir (bloco não deve ser renderizado)", () => {
    const r = buildServicePaymentConditions(svc(), { payment_display_mode: "total_only" }, fmt);
    expect(r.rows).toHaveLength(0);
    expect(r.hasConditions).toBe(false);
  });

  it("valor fechado de pacote: sem valor/parcelamento individual", () => {
    const r = buildServicePaymentConditions(
      svc(),
      { pricing_mode: "package", payment_display_mode: "installments", installments_count: 10 },
      fmt,
    );
    expect(r.packageMode).toBe(true);
    expect(r.amount).toBe(0);
    expect(r.hasConditions).toBe(false);
  });

  it("serviço sem valor individual: nenhuma condição", () => {
    const r = buildServicePaymentConditions(
      svc({ amount: 0 }),
      { payment_display_mode: "installments", installments_count: 10 },
      fmt,
    );
    expect(r.hasConditions).toBe(false);
  });
});
