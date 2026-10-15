import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpc = vi.fn();
const updates: unknown[] = [];
let resolveUpdate: Array<() => void> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => ({ update: (v: unknown) => { updates.push(v); return { eq: () => new Promise((r) => resolveUpdate.push(() => r({ error: null }))) }; } }),
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { TripWalletModulesCard } from "@/components/wallet/TripWalletModulesCard";

const owner = { show_calendar: true, show_next_service: true, show_next_activity: false, show_support_tools: false, show_signature: true, show_whatsapp: true };
const mount = (o: unknown = null) => render(<QueryClientProvider client={new QueryClient()}><TripWalletModulesCard tripId="trip-1" initialOverrides={o} /></QueryClientProvider>);
const sw = (label: string) => screen.getByRole("switch", { name: label });

beforeEach(() => { rpc.mockReset(); updates.length = 0; resolveUpdate = []; });

describe("TripWalletModulesCard", () => {
  it("usa o padrão da agência dona da viagem (consulta por viagem, não pela conta conectada)", async () => {
    rpc.mockResolvedValue({ data: [owner], error: null });
    mount();
    await waitFor(() => expect(sw("Próximo serviço contratado")).toHaveAttribute("data-state", "checked"));
    expect(rpc).toHaveBeenCalledWith("get_trip_agency_wallet_defaults", { _trip_id: "trip-1" });
  });

  it("sem acesso à agência dona, cai no padrão do sistema", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    mount();
    await waitFor(() => expect(sw("Calendário da viagem")).not.toBeDisabled());
    expect(sw("Próximo serviço contratado")).toHaveAttribute("data-state", "unchecked");
  });

  it("override false vence o padrão e cliques rápidos não se perdem; reset volta a null", async () => {
    rpc.mockResolvedValue({ data: [owner], error: null });
    mount({ show_next_service: false });
    await waitFor(() => expect(sw("Calendário da viagem")).not.toBeDisabled());
    expect(sw("Próximo serviço contratado")).toHaveAttribute("data-state", "unchecked");
    fireEvent.click(sw("Calendário da viagem"));
    resolveUpdate.shift()!();
    await waitFor(() => expect(sw("Botão WhatsApp")).not.toBeDisabled());
    fireEvent.click(sw("Botão WhatsApp"));
    expect(updates.at(-1)).toEqual({ wallet_modules: { show_next_service: false, show_calendar: false, show_whatsapp: false } });
    resolveUpdate.shift()!();
    await waitFor(() => screen.getByRole("button", { name: /Usar padrão da agência/ }));
    fireEvent.click(screen.getByRole("button", { name: /Usar padrão da agência/ }));
    expect(updates.at(-1)).toEqual({ wallet_modules: null });
  });
});
