import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AgencyQuoteJourney } from "@/components/whitelabel/AgencyQuoteJourney";
import { initialServiceValues, serviceByKey } from "@/lib/agencySiteRequests";

const submitMock = vi.fn(async () => ({ success: true as const }));

vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ state: "idle", error: null, submit: submitMock, reset: () => {} }),
}));

const aereo = serviceByKey("aereo");

function quick(overrides: Record<string, string> = {}) {
  return {
    ...initialServiceValues(aereo),
    tipo_viagem: "Ida e volta",
    origem: "São Paulo",
    destino: "Lisboa",
    data_ida: "2026-10-01",
    data_volta: "2026-10-12",
    adultos: "2",
    criancas: "0",
    flexibilidade: "Datas fixas",
    ...overrides,
  };
}

function open(
  overrides: Record<string, string> = {},
  props: { onOpenChange?: (open: boolean) => void } = {},
) {
  return render(
    <AgencyQuoteJourney
      hostname="100limites.tur.br"
      agencyName="100 Limites Viagens"
      open
      onOpenChange={props.onOpenChange ?? (() => {})}
      primaryService="aereo"
      quickValues={quick(overrides)}
    />,
  );
}

const continueBtn = () => screen.getByRole("button", { name: /^continuar$/i });
const sendBtn = () => screen.getByRole("button", { name: /enviar solicitação/i });

beforeEach(() => {
  submitMock.mockClear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("assistente de solicitação White Label", () => {
  it("abre no complemento do serviço inicial, sem repetir a primeira dobra", () => {
    open({ criancas: "1" });
    expect(screen.getByText("Etapa 1 de 3")).toBeInTheDocument();
    expect(screen.getByLabelText(/adultos/i)).toHaveValue(2);
    expect(screen.getByLabelText(/idade da criança 1/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^origem/i)).toBeNull();
    expect(screen.queryByText(/bagagem/i)).toBeNull();
  });

  it("permite ocorrências múltiplas do mesmo serviço", () => {
    open();
    fireEvent.click(screen.getByTestId("wlq-add-occurrence"));
    expect(screen.getByText("Aéreo 1")).toBeInTheDocument();
    expect(screen.getByText("Aéreo 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remover aéreo 2/i }));
    expect(screen.queryByText("Aéreo 2")).toBeNull();
  });

  it("selecionar cards não abre formulário e aceita vários serviços", () => {
    open();
    fireEvent.click(continueBtn());
    expect(screen.getByText(/selecione os demais serviços/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("wlq-choice-hospedagem"));
    expect(screen.getByTestId("wlq-choice-hospedagem")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("wlq-choice-seguro"));
    fireEvent.click(continueBtn());
    expect(screen.getByText("Etapa 3 de 4")).toBeInTheDocument();
  });

  it("enviar somente o serviço inicial leva direto ao contato", () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByText(/enviar somente aéreo/i));
    expect(screen.getByText("Como podemos falar com você?")).toBeInTheDocument();
    expect(screen.queryByText(/canal preferido/i)).toBeNull();
  });

  it("percorre os adicionais em sequência e preserva dados ao voltar", () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByTestId("wlq-choice-hospedagem"));
    fireEvent.click(screen.getByTestId("wlq-choice-ingressos"));
    fireEvent.click(continueBtn());

    fireEvent.change(screen.getByLabelText(/quartos/i), { target: { value: "2" } });
    fireEvent.click(continueBtn());
    expect(screen.getByText("Etapa 4 de 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByLabelText(/quartos/i)).toHaveValue(2);
  });

  it("exige nome e um contato e envia sem etapa de revisão", async () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByText(/enviar somente aéreo/i));

    fireEvent.click(sendBtn());
    expect(screen.getByText(/informe seu nome completo/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@exemplo.com" } });
    fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
    fireEvent.click(sendBtn());

    expect(submitMock).toHaveBeenCalledTimes(1);
    const payload = (submitMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(payload.service_key).toBe("aereo");
    expect(payload.lead_name).toBe("Maria Souza");
  });
});
