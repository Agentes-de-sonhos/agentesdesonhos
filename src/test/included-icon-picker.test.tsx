import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsIncludedEditor } from "@/components/quote/WhatsIncludedEditor";

type UpdatePayload = { whats_included: Array<string | { text: string; icon?: string }> | null };
const updates: UpdatePayload[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (payload: UpdatePayload) => {
        updates.push(payload);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const quote = {
  id: "q1",
  services: [
    { service_type: "hotel", service_data: { hotel_name: "Hotel Praia" } },
    { service_type: "insurance", service_data: {} },
  ],
};

function openPickerTrigger() {
  return screen.getByRole("button", { name: /Alterar ícone de Hotel Praia/i });
}

describe("seletor de ícones da etapa Incluso", () => {
  beforeEach(() => {
    updates.length = 0;
    localStorage.clear();
  });

  it("abre pelo bloco do ícone, busca, filtra por categoria, seleciona e aplica", async () => {
    const user = userEvent.setup();
    render(<WhatsIncludedEditor quote={quote} />);

    await user.click(openPickerTrigger());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Alterar ícone de/i)).toBeInTheDocument();

    // busca em português
    await user.type(within(dialog).getByLabelText("Buscar ícone"), "bagagem");
    const luggage = await within(dialog).findByRole("button", { name: "Bagagem" });
    await user.click(luggage);
    expect(luggage).toHaveAttribute("aria-pressed", "true");

    // prévia mostra o nome do ícone escolhido
    expect(within(dialog).getAllByText("Bagagem").length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole("button", { name: /Aplicar/i }));

    await waitFor(() => expect(updates.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(updates.at(-1).whats_included[0]).toEqual({ text: "Hotel Praia", icon: "luggage" });
  });

  it("navega por categorias", async () => {
    const user = userEvent.setup();
    render(<WhatsIncludedEditor quote={quote} />);
    await user.click(openPickerTrigger());
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cruzeiros" }));
    expect(await within(dialog).findByRole("button", { name: "Navio" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Avião" })).toBeNull();
  });

  it("cancelar não altera nada", async () => {
    const user = userEvent.setup();
    render(<WhatsIncludedEditor quote={quote} />);
    await user.click(openPickerTrigger());
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Praia" }));
    await user.click(within(dialog).getByRole("button", { name: /^Cancelar$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await new Promise((r) => setTimeout(r, 1400));
    expect(updates).toHaveLength(0);
  });

  it("usar sugestão automática remove a escolha manual", async () => {
    const user = userEvent.setup();
    render(<WhatsIncludedEditor quote={{ ...quote, whats_included: [{ text: "Hotel Praia", icon: "luggage" }] }} />);
    await user.click(openPickerTrigger());
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Usar sugestão automática/i }));
    await waitFor(() => expect(updates.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(updates.at(-1).whats_included).toEqual(["Hotel Praia"]);
  });

  it("reabrir o orçamento mantém a escolha manual persistida", async () => {
    render(<WhatsIncludedEditor quote={{ ...quote, whats_included: [{ text: "Hotel Praia", icon: "luggage" }] }} />);
    expect(screen.getByTitle(/^Bagagem — alterar ícone$/)).toBeInTheDocument();
  });

  it("ícone salvo desconhecido cai em fallback sem quebrar a tela", async () => {
    render(<WhatsIncludedEditor quote={{ ...quote, whats_included: [{ text: "Hotel Praia", icon: "removido-da-lib" }] }} />);
    expect(screen.getByTitle(/^Hotel — alterar ícone$/)).toBeInTheDocument();
  });

  it("'Gerar novamente' preserva ícones manuais por texto e reverte os sem correspondência", async () => {
    const user = userEvent.setup();
    render(
      <WhatsIncludedEditor
        quote={{
          ...quote,
          whats_included: [
            { text: "Hotel Praia", icon: "luggage" },
            { text: "Item antigo removido", icon: "ship" },
          ],
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Gerar novamente/i }));
    await waitFor(() => expect(updates.length).toBeGreaterThan(0), { timeout: 4000 });
    const saved = updates.at(-1).whats_included;
    expect(saved[0]).toEqual({ text: "Hotel Praia", icon: "luggage" });
    expect(saved.some((x) => typeof x !== "string" && x.icon === "ship")).toBe(false);
  });

  it("é acessível por teclado com Escape para cancelar", async () => {
    const user = userEvent.setup();
    render(<WhatsIncludedEditor quote={quote} />);
    const trigger = openPickerTrigger();
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(updates).toHaveLength(0);
  });

  it("alvo de toque do gatilho tem ao menos 44px no mobile", () => {
    render(<WhatsIncludedEditor quote={quote} />);
    expect(openPickerTrigger().className).toMatch(/h-11 w-11/);
  });
});
