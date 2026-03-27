import { useState } from "react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types/trip";
import type { DateRange } from "react-day-picker";

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const formSchema = z.object({
  client_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  destination: z.string().min(2, "Destino é obrigatório"),
  status: z.string(),
  dateRange: z.object({
    from: z.date({ required_error: "Data de início é obrigatória" }),
    to: z.date({ required_error: "Data de fim é obrigatória" }),
  }).refine((data) => data.to >= data.from, {
    message: "Data de fim deve ser após a data de início",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface TripEditFormProps {
  trip: Trip;
  onSubmit: (data: { client_name: string; destination: string; start_date: string; end_date: string; status: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TripEditForm({ trip, onSubmit, onCancel, isLoading }: TripEditFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: trip.client_name,
      destination: trip.destination,
      status: trip.status,
      dateRange: {
        from: parseLocalDate(trip.start_date),
        to: parseLocalDate(trip.end_date),
      },
    },
  });

  const handleSubmit = (values: FormValues) => {
    const from = values.dateRange.from;
    const to = values.dateRange.to;
    const formatLocalDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onSubmit({
      client_name: values.client_name,
      destination: values.destination,
      start_date: formatLocalDate(from),
      end_date: formatLocalDate(to),
      status: values.status,
    });
  };

  const dateRange = form.watch("dateRange");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                <PlacesAutocomplete
                  value={field.value || ""}
                  onChange={field.onChange}
                  onPlaceSelect={(pred) => field.onChange(pred.name)}
                  placeType="city"
                  placeholder="Ex: Paris, França"
                  fetchDetailsOnSelect={false}
                />
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
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="archived">Arquivada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" /> {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
