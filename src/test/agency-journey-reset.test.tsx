import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AgencyQuoteJourney } from "@/components/whitelabel/AgencyQuoteJourney";
import { initialServiceValues, serviceByKey } from "@/lib/agencySiteRequests";

/** Mock com estado real e notificação: "submitting" e "success" rerenderizam. */
let state: "idle" | "submitting" | "success" | "error" = "idle";
const listeners = new Set<() => void>();
function setState(next: typeof state) {
  state = next;
  listeners.forEach((fn) => fn());
}
let resolveSubmit: (() => void) | null = null;
const submitMock = vi.fn(
  () =>
    new Promise<{ success: true }>((resolve) => {
      setState("submitting");
      resolveSubmit = () => {
        setState("success");
        resolve({ success: true });
      };
    }),
);
const resetMock = vi.fn(() => setState("idle"));

vi.mock("@/hooks/useAgencySiteRequest", async () => {
  const React = await import("react");
  return {
    useAgencySiteRequest: () => {
      const [, force] = React.useState(0);
      React.useEffect(() => {
        const fn = () => force((n) => n + 1);
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      }, []);
      return { state, error: null, submit: submitMock, reset: resetMock };
    },
  };
});

const aereo = serviceByKey("aereo");

function quick() {
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
  };
}

function renderJourney(props: Partial<React.ComponentProps<typeof AgencyQuoteJourney>> = {}) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onCompleted = props.onCompleted ?? vi.fn();
  const utils = render(
    <AgencyQuoteJourney
      hostname="100limites.tur.br"
      agencyName="100 Limites Viagens"
      open
      onOpenChange={onOpenChange}
      primaryService="aereo"
      quickValues={quick()}
      onCompleted={onCompleted}
    />,
  );
  return { ...utils, onOpenChange, onCompleted };
}

const continueBtn = () => screen.getByRole("button", { name: /^continuar$/i });
const sendBtn = () => screen.getByRole("button", { name: /enviar solicitação/i });

function fillContact(name: string, email: string) {
  fireEvent.click(continueBtn());
  fireEvent.click(screen.getByText(/enviar somente aéreo/i));
  fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: email } });
  fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
}

beforeEach(() => {
  submitMock.mockClear();
  resetMock.mockClear();
  state = "idle";
  listeners.clear();
  resolveSubmit = null;
  sessionStorage.clear();
});
afterEach(cleanup);

describe("reset e envio único da solicitação pública", () => {
  it("dois toques rápidos geram UM único envio", async () => {
    renderJourney();
    fillContact("Maria Souza", "maria@exemplo.com");
    const button = sendBtn();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submitMock).toHaveBeenCalledTimes(1);
    resolveSubmit?.();
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
  });

  it("fechar a confirmação limpa tudo, fecha a janela e volta para a home", async () => {
    const { onOpenChange, onCompleted, rerender } = renderJourney();
    fillContact("Cliente A", "a@exemplo.com");
    fireEvent.click(sendBtn());
    resolveSubmit?.();
    await waitFor(() => expect(screen.getByTestId("wlq-success-close")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("wlq-success-close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("wl-journey:100limites.tur.br:aereo")).toBeNull();

    // Reabrir começa vazio: nenhum dado do Cliente A sobrevive.
    rerender(
      <AgencyQuoteJourney
        hostname="100limites.tur.br"
        agencyName="100 Limites Viagens"
        open
        onOpenChange={onOpenChange}
        primaryService="aereo"
        quickValues={quick()}
        onCompleted={onCompleted}
      />,
    );
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByText(/enviar somente aéreo/i));
    expect(screen.getByLabelText(/^nome/i)).toHaveValue("");
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("");
  });

  it("Cliente A e depois Cliente B chegam com os dados corretos, sem mistura", async () => {
    const first = renderJourney();
    fillContact("Cliente A", "a@exemplo.com");
    fireEvent.click(sendBtn());
    resolveSubmit?.();
    await waitFor(() => expect(screen.getByTestId("wlq-success-close")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("wlq-success-close"));
    first.unmount();

    renderJourney();
    fillContact("Cliente B", "b@exemplo.com");
    fireEvent.click(sendBtn());
    resolveSubmit?.();
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2));

    const a = (submitMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    const b = (submitMock.mock.calls[1] as unknown[])[0] as Record<string, unknown>;
    expect(a.lead_name).toBe("Cliente A");
    expect(a.lead_email).toBe("a@exemplo.com");
    expect(b.lead_name).toBe("Cliente B");
    expect(b.lead_email).toBe("b@exemplo.com");
  });

  it("Enter em um campo revela o campo seguinte em vez de enviar", () => {
    renderJourney();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByText(/enviar somente aéreo/i));
    const name = screen.getByLabelText(/^nome/i) as HTMLInputElement;
    name.focus();
    fireEvent.keyDown(name, { key: "Enter" });
    expect(document.activeElement).not.toBe(name);
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("o corpo rolável e o rodapé com o CTA existem em qualquer etapa", () => {
    renderJourney();
    const body = screen.getByTestId("wlq-body");
    expect(body.className).toContain("overflow-y-auto");
    expect(continueBtn()).toBeVisible();
  });
});

describe("serviço de ingressos na jornada", () => {
  it("o nome do ingresso continua visível ao digitar e chega ao payload", async () => {
    renderJourney();
    fireEvent.click(continueBtn());
    fireEvent.click(screen.getByTestId("wlq-choice-ingressos"));
    fireEvent.click(continueBtn());

    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    const target = inputs.find((el) => el.tagName === "INPUT");
    expect(target).toBeTruthy();
    fireEvent.change(target!, { target: { value: "D" } });
    expect(target!).toBeVisible();
    expect(target!).toHaveValue("D");
    fireEvent.change(target!, { target: { value: "Disney Magic Kingdom" } });
    expect(target!).toHaveValue("Disney Magic Kingdom");

    fireEvent.click(continueBtn());
    fireEvent.change(screen.getByLabelText(/^nome/i), { target: { value: "Maria Souza" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@exemplo.com" } });
    fireEvent.click(screen.getByLabelText(/autorizo o uso dos meus dados/i));
    fireEvent.click(sendBtn());
    resolveSubmit?.();

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    const payload = (submitMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(JSON.stringify(payload)).toContain("Disney Magic Kingdom");
  });
});
