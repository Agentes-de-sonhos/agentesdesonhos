import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPin } from "lucide-react";
import { useFormDraft } from "@/hooks/usePersistedState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { ClientSelector } from "@/components/shared/ClientSelector";
import { Label } from "@/components/ui/label";
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
import type { TripFormData } from "@/types/trip";
import type { DateRange } from "react-day-picker";

const formSchema = z.object({
  client_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  destination: z.string().min(2, "Destino é obrigatório"),
  dateRange: z.object({
    from: z.date({ required_error: "Data de início é obrigatória" }),
    to: z.date({ required_error: "Data de fim é obrigatória" }),
  }).refine((data) => data.to >= data.from, {
    message: "Data de fim deve ser após a data de início",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<TripFormData>;
}

export function TripForm({ onSubmit, isLoading, defaultValues }: TripFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { loadDraft, saveDraft, clearDraft } = useFormDraft<FormValues>("trip-form");

  const draft = !defaultValues ? loadDraft() : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: defaultValues?.client_name || draft?.client_name || "",
      destination: defaultValues?.destination || draft?.destination || "",
      dateRange: defaultValues?.start_date && defaultValues?.end_date
        ? { from: new Date(defaultValues.start_date), to: new Date(defaultValues.end_date) }
        : draft?.dateRange?.from
          ? { from: new Date(draft.dateRange.from), to: draft.dateRange.to ? new Date(draft.dateRange.to) : undefined }
          : undefined,
    },
  });

  // Auto-save form values on change
  const watchedValues = form.watch();
  useEffect(() => {
    if (!defaultValues) saveDraft(watchedValues);
  }, [watchedValues, saveDraft, defaultValues]);

  const handleSubmit = (values: FormValues) => {
    clearDraft();
    const from = values.dateRange.from;
    const to = values.dateRange.to;
    const formatLocalDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onSubmit({
      client_name: values.client_name,
      destination: values.destination,
      start_date: formatLocalDate(from),
      end_date: formatLocalDate(to),
    });
  };

  const dateRange = form.watch("dateRange");

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
                <ClientAutocomplete value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormLabel className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Período da Viagem
              </FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "dd/MM/yyyy", { locale: ptBR })}
                            {" → "}
                            {format(field.value.to, "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(field.value.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={field.value as DateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                        field.onChange({ from: range.from, to: range.to });
                        setCalendarOpen(false);
                      } else if (range?.from) {
                        field.onChange({ from: range.from, to: undefined });
                      } else {
                        field.onChange(undefined);
                      }
                    }}
                    numberOfMonths={2}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && dateRange?.to && (
                <p className="text-xs text-muted-foreground">
                  {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias de viagem
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Criando..." : "Criar Carteira"}
        </Button>
      </form>
    </Form>
  );
}
