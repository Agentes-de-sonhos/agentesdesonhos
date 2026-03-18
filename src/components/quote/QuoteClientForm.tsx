import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, Baby, MapPin } from "lucide-react";
import { useFormDraft } from "@/hooks/usePersistedState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { QuoteFormData } from "@/types/quote";
import type { DateRange } from "react-day-picker";

const formSchema = z.object({
  client_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  adults_count: z.number().min(1, "Mínimo 1 adulto"),
  children_count: z.number().min(0),
  destination: z.string().min(2, "Destino é obrigatório"),
  dateRange: z.object({
    from: z.date({ required_error: "Data de início é obrigatória" }),
    to: z.date({ required_error: "Data de fim é obrigatória" }),
  }).refine((r) => r.to >= r.from, {
    message: "Data de fim deve ser após a data de início",
    path: ["to"],
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface QuoteClientFormProps {
  onSubmit: (data: QuoteFormData) => void;
  isLoading?: boolean;
}

export function QuoteClientForm({ onSubmit, isLoading }: QuoteClientFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { loadDraft, saveDraft, clearDraft } = useFormDraft<FormValues>("quote-client");

  const draft = loadDraft();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: draft?.client_name || "",
      adults_count: draft?.adults_count || 2,
      children_count: draft?.children_count || 0,
      destination: draft?.destination || "",
      dateRange: draft?.dateRange?.from
        ? { from: new Date(draft.dateRange.from), to: draft.dateRange.to ? new Date(draft.dateRange.to) : undefined as any }
        : { from: undefined as any, to: undefined as any },
    },
  });

  // Auto-save form values on change
  const watchedValues = form.watch();
  useEffect(() => {
    saveDraft(watchedValues);
  }, [watchedValues, saveDraft]);

  const handleSubmit = (values: FormValues) => {
    clearDraft();
    onSubmit({
      client_name: values.client_name,
      adults_count: values.adults_count,
      children_count: values.children_count,
      destination: values.destination,
      start_date: format(values.dateRange.from, "yyyy-MM-dd"),
      end_date: format(values.dateRange.to, "yyyy-MM-dd"),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="adults_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Adultos
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === "" ? 1 : parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="children_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Crianças
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destino Principal
              </FormLabel>
              <FormControl>
                <Input placeholder="Ex: Paris, França" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Período da Viagem</FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value?.from && "text-muted-foreground"
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "dd/MM/yyyy", { locale: ptBR })}
                            {" — "}
                            {format(field.value.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(field.value.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione início e fim</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={field.value?.from ? { from: field.value.from, to: field.value.to } as DateRange : undefined}
                    onSelect={(range: DateRange | undefined) => {
                      field.onChange({ from: range?.from, to: range?.to });
                      if (range?.from && range?.to) {
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    numberOfMonths={2}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Criando..." : "Criar Orçamento"}
        </Button>
      </form>
    </Form>
  );
}