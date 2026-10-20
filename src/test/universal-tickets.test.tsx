import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  buildUniversalRequest, hhnEligible, maxDaysFor, normalizeDays, totalDays, validatePeriod, allowedExtras,
  type UniversalParkId,
} from "@/lib/universalTickets";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
import { UniversalTicketsConfigurator } from "@/components/landing/universal/UniversalTicketsConfigurator";

const ALL: UniversalParkId[] = ["universal-studios", "islands-of-adventure", "epic-universe", "volcano-bay"];

describe("limite implícito de 14 dias", () => {
  it("4 parques × 3 = 12; +2 chega a 14; +1 bloqueado; reduzir libera", () => {
    const d: Record<string, number> = { "universal-studios": 3, "islands-of-adventure": 3, "epic-universe": 3, "volcano-bay": 3 };
    expect(totalDays(d)).toBe(12);
    expect(maxDaysFor("epic-universe", ALL, d)).toBe(5);
    d["epic-universe"] = 5;
    expect(totalDays(d)).toBe(14);
    expect(maxDaysFor("universal-studios", ALL, d)).toBe(3);
    d["epic-universe"] = 4;
    expect(maxDaysFor("universal-studios", ALL, d)).toBe(4);
  });
  it("um único parque pode ter até 14 e 8 dias é válido", () => {
    expect(maxDaysFor("epic-universe", ["epic-universe"], { "epic-universe": 1 })).toBe(14);
    expect(totalDays(normalizeDays(ALL, { "universal-studios": 5 }))).toBe(8);
  });
  it("normaliza excesso ao adicionar parque", () => {
    const n = normalizeDays(ALL, { "universal-studios": 14 });
    expect(totalDays(n)).toBe(14);
    expect(Object.values(n).every((v) => v >= 1)).toBe(true);
  });
});

describe("período e Halloween Horror Nights", () => {
  const today = "2026-10-20";
  it("valida datas invertidas e meses", () => {
    expect(validatePeriod("dates", "2026-12-10", "2026-12-01", [], today)).toMatch(/posterior/);
    expect(validatePeriod("months", "", "", [], today)).toMatch(/mês/);
    expect(validatePeriod("months", "", "", ["2027-01", "2027-02", "2027-07"], today)).toBeNull();
  });
  it("HHN só em setembro/outubro", () => {
    expect(hhnEligible("months", "", "", ["2027-01", "2027-02", "2027-07"])).toBe(false);
    expect(hhnEligible("months", "", "", ["2027-11"])).toBe(false);
    expect(hhnEligible("months", "", "", ["2027-08"])).toBe(false);
    expect(hhnEligible("months", "", "", ["2027-09"])).toBe(true);
    expect(hhnEligible("dates", "2027-08-28", "2027-09-03", [])).toBe(true);
    expect(hhnEligible("dates", "2027-10-30", "2027-11-04", [])).toBe(true);
    expect(hhnEligible("dates", "2027-11-02", "2027-11-10", [])).toBe(false);
    expect(allowedExtras(["express", "hhn"], false)).toEqual(["express"]);
  });
});

describe("envio", () => {
  const base = {
    selected: ["universal-studios", "islands-of-adventure"] as UniversalParkId[], daysMode: "one_each" as const,
    days: { "universal-studios": 1, "islands-of-adventure": 1 }, periodMode: "months" as const, arrival: "2026-12-01", departure: "2026-12-09",
    months: ["2027-07", "2027-01"], parkToPark: true, extras: ["hhn", "express"] as ("hhn" | "express")[], adults: 2, childAges: [7],
    name: "Teste", whatsapp: "(11) 99999-9999", email: "",
  };
  it("nomes completos, meses sem datas e HHN removido fora de set/out", () => {
    const r = buildUniversalRequest(base);
    expect(r.details.parques).toBe("Universal Studios Florida, Universal Islands of Adventure");
    expect(r.details.meses).toBe("2027-01,2027-07");
    expect(r.details.check_in).toBe("");
    expect(r.details.extras_ids).toBe("express");
    expect(r.details.hogwarts_express).toBe("Sim");
    expect(r.details.pagina).toBe("/universal");
    expect(r.summary).not.toMatch(/\/14/);
  });
});

describe("configurador (componente)", () => {
  beforeEach(() => invoke.mockReset());

  async function reachContact() {
    render(<UniversalTicketsConfigurator hostname="www.destinoscomaju.com.br" />);
    fireEvent.click(screen.getByText("Universal Studios Florida"));
    fireEvent.click(screen.getByText("Universal Islands of Adventure"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(await screen.findByText("Ainda estou escolhendo"));
    fireEvent.click(screen.getAllByRole("button", { name: /de 20/ }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(await screen.findByText("Quero repetir um ou mais parques"));
    expect(document.body.textContent).not.toMatch(/de 14|faltam|total planejado/i);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(await screen.findByText("Sim, quero trocar e usar o Hogwarts Express"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByTestId("universal-summary")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quero receber a cotação" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Cliente Teste" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11999999999" } });
    fireEvent.click(screen.getByLabelText("Autorizo o contato"));
  }

  it("sucesso só após retorno positivo", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await reachContact();
    fireEvent.click(screen.getByRole("button", { name: "Pedir minha cotação" }));
    expect(await screen.findByText("Recebi sua solicitação!")).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
    const body = invoke.mock.calls[0][1].body;
    expect(body.details.origem).toBe("universal_landing_tickets");
    expect(body.hostname).toBe("www.destinoscomaju.com.br");
  });

  it("erro mantém dados e permite tentar de novo", async () => {
    invoke.mockResolvedValue({ data: { error: "Falha" }, error: null });
    await reachContact();
    fireEvent.click(screen.getByRole("button", { name: "Pedir minha cotação" }));
    expect(await screen.findByText(/Seus dados continuam aqui/)).toBeTruthy();
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Cliente Teste");
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    await waitFor(() => expect(screen.getByText("Recebi sua solicitação!")).toBeTruthy());
  });
});
