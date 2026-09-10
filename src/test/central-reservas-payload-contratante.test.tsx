import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EditarRascunhoDialog } from "@/components/reservas/EditarRascunhoDialog";
import { NovaReservaDialog } from "@/components/reservas/NovaReservaDialog";
import { useTravelFileMutations } from "@/hooks/useTravelFiles";
import type { TravelFile } from "@/types/travelFile";

/**
 * Comportamento real do payload enviado ao servidor (pelo hook) e reset por
 * identidade. Fixtures 100% sintéticas; nenhuma reserva real é tocada.
 */
const SYNTHETIC_CLIENT = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Pessoa Teste Alfa",
  email: null,
  phone: null,
};
const SYNTHETIC_COMPANY = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Empresa Teste Beta",
  trade_name: null,
  cnpj: null,
  email: null,
  phone: null,
  contact_client_id: null,
};

const holder = vi.hoisted(() => ({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: holder.userId } }),
}));

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    ilike: () => builder,
    then: (resolve: any) => resolve({ data: [SYNTHETIC_CLIENT], error: null }),
  };
  return { supabase: { from: () => builder, rpc: (...args: any[]) => rpc(...args) } };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return {
    ...result,
    rerender: (next: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={client}>{next}</QueryClientProvider>),
  };
}

const draft = (over: Partial<TravelFile> = {}): TravelFile =>
  ({
    id: "44444444-4444-4444-8444-444444444444",
    status: "draft",
    origin: "manual",
    contractor_type: "individual",
    client_id: SYNTHETIC_CLIENT.id,
    company_id: null,
    contact_client_id: "contato-1",
    trip_name: "Viagem Teste",
    primary_destination: "Cidade Teste",
    start_date: null,
    end_date: null,
    adults_count: 1,
    children_count: 0,
    passengers_count: 1,
    currency: "BRL",
  }) as unknown as TravelFile;

/** Liga o diálogo ao hook real: o payload verificado é o que vai ao servidor. */
function EditHarness({ file, canEdit }: { file: TravelFile; canEdit?: boolean }) {
  const { saveManualData } = useTravelFileMutations(file.id);
  return (
    <EditarRascunhoDialog
      open
      onOpenChange={() => {}}
      file={file}
      currentClient={{ id: SYNTHETIC_CLIENT.id, name: SYNTHETIC_CLIENT.name }}
      currentContact={{ id: "contato-1", name: "Contato Teste" }}
      canEditContractor={canEdit}
      onSave={async (input) => {
        await saveManualData.mutateAsync(input as any);
      }}
    />
  );
}

const lastPayload = () => {
  const call = rpc.mock.calls.find((c) => c[0] === "travel_file_update_manual");
  return (call?.[1]?._payload || {}) as Record<string, unknown>;
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  holder.userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
});
afterEach(cleanup);

