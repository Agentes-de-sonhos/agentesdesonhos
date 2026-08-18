import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { ServiceRequestTransition } from "@/components/whitelabel/ServiceRequestTransition";
import { AgencyQuickQuote } from "@/components/whitelabel/AgencyQuickQuote";
import {
  TRANSITION_DURATION_MS, TRANSITION_MESSAGES, TRANSITION_TITLE, messageIndexAt,
  transitionMotif,
} from "@/lib/serviceRequestTransition";

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ state: "idle", error: null, submit: vi.fn(), reset: () => {} }),
}));

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function mount(onOpenChange = vi.fn()) {
  render(
    <AgencyQuickQuote
      hostname="100limites.tur.br"
      agencyName="100 Limites Viagens"
      service="aereo"
      onServiceChange={() => {}}
      open={false}
      onOpenChange={onOpenChange}
    />,
  );
  return onOpenChange;
}

describe("microtransição da solicitação white label", () => {
  it("não mostra transição nem abre o modal quando a validação falha", () => {
    const onOpenChange = mount();
    fireEvent.click(screen.getByRole("button", { name: /^Solicitar$/i }));
    expect(screen.queryByTestId("wl-request-transition")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("mensagens são consultivas e sem linguagem de busca automática", () => {
    const text = [TRANSITION_TITLE, ...TRANSITION_MESSAGES].join(" ").toLowerCase();
    for (const banned of ["buscando", "ofertas", "disponibilidade", "encontramos", "%", "aguarde alguns segundos"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("distribui as três mensagens ao longo da transição", () => {
    expect(messageIndexAt(0)).toBe(0);
    expect(messageIndexAt(TRANSITION_DURATION_MS / 2)).toBe(1);
    expect(messageIndexAt(TRANSITION_DURATION_MS)).toBe(2);
    expect(messageIndexAt(TRANSITION_DURATION_MS * 10)).toBe(TRANSITION_MESSAGES.length - 1);
  });

  it("define um elemento animado para cada categoria", () => {
    expect(transitionMotif("aereo")).toBe("plane");
    expect(transitionMotif("hospedagem")).toBe("stay");
    expect(transitionMotif("cruzeiros")).toBe("ship");
    expect(transitionMotif("desconhecido")).toBe("map");
  });
});

describe("overlay isolado", () => {
  it("exibe título, subtítulo e chama onFinished ao fim dos ~3s", () => {
    const onFinished = vi.fn();
    render(<ServiceRequestTransition open serviceKey="aereo" onFinished={onFinished} />);
    expect(screen.getByTestId("wl-request-transition")).toBeTruthy();
    expect(screen.getByText(TRANSITION_TITLE)).toBeTruthy();
    expect(screen.getByText(TRANSITION_MESSAGES[0])).toBeTruthy();
    expect(onFinished).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(TRANSITION_DURATION_MS + 50); });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("nada renderiza quando fechado", () => {
    render(<ServiceRequestTransition open={false} serviceKey="aereo" onFinished={() => {}} />);
    expect(screen.queryByTestId("wl-request-transition")).toBeNull();
  });
});
