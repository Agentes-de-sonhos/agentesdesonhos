import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ServiceForm,
  OTHER_FORM_FIELD_ORDER,
  OTHER_SERVICE_NAME_LABEL,
  OTHER_SERVICE_NAME_PLACEHOLDER,
} from "@/components/quote/ServiceForms";

const invoke = vi.fn();
const rpc = vi.fn();

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" }, loading: false }) }));
vi.mock("@/components/notes/TemplatePickerButton", () => ({ TemplatePickerButton: () => null }));
vi.mock("@/lib/pdfText", () => ({ extractPdfText: vi.fn(async () => "") }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => invoke(...a) },
    rpc: (...a: any[]) => rpc(...a),
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

function predictions(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    place_id: `P${i}`,
    name: `Passeio ${i}`,
    secondary: "Orlando, EUA",
    types: ["tourist_attraction"],
  }));
}

beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  invoke.mockImplementation((fn: string) => {
    if (fn === "places-autocomplete") return Promise.resolve({ data: { predictions: predictions(9) }, error: null });
    if (fn === "hotel-photos") {
      return Promise.resolve({
        data: { photos: Array.from({ length: 8 }, (_, i) => ({ url: `https://cdn/x${i}.jpg`, thumb_url: `https://cdn/t${i}.jpg` })) },
        error: null,
      });
    }
    if (fn === "generate-destination-intro") return Promise.resolve({ data: { text: "Descricao gerada por IA." }, error: null });
    return Promise.resolve({ data: null, error: null });
  });
});

async function renderOther(props: Partial<React.ComponentProps<typeof ServiceForm>> = {}) {
  const r = render(
    <ServiceForm
      serviceType="other"
      onSubmit={props.onSubmit || vi.fn()}
      onCancel={vi.fn()}
      isLoading={false}
      destinationContext="Orlando"
      {...props}
    />,
  );
  // O seletor de modo aparece antes do formulário tradicional.
  const manual = screen.queryByText("Preencher manualmente");
  if (manual) await act(async () => { manual.click(); });
  return r;
}

describe("Outros Serviços — formulário manual", () => {
  it("usa o novo rótulo e placeholder do primeiro campo", async () => {
    await renderOther();
    expect(screen.getByText(OTHER_SERVICE_NAME_LABEL)).toBeTruthy();
    expect(screen.getByPlaceholderText(OTHER_SERVICE_NAME_PLACEHOLDER)).toBeTruthy();
  });

  it("apresenta os campos na ordem oficial: nome, descrição, fotos, valor, pagamento, título", async () => {
    await renderOther({ paymentSlot: <div data-testid="payment-slot" /> });
    const html = document.body.innerHTML;
    const positions = [
      html.indexOf(OTHER_SERVICE_NAME_LABEL),
      html.indexOf("Descrição do Serviço"),
      html.indexOf("Valor (R$)"),
      html.indexOf("Título do Bloco"),
    ];
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(OTHER_FORM_FIELD_ORDER[0]).toBe("company_name");
    expect(OTHER_FORM_FIELD_ORDER[OTHER_FORM_FIELD_ORDER.length - 1]).toBe("custom_title");
  });

  it("não busca com menos de 3 caracteres e limita a 5 sugestões", async () => {
    const user = userEvent.setup();
    await renderOther();
    const input = screen.getByPlaceholderText(OTHER_SERVICE_NAME_PLACEHOLDER);
    await user.type(input, "pa");
    await new Promise((r) => setTimeout(r, 450));
    expect(invoke.mock.calls.filter((c) => c[0] === "places-autocomplete").length).toBe(0);

    await user.type(input, "sseio");
    await waitFor(() => expect(screen.getAllByText(/^Passeio \d$/).length).toBeGreaterThan(0), { timeout: 2000 });
    expect(screen.getAllByText(/^Passeio \d$/).length).toBe(5);
  });

  it("selecionar um resultado preenche nome e descrição, mantendo tudo editável", async () => {
    const user = userEvent.setup();
    await renderOther();
    const input = screen.getByPlaceholderText(OTHER_SERVICE_NAME_PLACEHOLDER) as HTMLInputElement;
    await user.type(input, "passeio");
    await waitFor(() => expect(screen.getAllByText(/^Passeio 0$/).length).toBeGreaterThan(0), { timeout: 2000 });
    await act(async () => { screen.getAllByText("Passeio 0")[0].click(); });
    await waitFor(() => expect(input.value).toBe("Passeio 0"));
    const description = screen.getByPlaceholderText("Descreva o serviço...") as HTMLTextAreaElement;
    await waitFor(() => expect(description.value.length).toBeGreaterThan(0), { timeout: 2000 });
    await user.clear(description);
    await user.type(description, "Texto do agente");
    expect(description.value).toBe("Texto do agente");
  });

  it("busca sem resultado mantém o preenchimento manual e salva normalmente", async () => {
    invoke.mockImplementation((fn: string) =>
      fn === "places-autocomplete"
        ? Promise.resolve({ data: { predictions: [] }, error: null })
        : Promise.resolve({ data: null, error: null }),
    );
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderOther({ onSubmit });
    const input = screen.getByPlaceholderText(OTHER_SERVICE_NAME_PLACEHOLDER);
    await user.type(input, "servico exclusivo do agente");
    await new Promise((r) => setTimeout(r, 450));
    await user.click(screen.getByText("Salvar"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [data] = onSubmit.mock.calls[0];
    expect(data.company_name).toBe("servico exclusivo do agente");
    expect(data.place_id).toBeUndefined();
  });

  it("serviço antigo sem place_id continua editável e salva sem fotos", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderOther({
      onSubmit,
      initialData: {
        service_data: { company_name: "Chip antigo", description: "Legado", price: 120 } as any,
        amount: 120,
      } as any,
    });
    const input = screen.getByDisplayValue("Chip antigo");
    await user.type(input, " v2");
    await user.click(screen.getByText("Salvar"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].company_name).toBe("Chip antigo v2");
    expect(onSubmit.mock.calls[0][0].description).toBe("Legado");
  });

  it("mantém o fallback 'Outros Serviços' como placeholder do título do bloco", async () => {
    await renderOther();
    expect(screen.getByPlaceholderText("Outros Serviços")).toBeTruthy();
  });
});
