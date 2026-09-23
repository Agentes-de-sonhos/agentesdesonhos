import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RequiredFieldsScope, ServiceFormActions } from "@/components/quote/RequiredFieldsScope";
import {
  REQUIRED_FIELDS_MESSAGE,
  REQUIRED_FIELD_SUFFIX,
  focusFirstInvalidField,
  requiredFieldNames,
} from "@/lib/serviceFormRequired";

const schema = z.object({
  hotel_name: z.string().min(1, "Informe o nome do hotel"),
  check_in: z.string().min(1, "Informe a data de entrada"),
  notes: z.string().optional(),
  free_text: z.string(),
  breakfast: z.boolean(),
});

function Harness({ onValid }: { onValid?: (v: unknown) => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { hotel_name: "", check_in: "", notes: "", free_text: "", breakfast: false },
  });
  return (
    <Form {...form}>
      <RequiredFieldsScope schema={schema}>
        <form
          onSubmit={form.handleSubmit(
            (v) => onValid?.(v),
            (errs) => focusFirstInvalidField(errs as Record<string, unknown>),
          )}
        >
          <FormField
            control={form.control}
            name="hotel_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do hotel</FormLabel>
                <FormControl>
                  <input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ServiceFormActions>
            <button type="submit">Salvar</button>
          </ServiceFormActions>
        </form>
      </RequiredFieldsScope>
    </Form>
  );
}

describe("campos obrigatórios dos formulários de serviço", () => {
  it("deriva obrigatórios do schema sem incluir opcionais, booleanos ou texto livre", () => {
    const names = requiredFieldNames(schema);
    expect(names.has("hotel_name")).toBe(true);
    expect(names.has("check_in")).toBe(true);
    expect(names.has("notes")).toBe(false);
    expect(names.has("breakfast")).toBe(false);
    expect(names.has("free_text")).toBe(false);
  });

  it("marca o rótulo obrigatório em vermelho e não marca opcionais", () => {
    render(<Harness />);
    const marks = screen.getAllByTestId("required-field-mark");
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe(REQUIRED_FIELD_SUFFIX);
    expect(marks[0].className).toContain("text-destructive");
    expect(screen.getByText("Observações").textContent).not.toContain(REQUIRED_FIELD_SUFFIX);
  });

  it("mostra o resumo junto ao Salvar e o erro específico do campo, e remove ao corrigir", async () => {
    render(<Harness />);
    expect(screen.queryByTestId("service-form-required-summary")).toBeNull();

    fireEvent.click(screen.getByText("Salvar"));
    await waitFor(() => {
      expect(screen.getByTestId("service-form-required-summary").textContent).toBe(REQUIRED_FIELDS_MESSAGE);
    });
    expect(screen.getByText("Informe o nome do hotel")).toBeTruthy();

    const input = document.querySelector('input[name="hotel_name"]') as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();

    fireEvent.change(input, { target: { value: "Hotel Teste" } });
    await waitFor(() => {
      expect(screen.queryByText("Informe o nome do hotel")).toBeNull();
    });
  });

  it("rola e foca o primeiro campo inválido", () => {
    render(<Harness />);
    const input = document.querySelector('input[name="hotel_name"]') as HTMLInputElement;
    const scrollSpy = vi.fn();
    (input as any).scrollIntoView = scrollSpy;
    focusFirstInvalidField({ hotel_name: { message: "x" } });
    expect(scrollSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it("não quebra quando não há erros", () => {
    expect(() => focusFirstInvalidField(undefined)).not.toThrow();
    expect(() => focusFirstInvalidField({})).not.toThrow();
  });
});
