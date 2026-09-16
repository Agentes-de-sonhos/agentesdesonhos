import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreatePostForm } from "@/components/community/CreatePostForm";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { name: "Agente Teste", avatar_url: null } }) }),
      }),
    }),
    storage: { from: () => ({ remove: async () => ({ data: null, error: null }) }) },
  },
}));

function renderComposer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreatePostForm onSubmit={vi.fn()} isCreating={false} collapsible />
    </QueryClientProvider>,
  );
}

describe("compositor da Comunidade — ações internas não fecham o compositor", () => {
  beforeEach(() => vi.clearAllMocks());

  const openComposer = () => {
    const textarea = screen.getByPlaceholderText(/O que você quer compartilhar hoje/i);
    fireEvent.focus(textarea);
    return textarea as HTMLTextAreaElement;
  };

  it.each(["Foto", "Vídeo", "Documento", "Enquete"])(
    "mantém o compositor aberto ao clicar em %s com conteúdo vazio",
    async (label) => {
      renderComposer();
      const textarea = openComposer();
      const button = screen.getByRole("button", { name: new RegExp(label, "i") });

      // Blur causado pelo clique no próprio botão do compositor.
      fireEvent.blur(textarea, { relatedTarget: button });
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();

      fireEvent.click(button);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Publicar/i })).toBeInTheDocument(),
      );
    },
  );

  it("dispara o seletor de arquivos ao clicar em Foto", () => {
    renderComposer();
    const textarea = openComposer();
    const button = screen.getByRole("button", { name: /Foto/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.blur(textarea, { relatedTarget: button });
    fireEvent.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("abre o painel de enquete e mantém o compositor aberto", async () => {
    renderComposer();
    const textarea = openComposer();
    const button = screen.getByRole("button", { name: /Enquete/i });
    fireEvent.blur(textarea, { relatedTarget: button });
    fireEvent.click(button);

    expect(await screen.findByLabelText("Pergunta da enquete")).toBeInTheDocument();

    // Mesmo com o painel aberto, sair do compositor não fecha (há conteúdo).
    fireEvent.blur(textarea, { relatedTarget: document.body });
    expect(screen.getByLabelText("Pergunta da enquete")).toBeInTheDocument();
  });

  it("mantém aberto com conteúdo preenchido e fecha ao clicar realmente fora quando vazio", () => {
    renderComposer();
    const textarea = openComposer();

    fireEvent.change(textarea, { target: { value: "Olá comunidade" } });
    fireEvent.blur(textarea, { relatedTarget: document.body });
    expect(screen.getByRole("button", { name: /Foto/i })).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.blur(textarea, { relatedTarget: document.body });
    expect(screen.queryByRole("button", { name: /Foto/i })).not.toBeInTheDocument();
  });
});