describe("edição de rascunho: campo não alterado nunca é apagado", () => {
  it("sem permissão de corrigir contratante, alterar datas preserva o contato vinculado", async () => {
    const user = userEvent.setup();
    wrap(<EditHarness file={draft({ status: "request_received" })} />);

    await user.clear(screen.getByLabelText(/Ida \(opcional\)/i));
    await user.type(screen.getByLabelText(/Ida \(opcional\)/i), "2030-05-10");
    await user.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const payload = lastPayload();
    expect(payload.start_date).toBe("2030-05-10");
    // Nenhum campo de contratante é enviado: o servidor preserva os vínculos.
    expect("contact_client_id" in payload).toBe(false);
    expect("client_id" in payload).toBe(false);
    expect("company_id" in payload).toBe(false);
    expect("contractor_type" in payload).toBe(false);
  });

  it("com permissão, alterar só o destino preserva o contato vinculado", async () => {
    const user = userEvent.setup();
    wrap(<EditHarness file={draft()} canEdit />);

    await user.clear(screen.getByLabelText("Destino"));
    await user.type(screen.getByLabelText("Destino"), "Outra Cidade");
    await user.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const payload = lastPayload();
    expect(payload.primary_destination).toBe("Outra Cidade");
    expect("contact_client_id" in payload).toBe(false);
    expect("client_id" in payload).toBe(false);
  });

  it("troca explícita de PJ para PF apaga o contato da empresa", async () => {
    const user = userEvent.setup();
    wrap(
      <EditHarness
        file={draft({ contractor_type: "company", client_id: null, company_id: SYNTHETIC_COMPANY.id })}
        canEdit
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pessoa" }));
    await user.click(await screen.findByText(SYNTHETIC_CLIENT.name));
    await user.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const payload = lastPayload();
    console.log("CALLS", JSON.stringify(rpc.mock.calls));
    expect(payload.contractor_type).toBe("individual");
    expect(payload.client_id).toBe(SYNTHETIC_CLIENT.id);
    expect(payload.company_id).toBeNull();
    // limpeza explícita, provocada pela troca de tipo
    expect(payload.contact_client_id).toBeNull();
  });
});

describe("reset por identidade no cadastro manual", () => {
  it("trocar de conta limpa todo o rascunho e as buscas digitadas", async () => {
    const user = userEvent.setup();
    const { rerender } = wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem da Conta Antiga");
    await user.type(screen.getByLabelText(/Destino/i), "Destino Antigo");
    await user.type(screen.getByLabelText(/Ida \(opcional\)/i), "2030-01-02");
    await user.type(screen.getByLabelText(/Pessoa contratante/i), "Alfa");
    await user.click(await screen.findByText(SYNTHETIC_CLIENT.name));
    expect(screen.getByText(`Selecionado: ${SYNTHETIC_CLIENT.name}`)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Empresa" }));
    await user.type(screen.getByLabelText(/Ou cadastre uma nova empresa/i), "Empresa Antiga");
    await user.type(screen.getByLabelText(/Empresa contratante/i), "Beta");

    // troca de conta/agência na mesma aba
    holder.userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    rerender(<NovaReservaDialog open onOpenChange={() => {}} />);

    await waitFor(() =>
      expect((screen.getByLabelText(/Nome da viagem/i) as HTMLInputElement).value).toBe(""),
    );
    expect((screen.getByLabelText(/Destino/i) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/Ida \(opcional\)/i) as HTMLInputElement).value).toBe("");
    // voltou para Pessoa e sem contratante selecionado nem termo digitado
    expect(screen.queryByText(/Selecionado:/)).toBeNull();
    expect((screen.getByLabelText(/Pessoa contratante/i) as HTMLInputElement).value).toBe("");
    expect(screen.queryByLabelText(/Ou cadastre uma nova empresa/i)).toBeNull();
  });

  it("a nova conta salva apenas o que ela digitou, com nova intenção de cadastro", async () => {
    const user = userEvent.setup();
    rpc.mockResolvedValue({
      data: { file_id: "file-novo", file_number_display: "0000001", duplicate: false },
      error: null,
    });
    const { rerender } = wrap(<NovaReservaDialog open onOpenChange={() => {}} />);

    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem da Conta Antiga");
    holder.userId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
    rerender(<NovaReservaDialog open onOpenChange={() => {}} />);
    await waitFor(() =>
      expect((screen.getByLabelText(/Nome da viagem/i) as HTMLInputElement).value).toBe(""),
    );

    await user.type(screen.getByLabelText(/Nome da viagem/i), "Viagem Nova");
    await user.click(await screen.findByText(SYNTHETIC_CLIENT.name));
    await user.click(screen.getByRole("button", { name: /Salvar rascunho/i }));

    await waitFor(() =>
      expect(rpc.mock.calls.some((c) => c[0] === "travel_file_create_manual")).toBe(true),
    );
    const payload = rpc.mock.calls.find((c) => c[0] === "travel_file_create_manual")![1]._payload;
    expect(payload.trip_name).toBe("Viagem Nova");
    expect(payload.trip_name).not.toContain("Antiga");
  });
});
