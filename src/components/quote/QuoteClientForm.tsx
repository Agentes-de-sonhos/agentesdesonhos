import { useState, useEffect } from "react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { MultiDestinationInput } from "@/components/quote/MultiDestinationInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, Baby, MapPin, DollarSign, Settings2, ChevronDown, Plane } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import type { QuoteFormData } from "@/types/quote";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_OPTIONS, type QuoteCurrency, type CurrencyMode, getCurrencySymbol } from "@/lib/quoteCurrency";

const formSchema = z.object({
  client_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  adults_count: z.number().min(1, "Mínimo 1 adulto"),
  children_count: z.number().min(0),
  destination: z.string().min(2, "Destino é obrigatório"),
  trip_type: z.enum(["round_trip", "one_way"]),
  dateRange: z.object({
    from: z.date({ required_error: "Data de início é obrigatória" }),
    to: z.date().optional().nullable(),
  }),
}).refine((data) => {
  if (data.trip_type === "round_trip") {
    return !!data.dateRange.to;
  }
  return true;
}, {
  message: "Data de fim é obrigatória para viagens de ida e volta",
  path: ["dateRange", "to"],
}).refine((data) => {
  if (data.trip_type === "round_trip" && data.dateRange.from && data.dateRange.to) {
    return data.dateRange.to >= data.dateRange.from;
  }
  return true;
}, {
  message: "Data de fim deve ser após a data de início",
  path: ["dateRange", "to"],
});

type FormValues = z.infer<typeof formSchema>;

interface QuoteClientFormProps {
  onSubmit: (data: QuoteFormData) => void;
  isLoading?: boolean;
  /**
   * Optional initial data for pre-filling the form (e.g., when navigating
   * here from a CRM opportunity). When provided, these values take precedence
   * over any locally persisted draft.
   */
  defaults?: {
    client_id?: string | null;
    client_name?: string | null;
    destination?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    adults_count?: number | null;
    children_count?: number | null;
  };
}

