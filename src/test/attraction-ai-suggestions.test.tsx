import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { AttractionAISuggestions } from "@/components/quote/AttractionAISuggestions";
import {
  fetchProductSuggestions,
  fetchTicketDescription,
  fetchTicketTypeSuggestions,
} from "@/lib/attractionSuggestions";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

beforeEach(() => invoke.mockReset());

const forms = readFileSync("src/components/quote/ServiceForms.tsx", "utf-8");

describe("sugestões de IA em Ingressos/Atrações", () => {
  it("não chama IA antes de uma ação explícita do usuário", async () => {
    render(
      <AttractionAISuggestions
        productName="Universal Orlando"
        ticketType=""
        currentDescription=""
        onProductSelect={vi.fn()}
        onTicketTypeSelect={vi.fn()}
        onDescriptionSuggest={vi.fn()}
      />,
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("produto só popula o nome depois da seleção e então sugere tipos", async () => {
    invoke.mockImplementation((_fn: string, opts: any) => {
      if (opts?.body?.mode === "products")
        return Promise.resolve({ data: { products: [{ name: "Universal Orlando Resort", location: "Orlando" }] }, error: null });
      if (opts?.body?.mode === "ticket_types")
        return Promise.resolve({ data: { ticket_types: [{ label: "2 dias / 2 parques" }] }, error: null });
      return Promise.resolve({ data: { text: "Experiência completa nos parques." }, error: null });
    });
    const onProductSelect = vi.fn();
    render(
      <AttractionAISuggestions
        productName="Universal"
        ticketType=""
        currentDescription=""
        onProductSelect={onProductSelect}
        onTicketTypeSelect={vi.fn()}
        onDescriptionSuggest={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("attraction-search-products"));
    const option = await screen.findByText(/Universal Orlando Resort/);
    expect(onProductSelect).not.toHaveBeenCalled();
    fireEvent.click(option);
    expect(onProductSelect).toHaveBeenCalledWith("Universal Orlando Resort");
    await screen.findByText("2 dias / 2 parques");
  });

  it("tipo selecionado gera descrição e não sobrescreve texto existente sem confirmação", async () => {
    invoke.mockImplementation((_fn: string, opts: any) => {
      if (opts?.body?.mode === "ticket_types")
        return Promise.resolve({ data: { ticket_types: [{ label: "Park Hopper" }] }, error: null });
      if (opts?.body?.mode === "description")
        return Promise.resolve({ data: { text: "Acesso aos parques no mesmo dia." }, error: null });
      return Promise.resolve({ data: {}, error: null });
    });
    const onDescriptionSuggest = vi.fn();
    render(
      <AttractionAISuggestions
        productName="Walt Disney World"
        ticketType=""
        currentDescription="Descrição já escrita pelo consultor"
        onProductSelect={vi.fn()}
        onTicketTypeSelect={vi.fn()}
        onDescriptionSuggest={onDescriptionSuggest}
      />,
    );
    fireEvent.click(screen.getByTestId("attraction-confirm-product"));
    fireEvent.click(await screen.findByText("Park Hopper"));
    const replace = await screen.findByTestId("attraction-description-replace");
    expect(onDescriptionSuggest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Substituir pela sugestão"));
    expect(onDescriptionSuggest).toHaveBeenCalledWith("Acesso aos parques no mesmo dia.");
    expect(replace).toBeTruthy();
  });

  it("preenche a descrição direto quando o campo está vazio", async () => {
    invoke.mockImplementation((_fn: string, opts: any) => {
      if (opts?.body?.mode === "ticket_types")
        return Promise.resolve({ data: { ticket_types: [{ label: "Inteira" }] }, error: null });
      return Promise.resolve({ data: { text: "Espetáculo imperdível na Broadway." }, error: null });
    });
    const onDescriptionSuggest = vi.fn();
    render(
      <AttractionAISuggestions
        productName="O Rei Leão na Broadway"
        ticketType=""
        currentDescription=""
        onProductSelect={vi.fn()}
        onTicketTypeSelect={vi.fn()}
        onDescriptionSuggest={onDescriptionSuggest}
      />,
    );
    fireEvent.click(screen.getByTestId("attraction-confirm-product"));
    fireEvent.click(await screen.findByText("Inteira"));
    await waitFor(() =>
      expect(onDescriptionSuggest).toHaveBeenCalledWith("Espetáculo imperdível na Broadway."),
    );
  });

  it("exibe o aviso de sugestão por IA", () => {
    render(
      <AttractionAISuggestions
        productName=""
        ticketType=""
        currentDescription=""
        onProductSelect={vi.fn()}
        onTicketTypeSelect={vi.fn()}
        onDescriptionSuggest={vi.fn()}
      />,
    );
    expect(screen.getByText(/confirme as condições com o fornecedor/i)).toBeTruthy();
  });
});

describe("cliente de sugestões", () => {
  it("falha da IA mantém o formulário funcional (listas vazias)", async () => {
    invoke.mockImplementation(() => Promise.resolve({ data: null, error: { message: "timeout" } }));
    await expect(fetchProductSuggestions("Universal Orlando")).resolves.toEqual([]);
    await expect(fetchTicketTypeSuggestions("Universal Orlando")).resolves.toEqual([]);
    await expect(fetchTicketDescription("Universal Orlando", "Park Hopper")).resolves.toBe("");
  });

  it("texto curto não dispara chamada de IA", async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    await fetchProductSuggestions("un");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("reaproveita cache para o mesmo termo", async () => {
    invoke.mockResolvedValue({ data: { products: [{ name: "Disney Springs" }] }, error: null });
    await fetchProductSuggestions("disney springs cache");
    await fetchProductSuggestions("Disney Springs Cache");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe("formulário de Ingressos/Atrações", () => {
  it("pagamento vem antes de observações e fotos ficam por último", () => {
    const start = forms.indexOf("function AttractionForm(");
    const end = forms.indexOf("INSURANCE FORM", start);
    const block = forms.slice(start, end);
    const payment = block.indexOf("renderPaymentSlot(paymentSlot, totalAmount)");
    const notes = block.indexOf('name="notes"');
    const photos = block.indexOf("{photoSlot}");
    expect(payment).toBeGreaterThan(-1);
    expect(notes).toBeGreaterThan(payment);
    expect(photos).toBeGreaterThan(notes);
  });

  it("usa o bloco de sugestões de IA e mantém texto livre no tipo de ingresso", () => {
    const start = forms.indexOf("function AttractionForm(");
    const end = forms.indexOf("INSURANCE FORM", start);
    const block = forms.slice(start, end);
    expect(block).toContain("<AttractionAISuggestions");
    expect(block).toContain('name="ticket_type"');
    expect(block).toContain("<Input placeholder=\"2day-2park, Park Hopper...\"");
  });

  it("fotos sugeridas reutilizam o seletor de fotos existente com limite de 5", () => {
    expect(forms).toContain("<InternetPhotosPicker");
    expect(forms).toContain("limit={MAX_ATTRACTION_PHOTOS}");
    expect(forms).toContain('data-testid="attraction-photo-suggestions"');
  });
});
