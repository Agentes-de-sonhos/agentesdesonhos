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
  props: { onOpenChange?: (open: boolean) => void; onEditQuickValues?: () => void } = {},
) {
  return render(
    <AgencyQuoteJourney
      hostname="100limites.tur.br"
      agencyName="100 Limites Viagens"
      open
      onOpenChange={props.onOpenChange ?? (() => {})}
      onEditQuickValues={props.onEditQuickValues}
      primaryService="aereo"
      quickValues={quick(overrides)}
    />,
  );
}

const clickText = (text: string | RegExp) => fireEvent.click(screen.getByText(text));
const continueBtn = () => screen.getByRole("button", { name: /continuar/i });

beforeEach(() => submitMock.mockClear());
afterEach(cleanup);

describe("pop-up da jornada de cotação White Label", () => {
  it("abre no complemento do serviço inicial com os dados da primeira dobra", () => {
    open({ criancas: "1" });
    expect(screen.getByText("Confirme quem viaja e as preferências de voo")).toBeInTheDocument();
    expect(screen.getByLabelText(/adultos/i)).toHaveValue(2);
    expect(screen.getByLabelText(/^crianças$/i)).toHaveValue(1);
    // Idades aparecem logo abaixo de Adultos/Crianças.
    expect(screen.getByText(/idade das crianças/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/idade da criança 1/i)).toBeInTheDocument();
    // Dados da primeira dobra não são pedidos de novo.
    expect(screen.queryByLabelText(/^origem/i)).toBeNull();
    expect(screen.queryByText(/bagagem/i)).toBeNull();
    expect(screen.queryByText(/voo direto/i)).toBeNull();
  });

  it("selecionar cards não abre formulário e aceita vários serviços", () => {
    open();
    fireEvent.click(continueBtn());
    expect(screen.getByText("Quer incluir mais algum serviço nesta solicitação?")).toBeInTheDocument();
    for (const label of ["Hospedagem", "Aluguel de Carro", "Transfer", "Ingressos e Atrações", "Seguro Viagem", "Cruzeiros"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Pacotes e Circuitos")).toBeNull();

    fireEvent.click(screen.getByTestId("wlq-choice-hospedagem"));
    expect(screen.getByTestId("wlq-choice-hospedagem")).toHaveAttribute("aria-checked", "true");
    // Nenhum formulário abriu: continuamos na seleção.
    expect(screen.getByText("Quer incluir mais algum serviço nesta solicitação?")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("wlq-choice-seguro"));
    fireEvent.click(continueBtn());
    expect(screen.getByText("Serviço 1 de 2")).toBeInTheDocument();
  });

  it("continuar sem adicionais leva direto ao contato, sem canal nem horário", () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(continueBtn());
    expect(screen.getByText("Como podemos falar com você?")).toBeInTheDocument();
    expect(screen.queryByText(/canal preferido/i)).toBeNull();
    expect(screen.queryByText(/melhor horário/i)).toBeNull();
  });

  it("percorre os adicionais em sequência e preserva dados ao voltar", () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByTestId("wlq-choice-hospedagem"));
    fireEvent.click(screen.getByTestId("wlq-choice-ingressos"));
    fireEvent.click(continueBtn());

    fireEvent.change(screen.getByLabelText(/quartos/i), { target: { value: "2" } });
    fireEvent.click(continueBtn());
    expect(screen.getByText("Serviço 2 de 2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/atração desejada/i), { target: { value: "Disney" } });
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByLabelText(/quartos/i)).toHaveValue(2);

    fireEvent.click(continueBtn());
    fireEvent.change(screen.getByLabelText(/atração desejada/i), { target: { value: "Disney" } });
    fireEvent.click(continueBtn());
    expect(screen.getByText("Como podemos falar com você?")).toBeInTheDocument();
  });

  it("exige nome e um contato e envia direto sem revisão", async () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(continueBtn());

    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));
    expect(screen.getByText(/informe seu nome completo/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria Souza" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));
    expect(
      screen.getAllByText(/informe um whatsapp ou e-mail/i).length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@exemplo.com" } });
    fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));
    expect(submitMock).toHaveBeenCalledTimes(1);
    const payload = (submitMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(payload.service_key).toBe("aereo");
    expect(payload.lead_name).toBe("Maria Souza");
  });

  it("revisão opcional permite editar e incluir serviço ausente", () => {
    open();
    fireEvent.click(continueBtn());
    fireEvent.click(continueBtn());
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@exemplo.com" } });
    fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
    fireEvent.click(screen.getByRole("button", { name: /revisar solicitação/i }));

    expect(screen.getByText("Revise sua solicitação")).toBeInTheDocument();
    expect(screen.getByText(/dados de contato/i)).toBeInTheDocument();

    // Editar o serviço inicial e voltar ao resumo sem reiniciar o fluxo.
    fireEvent.click(screen.getByRole("button", { name: /editar aéreo/i }));
    expect(screen.getByText("Confirme quem viaja e as preferências de voo")).toBeInTheDocument();
    fireEvent.click(continueBtn());
    expect(screen.getByText("Revise sua solicitação")).toBeInTheDocument();

    // Inclusão tardia de um serviço complementar.
    fireEvent.click(screen.getByTestId("wlq-choice-hospedagem"));
    clickText(/preencher o serviço selecionado/i);
    expect(screen.getByText("Serviço 1 de 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/quartos/i), { target: { value: "1" } });
    fireEvent.click(continueBtn());
    expect(screen.getByText("Revise sua solicitação")).toBeInTheDocument();
  });

  it("editar na revisão não fecha o modal e preserva os demais dados", () => {
    const onOpenChange = vi.fn();
    const onEditQuickValues = vi.fn();
    open({}, { onOpenChange, onEditQuickValues });

    // Nenhuma ação da etapa inicial leva para fora do modal.
    expect(screen.queryByRole("button", { name: /editar dados iniciais/i })).toBeNull();

    fireEvent.change(screen.getByLabelText(/adultos/i), { target: { value: "3" } });
    fireEvent.click(continueBtn());
    fireEvent.click(continueBtn());
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@exemplo.com" } });
    fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
    fireEvent.click(screen.getByRole("button", { name: /revisar solicitação/i }));

    // "Dados gerais da viagem" abre o formulário interno do serviço inicial.
    fireEvent.click(screen.getAllByRole("button", { name: /^editar$/i })[0]);
    expect(screen.getByText("Confirme quem viaja e as preferências de voo")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onEditQuickValues).not.toHaveBeenCalled();

    // Dados preservados e retorno ao resumo com o contato intacto.
    expect(screen.getByLabelText(/adultos/i)).toHaveValue(3);
    fireEvent.click(continueBtn());
    expect(screen.getByText("Revise sua solicitação")).toBeInTheDocument();
    expect(screen.getByText("maria@exemplo.com")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onEditQuickValues).not.toHaveBeenCalled();
  });
});