export function QuoteClientForm({ onSubmit, isLoading, defaults }: QuoteClientFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(
    defaults?.client_id && defaults?.client_name
      ? { id: defaults.client_id, name: defaults.client_name }
      : null
  );
  const [clientError, setClientError] = useState("");
  const [currency, setCurrency] = useState<QuoteCurrency>("BRL");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("fixed");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const { loadDraft, saveDraft, clearDraft } = useFormDraft<FormValues>("quote-client");

  // When defaults are present (e.g., coming from an opportunity), skip the
  // saved local draft to avoid mixing data from a previous unrelated session.
  const draft = defaults ? null : loadDraft();

  const parseDateOnly = (s?: string | null): Date | undefined => {
    if (!s) return undefined;
    const [y, m, d] = s.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    const parsed = new Date(s);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const defaultsFromTrigger = defaults
    ? {
        client_name: defaults.client_name || "",
        adults_count: defaults.adults_count ?? 2,
        children_count: defaults.children_count ?? 0,
        destination: defaults.destination || "",
        trip_type: "round_trip" as const,
        dateRange: {
          from: parseDateOnly(defaults.start_date) as any,
          to: parseDateOnly(defaults.end_date),
        },
      }
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFromTrigger ?? {
      client_name: draft?.client_name || "",
      adults_count: draft?.adults_count || 2,
      children_count: draft?.children_count || 0,
      destination: draft?.destination || "",
      trip_type: (draft as any)?.trip_type || "round_trip",
      dateRange: draft?.dateRange?.from
        ? { from: new Date(draft.dateRange.from), to: draft.dateRange.to ? new Date(draft.dateRange.to) : undefined }
        : { from: undefined as any, to: undefined },
    },
  });

  const tripType = form.watch("trip_type");

  // Auto-save form values on change
  const watchedValues = form.watch();
  useEffect(() => {
    saveDraft(watchedValues);
  }, [watchedValues, saveDraft]);

  // Sync client name from selector
  useEffect(() => {
    if (selectedClient) {
      form.setValue("client_name", selectedClient.name);
      setClientError("");
    }
  }, [selectedClient, form]);

  const handleSubmit = (values: FormValues) => {
    if (!selectedClient) {
      setClientError("Selecione um cliente para continuar");
      return;
    }
    clearDraft();
    const endDate = values.trip_type === "one_way"
      ? format(values.dateRange.from, "yyyy-MM-dd")
      : values.dateRange.to
        ? format(values.dateRange.to, "yyyy-MM-dd")
        : format(values.dateRange.from, "yyyy-MM-dd");
    onSubmit({
      client_id: selectedClient.id,
      client_name: values.client_name,
      adults_count: values.adults_count,
      children_count: values.children_count,
      destination: values.destination,
      start_date: format(values.dateRange.from, "yyyy-MM-dd"),
      end_date: endDate,
      currency,
      currency_mode: currencyMode,
      exchange_rate: currencyMode === "conversion" ? exchangeRate : null,
    });
  };

  const showConversionFields = currency !== "BRL" && currencyMode === "conversion";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Client Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cliente *</Label>
          <ClientSelector
            value={selectedClient}
            onChange={setSelectedClient}
            required
            error={clientError}
          />
        </div>

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
                Destinos
              </FormLabel>
              <FormControl>
                <MultiDestinationInput
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trip Type Selector */}
        <FormField
          control={form.control}
          name="trip_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Tipo de Viagem
              </FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val === "one_way") {
                      form.setValue("dateRange", { from: form.getValues("dateRange.from"), to: undefined });
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="round_trip" id="round_trip" />
                    <Label htmlFor="round_trip" className="font-normal cursor-pointer">Ida e volta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_way" id="one_way" />
                    <Label htmlFor="one_way" className="font-normal cursor-pointer">Somente ida</Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{tripType === "one_way" ? "Data da Viagem" : "Período da Viagem"}</FormLabel>
              {tripType === "one_way" ? (
                /* Single date picker for one-way */
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
                        {field.value?.from
                          ? format(field.value.from, "dd/MM/yyyy", { locale: ptBR })
                          : <span>Selecione a data</span>
                        }
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value?.from}
                      onSelect={(date) => {
                        field.onChange({ from: date, to: undefined });
                        if (date) setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                /* Range picker for round trip */
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
                      selected={field.value?.from ? { from: field.value.from, to: field.value.to ?? undefined } as DateRange : undefined}
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
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ─── Currency Selection ─── */}
        <Collapsible className="rounded-lg border border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Configuração avançada</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Moeda do orçamento</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCurrency(opt.value);
                  if (opt.value === "BRL") setCurrencyMode("fixed");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                  currency === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30 text-primary"
                    : "border-border hover:border-border/80 hover:bg-muted/30 text-foreground"
                )}
              >
                <span>{opt.flag}</span>
                <span>{opt.label} ({opt.symbol})</span>
              </button>
            ))}
          </div>

          {/* Currency Mode — only shown when not BRL */}
          {currency !== "BRL" && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground">Modo de cálculo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrencyMode("fixed")}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                    currencyMode === "fixed"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", currencyMode === "fixed" ? "border-primary" : "border-muted-foreground/40")}>
                    {currencyMode === "fixed" && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Moeda fixa ⭐</p>
                    <p className="text-xs text-muted-foreground">Valores inseridos direto em {getCurrencySymbol(currency)}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("conversion")}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
                    currencyMode === "conversion"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", currencyMode === "conversion" ? "border-primary" : "border-muted-foreground/40")}>
                    {currencyMode === "conversion" && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Conversão automática</p>
                    <p className="text-xs text-muted-foreground">Base em R$, convertido para {getCurrencySymbol(currency)}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Exchange rate — only for conversion mode */}
          {showConversionFields && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Taxa de câmbio (1 {getCurrencySymbol(currency)} = ? R$)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                placeholder="Ex: 5.20"
                value={exchangeRate ?? ""}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || null)}
              />
              <p className="text-xs text-muted-foreground">
                Informe a taxa de câmbio para conversão. Valores base serão em BRL.
              </p>
            </div>
          )}

          {/* Active mode indicator */}
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-xs">
              {CURRENCY_OPTIONS.find((c) => c.value === currency)?.flag}{" "}
              {currencyMode === "fixed" ? "Moeda fixa" : "Conversão ativa"} — {getCurrencySymbol(currency)}
            </Badge>
          </div>
        </div>
          </CollapsibleContent>
        </Collapsible>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Criando..." : "Criar Orçamento"}
        </Button>
      </form>
    </Form>
  );
}
