import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { TooltipProvider } from "@/components/ui/tooltip";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "fictional-user" } }) }));
vi.mock("@/lib/pdfText", () => ({ extractPdfText: vi.fn() }));

beforeEach(() => invoke.mockReset());

describe("abertura da hospedagem preenchida por IA", () => {
  it("vincula hotel seguro, abre sugestões e preserva nome, descrição e seleção até salvar", async () => {
    invoke.mockImplementation(async (fn: string) => {
      if (fn === "hotel-autocomplete") return { data: { predictions: [{
        place_id: "FORM_SAFE", name: "Hotel Portofino Bay", secondary: "Orlando, FL", is_hotel: true,
      }] }, error: null };
      if (fn === "hotel-photos") return { data: { photos: [{
        url: "https://example.com/photo.jpg", thumb_url: "https://example.com/thumb.jpg", width: 800, height: 600,
      }] }, error: null };
      return { data: null, error: null };
    });
    const save = vi.fn();
    render(<TooltipProvider><QueryClientProvider client={new QueryClient()}><ServiceForm
      serviceType="hotel" onSubmit={save} onCancel={() => {}} isLoading={false}
      initialData={{ amount: 0, description: "Descrição importada preservada", service_data: {
        hotel_name: "Portofino Bay", city: "Orlando", meal_plan: "breakfast", check_in: "2027-01-10", check_out: "2027-01-12",
      } }}
    /></QueryClientProvider></TooltipProvider>);
    const photo = await screen.findByRole("button", { name: "Selecionar foto 1" }, { timeout: 5000 });
    expect(invoke).toHaveBeenCalledWith("hotel-photos", { body: { place_id: "FORM_SAFE" } });
    expect(screen.getByPlaceholderText("Hotel Marriott")).toHaveValue("Portofino Bay");
    expect(save).not.toHaveBeenCalled();
    expect(invoke.mock.calls.filter(([fn]) => fn === "hotel-autocomplete")).toHaveLength(1);
    fireEvent.click(photo);
    await waitFor(() => expect(screen.getByRole("button", { name: "Remover foto 1 da galeria" })).toBeTruthy());
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Salvar/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ hotel_name: "Portofino Bay", city: "Orlando", place_id: "FORM_SAFE" });
    expect(save.mock.calls[0][3]).toBe("Descrição importada preservada");
    expect(save.mock.calls[0][5]).toEqual(["gplace://FORM_SAFE/0"]);
  });
});