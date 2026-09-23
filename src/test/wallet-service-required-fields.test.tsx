import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: any[]) => toastMock(...a), useToast: () => ({ toast: toastMock }) }));
vi.mock("@/integrations/supabase/client", () => {
  const q: any = new Proxy(() => q, { get: () => q, apply: () => q });
  return { supabase: { from: () => q, functions: { invoke: vi.fn() }, auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } } };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }) }));
vi.mock("@/lib/pdfText", () => ({ extractPdfText: vi.fn(async () => "") }));
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useWizardInvalidHandler, WALLET_REQUIRED_MESSAGE } from "@/components/trip/useWizardInvalidHandler";
import { TripServiceForm } from "@/components/trip/TripServiceForms";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

beforeEach(() => {
  toastMock.mockReset();
  (Element.prototype as any).scrollIntoView = vi.fn();
});

// Formulário genérico em 3 etapas (ex.: seguro/cruzeiro/outros) usando o mesmo hook.
const schema = z.object({ provider: z.string().min(1, "Informe a seguradora"), note: z.string().optional() });
function Wizard({ onValid }: { onValid: (v: any) => void }) {
  const [step, setStep] = useState(0);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { provider: "", note: "" } });
  const { formRef, onInvalid } = useWizardInvalidHandler({ totalSteps: 3, currentStep: step, setStep, wizardMode: true });
  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onValid, onInvalid)}>
        <span data-testid="step">{step}</span>
        {step === 0 && (
          <FormField control={form.control} name="provider" render={({ field }) => (
            <FormItem><FormLabel>Seguradora *</FormLabel><FormControl><input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        )}
        {step === 1 && (
          <FormField control={form.control} name="note" render={({ field }) => (
            <FormItem><FormLabel>Obs</FormLabel><FormControl><input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        )}
        <button type="button" onClick={() => setStep((s) => s + 1)}>Continuar</button>
        <button type="submit">Salvar</button>
      </form>
    </Form>
  );
}

describe("Carteira Digital — validação compartilhada de serviços manuais", () => {
  it("volta para a etapa anterior com erro, lista o campo e foca", async () => {
    const onValid = vi.fn();
    render(<Wizard onValid={onValid} />);
    fireEvent.change(document.querySelector('input[name="provider"]')!, { target: { value: "" } });
    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Continuar"));
    expect(screen.getByTestId("step").textContent).toBe("2");
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toMatchObject({ title: WALLET_REQUIRED_MESSAGE, description: "Pendências: Seguradora." });
    expect(screen.getByTestId("step").textContent).toBe("0");
    const input = document.querySelector('input[name="provider"]') as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(input);
    expect(screen.getByText("Informe a seguradora")).toBeTruthy();
    expect(onValid).not.toHaveBeenCalled();
  });

  it("envio válido salva normalmente sem aviso", async () => {
    const onValid = vi.fn();
    render(<Wizard onValid={onValid} />);
    fireEvent.change(document.querySelector('input[name="provider"]')!, { target: { value: "Assist Card" } });
    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => expect(onValid).toHaveBeenCalled());
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("Transfer sem Origem e Destino: não salva, mostra pendências e preserva dados", async () => {
    const onSubmit = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><TooltipProvider><TripServiceForm serviceType="transfer" onSubmit={onSubmit} onCancel={() => {}} /></TooltipProvider></QueryClientProvider>);
    const company = document.querySelector('input[name="company_name"]') as HTMLInputElement | null;
    if (company) fireEvent.change(company, { target: { value: "Transfers SA" } });
    // Avança até a última etapa.
    for (let i = 0; i < 10; i++) {
      const next = screen.queryAllByText(/Continuar/)[0];
      if (!next) break;
      fireEvent.click(next);
    }
    await act(async () => { fireEvent.click(screen.getByText("Salvar transfer")); });
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    const call = toastMock.mock.calls[0][0];
    expect(call.title).toBe(WALLET_REQUIRED_MESSAGE);
    expect(call.description).toContain("Origem");
    expect(call.description).toContain("Destino");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Informe a origem do transfer")).toBeTruthy();
    const origin = document.querySelector('input[name="origin_location"]') as HTMLInputElement;
    expect(origin.getAttribute("aria-invalid")).toBe("true");
    if (company) expect((document.querySelector('input[name="company_name"]') as HTMLInputElement).value).toBe("Transfers SA");
  });
});
