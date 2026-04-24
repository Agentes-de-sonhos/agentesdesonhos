import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, ImageIcon, X, Loader2, Pencil, ChevronDown, Plane, Trash2, Hotel, MapPin, CheckCircle2, DollarSign, Settings2 } from "lucide-react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { Badge } from "@/components/ui/badge";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import type {
  ServiceType, FlightData, HotelData, CarRentalData, TransferData,
  AttractionData, InsuranceData, CruiseData, OtherServiceData,
} from "@/types/quote";

/** Parse "YYYY-MM-DD" as a local date to avoid UTC-shift bug (-1 day). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface ServiceFormProps {
  serviceType: ServiceType;
  onSubmit: (data: any, amount: number, optionLabel?: string, description?: string, imageUrl?: string, imageUrls?: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showOptionLabel?: boolean;
  tripStartDate?: Date;
  tripEndDate?: Date;
  adultsCount?: number;
  childrenCount?: number;
  /** When editing, pass the existing service data to pre-fill the form */
  initialData?: { service_data: any; amount: number; option_label?: string | null; description?: string | null; image_url?: string | null; image_urls?: string[] };
  /** Optional slot rendered between total/notes and action buttons — receives live computed amount */
  paymentSlot?: ((liveAmount: number) => React.ReactNode) | React.ReactNode;
  /** Optional slot for photo upload */
  photoSlot?: React.ReactNode;
}

/** Resolve paymentSlot: if it's a function, call with amount; otherwise render as-is */
function renderPaymentSlot(slot: ServiceFormProps['paymentSlot'], amount: number): React.ReactNode {
  if (typeof slot === 'function') return slot(amount);
  return slot;
}

/** Helper: disable dates outside trip range */
function makeDateDisabler(tripStart?: Date, tripEnd?: Date) {
  if (!tripStart || !tripEnd) return undefined;
  return (date: Date) => date < tripStart || date > tripEnd;
}

/** Helper: default month for calendar to show trip start */
function defaultMonth(tripStart?: Date) {
  return tripStart || undefined;
}

/* ━━━━━━━━━━━━━━━━━━━ FLIGHT FORM ━━━━━━━━━━━━━━━━━━━ */
function formatCurrencyInline(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const flightLegSchema = z.object({
  leg_date: z.string().optional(),
  airport_origin: z.string().optional(),
  airport_destination: z.string().optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  flight_number: z.string().optional(),
});

const emptyLeg = (): z.infer<typeof flightLegSchema> => ({ leg_date: "", airport_origin: "", airport_destination: "", departure_time: "", arrival_time: "", flight_number: "" });

/** Normalize old single-leg data to multi-leg arrays */
function normalizeLegs(init: any): { outbound: z.infer<typeof flightLegSchema>[]; return_: z.infer<typeof flightLegSchema>[] } {
  let outbound: z.infer<typeof flightLegSchema>[] = [];
  let return_: z.infer<typeof flightLegSchema>[] = [];
  if (init?.outbound_legs?.length) {
    outbound = init.outbound_legs;
  } else if (init?.outbound_detail) {
    outbound = [init.outbound_detail];
  }
  if (init?.return_legs?.length) {
    return_ = init.return_legs;
  } else if (init?.return_detail) {
    return_ = [init.return_detail];
  }
  if (!outbound.length) outbound = [emptyLeg()];
  if (!return_.length) return_ = [emptyLeg()];
  return { outbound, return_ };
}

const flightSchema = z.object({
  option_label: z.string().optional(),
  service_description: z.string().optional(),
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  airline: z.string().min(2, "Companhia aérea é obrigatória"),
  departure_date: z.date({ required_error: "Data de ida é obrigatória" }),
  return_date: z.date().optional().nullable(),
  is_one_way: z.boolean(),
  includes_baggage: z.boolean(),
  includes_boarding_fee: z.boolean(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  is_unit_price: z.boolean(),
  notes: z.string().optional(),
  outbound_legs: z.array(flightLegSchema),
  return_legs: z.array(flightLegSchema),
});

function FlightLegFields({ legs, onChange, label }: { legs: z.infer<typeof flightLegSchema>[]; onChange: (legs: z.infer<typeof flightLegSchema>[]) => void; label: string }) {
  const updateLeg = (idx: number, field: string, value: string) => {
    const updated = legs.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    onChange(updated);
  };
  const addLeg = () => onChange([...legs, emptyLeg()]);
  const removeLeg = (idx: number) => {
    if (legs.length <= 1) return;
    onChange(legs.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">✈ {label}</p>
      {legs.map((leg, idx) => (
        <div key={idx} className="relative border border-border/30 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Trecho {idx + 1}</span>
            {legs.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLeg(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Data do voo</label>
              <Input type="date" value={leg.leg_date || ""} onChange={e => updateLeg(idx, "leg_date", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aeroporto de origem</label>
              <Input placeholder="GRU" value={leg.airport_origin || ""} onChange={e => updateLeg(idx, "airport_origin", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aeroporto de destino</label>
              <Input placeholder="CDG" value={leg.airport_destination || ""} onChange={e => updateLeg(idx, "airport_destination", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Horário de saída</label>
              <Input type="time" value={leg.departure_time || ""} onChange={e => updateLeg(idx, "departure_time", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horário de chegada</label>
              <Input type="time" value={leg.arrival_time || ""} onChange={e => updateLeg(idx, "arrival_time", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nº do voo</label>
              <Input placeholder="LA8084" value={leg.flight_number || ""} onChange={e => updateLeg(idx, "flight_number", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addLeg} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Adicionar trecho
      </Button>
    </div>
  );
}

function FlightForm({ onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0, paymentSlot, photoSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const normalizedLegs = normalizeLegs(init);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [outboundLegs, setOutboundLegs] = useState(normalizedLegs.outbound);
  const [returnLegs, setReturnLegs] = useState(normalizedLegs.return_);

  const isOneWayInit = init?.return_date ? false : !tripEndDate || (init && !init.return_date);
  const [isOneWay, setIsOneWay] = useState(init?.is_one_way ?? isOneWayInit ?? false);

  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      option_label: initialData?.option_label || "", service_description: initialData?.description || "",
      origin_city: init?.origin_city || "", destination_city: init?.destination_city || "",
      airline: init?.airline || "",
      includes_baggage: init?.includes_baggage ?? true, includes_boarding_fee: init?.includes_boarding_fee ?? true,
      adult_price: init?.adult_price || 0, child_price: init?.child_price || 0,
      is_unit_price: true,
      is_one_way: init?.is_one_way ?? isOneWayInit ?? false,
      notes: init?.notes || "",
      departure_date: init?.departure_date ? parseLocalDate(init.departure_date) : tripStartDate,
      return_date: init?.return_date ? parseLocalDate(init.return_date) : (isOneWayInit ? undefined : tripEndDate),
      outbound_legs: normalizedLegs.outbound,
      return_legs: normalizedLegs.return_,
    },
  });

  const isUnitPrice = true;
  const adultPrice = form.watch("adult_price");
  const childPrice = form.watch("child_price");

  const totalAdults = adultPrice * adultsCount;
  const totalChildren = childPrice * childrenCount;
  const totalAmount = totalAdults + totalChildren;

  const hasNonEmptyLegs = (legs: z.infer<typeof flightLegSchema>[]) =>
    legs.some(l => Object.values(l).some(v => v && String(v).length > 0));

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    const computedTotalAdults = values.adult_price * adultsCount;
    const computedTotalChildren = values.child_price * childrenCount;

    const hasOutbound = showFlightDetails && hasNonEmptyLegs(outboundLegs);
    const hasReturn = showFlightDetails && hasNonEmptyLegs(returnLegs);

    const data: any = {
      origin_city: values.origin_city, destination_city: values.destination_city,
      airline: values.airline, departure_date: format(values.departure_date, "yyyy-MM-dd"),
      return_date: !isOneWay && values.return_date ? format(values.return_date, "yyyy-MM-dd") : "",
      includes_baggage: values.includes_baggage, includes_boarding_fee: values.includes_boarding_fee,
      adult_price: values.adult_price, child_price: values.child_price,
      is_unit_price: true, is_one_way: isOneWay,
      notes: values.notes || "",
    };

    if (hasOutbound) {
      data.outbound_legs = outboundLegs;
      // backward compat: keep first leg as outbound_detail
      data.outbound_detail = outboundLegs[0];
    }
    if (!isOneWay && hasReturn) {
      data.return_legs = returnLegs;
      data.return_detail = returnLegs[0];
    }

    onSubmit(data, computedTotalAdults + computedTotalChildren, values.option_label || undefined, values.service_description || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* BLOCO 1 — Informações Principais */}
        <FormField control={form.control} name="airline" render={({ field }) => (
          <FormItem><FormLabel>Companhia Aérea</FormLabel><FormControl><Input placeholder="LATAM, GOL, Air France..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade de Origem</FormLabel><FormControl><Input placeholder="São Paulo" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade de Destino</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* Trip type toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!isOneWay} onChange={() => { setIsOneWay(false); form.setValue("is_one_way", false); }} className="accent-primary" />
            <span className="text-sm">Ida e volta</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={isOneWay} onChange={() => { setIsOneWay(true); form.setValue("is_one_way", true); form.setValue("return_date", undefined); }} className="accent-primary" />
            <span className="text-sm">Somente ida</span>
          </label>
        </div>

        {/* BLOCO 2 — Datas */}
        <div className={cn("grid gap-4", !isOneWay && "sm:grid-cols-2")}>
          <FormField control={form.control} name="departure_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data de Ida</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
          {!isOneWay && (
            <FormField control={form.control} name="return_date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Data de Volta</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripEndDate || tripStartDate)} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover><FormMessage /></FormItem>
            )} />
          )}
        </div>

        {/* BLOCO 3 — Inclusões */}
        <div className="flex gap-6">
          <FormField control={form.control} name="includes_baggage" render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Inclui bagagem</FormLabel></FormItem>
          )} />
          <FormField control={form.control} name="includes_boarding_fee" render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Inclui taxa de embarque</FormLabel></FormItem>
          )} />
        </div>

        {/* BLOCO 4 — Detalhes do Voo (expandível) */}
        <div className="border border-border/60 rounded-lg">
          <button
            type="button"
            onClick={() => setShowFlightDetails(!showFlightDetails)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plane className="h-4 w-4" />
            <span className="flex-1 text-left">Adicionar detalhes do voo</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showFlightDetails && "rotate-180")} />
          </button>
          {showFlightDetails && (
            <div className="px-4 pb-4 space-y-5 border-t border-border/40 pt-3">
              <FlightLegFields legs={outboundLegs} onChange={setOutboundLegs} label="Ida" />
              {!isOneWay && <FlightLegFields legs={returnLegs} onChange={setReturnLegs} label="Volta" />}
            </div>
          )}
        </div>

        {/* BLOCO 5 — Apresentação do Serviço */}
        {/* BLOCO 5 — Financeiro (prioritário) */}
        <div className="border border-border/60 rounded-lg">
          <button
            type="button"
            onClick={() => setShowPricing(!showPricing)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            <span className="flex-1 text-left">Adicionar valores e forma de pagamento</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showPricing && "rotate-180")} />
          </button>
          {showPricing && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="adult_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor por adulto (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    {isUnitPrice && adultsCount > 0 && adultPrice > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {adultsCount} adulto{adultsCount > 1 ? "s" : ""} × {formatCurrencyInline(adultPrice)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalAdults)}</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="child_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor por criança (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    {isUnitPrice && childrenCount > 0 && childPrice > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {childrenCount} criança{childrenCount > 1 ? "s" : ""} × {formatCurrencyInline(childPrice)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalChildren)}</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {(adultPrice > 0 || childPrice > 0) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Passagens</span>
                    <span className="text-lg font-bold text-primary">{formatCurrencyInline(totalAmount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {adultsCount} adulto{adultsCount > 1 ? "s" : ""}
                    {childrenCount > 0 ? ` + ${childrenCount} criança${childrenCount > 1 ? "s" : ""}` : ""}
                  </p>
                </div>
              )}

              {renderPaymentSlot(paymentSlot, totalAmount)}
            </div>
          )}
        </div>

        {/* BLOCO 6 — Outras configurações (recolhível) */}
        <div className="border border-border/60 rounded-lg">
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            <span className="flex-1 text-left">Outras configurações</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showExtras && "rotate-180")} />
          </button>
          {showExtras && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
              {showOptionLabel && (
                <FormField control={form.control} name="option_label" render={({ field }) => (
                  <FormItem><FormLabel>Etiqueta (opcional)</FormLabel><FormControl><Input placeholder="Ex: Melhor custo-benefício" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              {photoSlot}
              <FormField control={form.control} name="service_description" render={({ field }) => (
                <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes, diferenciais, informações complementares..." className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ HOTEL FORM ━━━━━━━━━━━━━━━━━━━ */
const hotelSchema = z.object({
  option_label: z.string().optional(),
  service_description: z.string().optional(),
  hotel_name: z.string().min(2, "Nome do hotel é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  check_in: z.date({ required_error: "Check-in é obrigatório" }),
  check_out: z.date({ required_error: "Check-out é obrigatório" }),
  room_type: z.string().min(1, "Tipo de quarto é obrigatório"),
  meal_plan: z.string().min(1, "Regime de alimentação é obrigatório"),
  price: z.number().min(0),
  adult_price: z.number().min(0).optional(),
  child_price: z.number().min(0).optional(),
  notes: z.string().optional(),
});

function HotelForm({ onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, initialData, paymentSlot, photoSlot, onPlaceIdChange }: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      option_label: initialData?.option_label || "", service_description: initialData?.description || "",
      hotel_name: init?.hotel_name || "", city: init?.city || "",
      room_type: init?.room_type || "", meal_plan: init?.meal_plan || "", price: init?.price || initialData?.amount || 0,
      adult_price: init?.adult_price || 0, child_price: init?.child_price || 0,
      notes: init?.notes || "",
      check_in: init?.check_in ? parseLocalDate(init.check_in) : tripStartDate,
      check_out: init?.check_out ? parseLocalDate(init.check_out) : tripEndDate,
    },
  });

  // Hotel autocomplete state
  const [predictions, setPredictions] = useState<Array<{ place_id: string; name: string; secondary: string; is_hotel: boolean }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAutocomplete = useCallback(async (input: string) => {
    if (input.trim().length < 3) { setPredictions([]); setShowDropdown(false); return; }
    setIsSearching(true);
    try {
      const cityVal = form.getValues("city");
      const { data } = await supabase.functions.invoke("hotel-autocomplete", {
        body: { input: input.trim(), city: cityVal?.trim() || undefined },
      });
      if (data?.predictions) { setPredictions(data.predictions); setShowDropdown(data.predictions.length > 0); }
    } catch {} finally { setIsSearching(false); }
  }, [form]);

  const handleHotelNameInput = useCallback((value: string, formOnChange: (v: string) => void) => {
    formOnChange(value);
    setSelectedPlaceId(null);
    onPlaceIdChange?.(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(value), 300);
  }, [fetchAutocomplete, onPlaceIdChange]);

  const handleSelectPrediction = useCallback((p: { place_id: string; name: string; secondary: string }) => {
    form.setValue("hotel_name", p.name);
    setSelectedPlaceId(p.place_id);
    onPlaceIdChange?.(p.place_id);
    setShowDropdown(false);
    setPredictions([]);
    if (!form.getValues("city") && p.secondary) {
      const parts = p.secondary.split(",").map(s => s.trim());
      // secondary format: "Street, City, State, Country" — city is typically the second part
      const cityPart = parts.length >= 3 ? parts[1] : parts[0];
      if (cityPart) form.setValue("city", cityPart);
    }
  }, [form, onPlaceIdChange]);

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    const data: any = {
      hotel_name: values.hotel_name, city: values.city,
      check_in: format(values.check_in, "yyyy-MM-dd"), check_out: format(values.check_out, "yyyy-MM-dd"),
      room_type: values.room_type, meal_plan: values.meal_plan, price: values.price, notes: values.notes || "",
    };
    if (values.adult_price && values.adult_price > 0) data.adult_price = values.adult_price;
    if (values.child_price && values.child_price > 0) data.child_price = values.child_price;
    onSubmit(data, values.price, values.option_label || undefined, values.service_description || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 1. Hotel name (principal) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Hotel</FormLabel>
              <div className="relative" ref={dropdownRef}>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Hotel Marriott"
                      value={field.value}
                      onChange={(e) => handleHotelNameInput(e.target.value, field.onChange)}
                      onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                      autoComplete="off"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    {selectedPlaceId && !isSearching && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                  </div>
                </FormControl>
                {showDropdown && predictions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {predictions.map((p) => (
                      <button key={p.place_id} type="button" className="w-full flex items-start gap-3 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                        onClick={() => handleSelectPrediction(p)}>
                        <div className="mt-0.5 shrink-0">{p.is_hotel ? <Hotel className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          {p.secondary && <p className="text-xs text-muted-foreground truncate">{p.secondary}</p>}
                        </div>
                        {p.is_hotel && <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">Hotel</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* 2. Google photos (auto after hotel selection) */}
        {photoSlot}

        {/* 3. Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="check_in" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Check-in</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="check_out" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Check-out</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripEndDate || tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
        </div>

        {/* 4. Room & Meal */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="room_type" render={({ field }) => (
            <FormItem><FormLabel>Tipo de Quarto</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem><SelectItem value="superior">Superior</SelectItem>
                  <SelectItem value="deluxe">Deluxe</SelectItem><SelectItem value="suite">Suíte</SelectItem>
                  <SelectItem value="suite_junior">Suíte Júnior</SelectItem>
                </SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="meal_plan" render={({ field }) => (
            <FormItem><FormLabel>Regime de Alimentação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sem_refeicao">Sem refeição</SelectItem><SelectItem value="cafe">Café da manhã</SelectItem>
                  <SelectItem value="meia_pensao">Meia pensão</SelectItem><SelectItem value="pensao_completa">Pensão completa</SelectItem>
                  <SelectItem value="all_inclusive">All Inclusive</SelectItem>
                </SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
        </div>

        {/* 5. Description */}
        {showOptionLabel && (
          <FormField control={form.control} name="service_description" render={({ field }) => (
            <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes, diferenciais..." className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        )}

        {/* 6. Price */}
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="adult_price" render={({ field }) => (
            <FormItem><FormLabel>Valor Adulto (opcional)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="child_price" render={({ field }) => (
            <FormItem><FormLabel>Valor Criança (opcional)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        {renderPaymentSlot(paymentSlot, form.watch("price"))}

        {/* 7. Label (optional) */}
        {showOptionLabel && (
          <FormField control={form.control} name="option_label" render={({ field }) => (
            <FormItem><FormLabel>Etiqueta (opcional)</FormLabel><FormControl><Input placeholder="Ex: Hotel mais próximo do parque" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ CAR RENTAL FORM ━━━━━━━━━━━━━━━━━━━ */
const carRentalSchema = z.object({
  rental_company: z.string().optional(),
  pickup_location: z.string().min(2, "Local de retirada é obrigatório"),
  dropoff_location: z.string().min(2, "Local de devolução é obrigatório"),
  pickup_date: z.date({ required_error: "Data de retirada é obrigatória" }),
  pickup_time: z.string().optional(),
  dropoff_date: z.date({ required_error: "Data de devolução é obrigatória" }),
  dropoff_time: z.string().optional(),
  car_type: z.string().min(1, "Tipo de carro é obrigatório"),
  days: z.number().min(1, "Mínimo 1 diária"),
  price: z.number().min(0),
  notes: z.string().optional(),
}).refine((data) => data.dropoff_date >= data.pickup_date, {
  message: "A data de devolução não pode ser anterior à retirada",
  path: ["dropoff_date"],
});

function CarRentalForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const init = initialData?.service_data;
  const [pickupOpen, setPickupOpen] = useState(false);
  const [dropoffOpen, setDropoffOpen] = useState(false);
  const [daysManual, setDaysManual] = useState(false);

  const form = useForm<z.infer<typeof carRentalSchema>>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: {
      rental_company: init?.rental_company || "",
      pickup_location: init?.pickup_location || "",
      dropoff_location: init?.dropoff_location || "",
      pickup_date: init?.pickup_date ? parseLocalDate(init.pickup_date) : tripStartDate || new Date(),
      pickup_time: init?.pickup_time || "10:00",
      dropoff_date: init?.dropoff_date ? parseLocalDate(init.dropoff_date) : tripEndDate || new Date(),
      dropoff_time: init?.dropoff_time || "10:00",
      car_type: init?.car_type || "",
      days: init?.days || 1,
      price: init?.price || initialData?.amount || 0,
      notes: init?.notes || "",
    },
  });

  // Auto-calculate days when dates change
  const pickupDate = form.watch("pickup_date");
  const dropoffDate = form.watch("dropoff_date");

  useEffect(() => {
    if (!daysManual && pickupDate && dropoffDate && dropoffDate >= pickupDate) {
      const diffMs = dropoffDate.getTime() - pickupDate.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      form.setValue("days", diffDays);
    }
  }, [pickupDate, dropoffDate, daysManual, form]);

  // Check if dates are outside trip period
  const outsideTripPeriod = tripStartDate && tripEndDate && pickupDate && dropoffDate
    ? (pickupDate < tripStartDate || dropoffDate > tripEndDate)
    : false;

  const formatLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleSubmit = (values: z.infer<typeof carRentalSchema>) => {
    onSubmit({
      rental_company: values.rental_company || "",
      pickup_location: values.pickup_location,
      dropoff_location: values.dropoff_location,
      pickup_date: formatLocalDateStr(values.pickup_date),
      pickup_time: values.pickup_time || "",
      dropoff_date: formatLocalDateStr(values.dropoff_date),
      dropoff_time: values.dropoff_time || "",
      car_type: values.car_type,
      days: values.days,
      price: values.price,
      notes: values.notes || "",
    }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="rental_company" render={({ field }) => (
          <FormItem><FormLabel>Nome da Locadora</FormLabel><FormControl>
            <PlacesAutocomplete
              value={field.value || ""}
              onChange={field.onChange}
              placeType="car_rental"
              placeholder="Ex: Localiza, Hertz, Movida..."
            />
          </FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Retirada</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="dropoff_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Devolução</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        {/* Date/Time fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormField control={form.control} name="pickup_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Data de Retirada
                </FormLabel>
                <Popover open={pickupOpen} onOpenChange={setPickupOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => {
                        if (d) {
                          field.onChange(d);
                          setDaysManual(false);
                          const currentDropoff = form.getValues("dropoff_date");
                          if (currentDropoff && d > currentDropoff) {
                            form.setValue("dropoff_date", d);
                          }
                        }
                        setPickupOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pickup_time" render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de Retirada</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
          <div className="space-y-2">
            <FormField control={form.control} name="dropoff_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Data de Devolução
                </FormLabel>
                <Popover open={dropoffOpen} onOpenChange={setDropoffOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => { if (d) { field.onChange(d); setDaysManual(false); } setDropoffOpen(false); }}
                      disabled={(d) => pickupDate ? d < pickupDate : false}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="dropoff_time" render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de Devolução</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
        </div>

        {outsideTripPeriod && (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2 flex items-center gap-2">
            ⚠️ As datas selecionadas estão fora do período da viagem ({tripStartDate && format(tripStartDate, "dd/MM", { locale: ptBR })} a {tripEndDate && format(tripEndDate, "dd/MM/yyyy", { locale: ptBR })})
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="car_type" render={({ field }) => (
            <FormItem><FormLabel>Tipo de Carro</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="economico">Econômico</SelectItem><SelectItem value="compacto">Compacto</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem><SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="luxo">Luxo</SelectItem><SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="days" render={({ field }) => (
            <FormItem><FormLabel>Diárias</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={(e) => { field.onChange(parseInt(e.target.value) || 1); setDaysManual(true); }} /></FormControl>
            <p className="text-[10px] text-muted-foreground">Calculado automaticamente pelas datas. Editável se necessário.</p>
            <FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        {renderPaymentSlot(paymentSlot, form.watch("price"))}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ TRANSFER FORM ━━━━━━━━━━━━━━━━━━━ */
const transferSchema = z.object({
  company_name: z.string().optional(),
  transfer_mode: z.enum(["arrival", "departure", "round_trip"]),
  service_category: z.enum(["regular", "private"]).optional(),
  location: z.string().min(2, "Local é obrigatório"),
  arrival_date: z.date({ required_error: "Data de chegada é obrigatória" }),
  departure_date: z.date().optional(),
  price: z.number().min(0),
  description: z.string().optional(),
});

function TransferForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      company_name: init?.company_name || "",
      transfer_mode: init?.transfer_type || "round_trip",
      service_category: init?.service_category || undefined,
      location: init?.location || "",
      price: init?.price || initialData?.amount || 0,
      arrival_date: init?.date ? parseLocalDate(init.date) : tripStartDate,
      departure_date: tripEndDate,
      description: initialData?.description || "",
    },
  });

  const transferMode = form.watch("transfer_mode");
  const price = form.watch("price");
  const isRoundTrip = transferMode === "round_trip";

  const handleSubmit = async (values: z.infer<typeof transferSchema>) => {
    const base = { company_name: values.company_name || "", location: values.location, service_category: values.service_category || null };
    if (values.transfer_mode === "round_trip") {
      await onSubmit(
        { ...base, transfer_type: "arrival" as const, date: format(values.arrival_date, "yyyy-MM-dd"), price: values.price },
        values.price
      );
      if (values.departure_date) {
        await onSubmit(
          { ...base, transfer_type: "departure" as const, date: format(values.departure_date, "yyyy-MM-dd"), price: values.price },
          values.price
        );
      }
    } else {
      const mappedType = values.transfer_mode === "arrival" ? "arrival" : "departure";
      await onSubmit(
        { ...base, transfer_type: mappedType, date: format(values.arrival_date, "yyyy-MM-dd"), price: values.price },
        values.price
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="transfer_mode" render={({ field }) => (
          <FormItem><FormLabel>Tipo de Transfer</FormLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "arrival", label: "Chegada", icon: "✈️ → 🏨", desc: "Aeroporto → Hotel" },
                { value: "departure", label: "Saída", icon: "🏨 → ✈️", desc: "Hotel → Aeroporto" },
                { value: "round_trip", label: "Ida e Volta", icon: "✈️ ↔ 🏨", desc: "Combinado" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-center transition-all hover:bg-muted/50",
                    field.value === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="text-lg mb-1">{opt.icon}</div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="service_category" render={({ field }) => (
          <FormItem>
            <FormLabel>Categoria</FormLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "regular", label: "Regular", desc: "Compartilhado" },
                { value: "private", label: "Privativo", desc: "Exclusivo" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => field.onChange(field.value === opt.value ? undefined : opt.value)}
                  className={cn("rounded-lg border-2 p-2 text-center transition-all hover:bg-muted/50", field.value === opt.value ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Local / Trajeto</FormLabel>
            <FormControl><Input placeholder="Ex: Aeroporto CDG ↔ Hotel Marriott" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className={cn("grid gap-4", isRoundTrip ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
          <FormField control={form.control} name="arrival_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{transferMode === "departure" ? "Data de Saída" : "Data de Chegada"}</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage />
            </FormItem>
          )} />

          {isRoundTrip && (
            <FormField control={form.control} name="departure_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Saída</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripEndDate || tripStartDate)} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover><FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel>{isRoundTrip ? "Valor por trecho (R$)" : "Valor (R$)"}</FormLabel>
            <FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Round trip total summary */}
        {isRoundTrip && price > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Transfer (2 trechos)</span>
              <span className="text-lg font-bold text-primary">{formatCurrencyInline(price * 2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              2 × {formatCurrencyInline(price)}
            </p>
          </div>
        )}

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl><Textarea placeholder="Detalhes adicionais do transfer..." className="min-h-[80px]" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {renderPaymentSlot(paymentSlot, isRoundTrip ? price * 2 : price)}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {initialData ? "Salvar" : isRoundTrip ? "Salvar 2 trechos" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ ATTRACTION FORM ━━━━━━━━━━━━━━━━━━━ */
const attractionSchema = z.object({
  product_name: z.string().min(2, "Nome do produto é obrigatório"),
  ticket_type: z.string().optional(),
  service_description: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  notes: z.string().optional(),
});

function AttractionForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;

  // Retrocompatibilidade: se o dado antigo só tem price/quantity, mapeia para adult_price
  const defaultAdultPrice = init?.adult_price ?? init?.price ?? initialData?.amount ?? 0;
  const defaultChildPrice = init?.child_price ?? 0;

  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: {
      product_name: init?.product_name || init?.name || "",
      ticket_type: init?.ticket_type || "",
      service_description: initialData?.description || "",
      adult_price: defaultAdultPrice,
      child_price: defaultChildPrice,
      date: init?.date ? parseLocalDate(init.date) : tripStartDate,
      notes: init?.notes || "",
    },
  });

  const adultPrice = form.watch("adult_price");
  const childPrice = form.watch("child_price");

  const totalAdults = adultPrice * adultsCount;
  const totalChildren = childPrice * childrenCount;
  const totalAmount = totalAdults + totalChildren;
  const totalQuantity = adultsCount + childrenCount;

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    const computedTotalAdults = values.adult_price * adultsCount;
    const computedTotalChildren = values.child_price * childrenCount;
    const total = computedTotalAdults + computedTotalChildren;
    const displayName = [values.product_name, values.ticket_type].filter(Boolean).join(" | ");

    onSubmit(
      {
        name: displayName,
        product_name: values.product_name,
        ticket_type: values.ticket_type || "",
        date: format(values.date, "yyyy-MM-dd"),
        quantity: totalQuantity,
        adult_price: values.adult_price,
        child_price: values.child_price,
        price: total,
        notes: values.notes || "",
      },
      total,
      undefined,
      values.service_description || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="product_name" render={({ field }) => (
            <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl>
              <PlacesAutocomplete
                value={field.value}
                onChange={field.onChange}
                placeType="attraction"
                placeholder="Universal Orlando, Disney..."
              />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="ticket_type" render={({ field }) => (
            <FormItem><FormLabel>Tipo de Ingresso <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel><FormControl><Input placeholder="2day-2park, Park Hopper..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Data</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl>
              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button></FormControl></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="service_description" render={({ field }) => (
          <FormItem><FormLabel>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel><FormControl><Textarea placeholder="Detalhes, diferenciais, informações complementares..." className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="adult_price" render={({ field }) => (
            <FormItem>
              <FormLabel>Valor por adulto (R$)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} />
              </FormControl>
              {adultsCount > 0 && adultPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  {adultsCount} adulto{adultsCount > 1 ? "s" : ""} × {formatCurrencyInline(adultPrice)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalAdults)}</span>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="child_price" render={({ field }) => (
            <FormItem>
              <FormLabel>Valor por criança (R$)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} />
              </FormControl>
              {childrenCount > 0 && childPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  {childrenCount} criança{childrenCount > 1 ? "s" : ""} × {formatCurrencyInline(childPrice)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalChildren)}</span>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Total breakdown */}
        {(adultPrice > 0 || childPrice > 0) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Ingressos</span>
              <span className="text-lg font-bold text-primary">{formatCurrencyInline(totalAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {adultsCount} adulto{adultsCount > 1 ? "s" : ""}
              {childrenCount > 0 ? ` + ${childrenCount} criança${childrenCount > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel><FormControl><Textarea placeholder="Observações sobre o ingresso..." className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        {renderPaymentSlot(paymentSlot, totalAmount)}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ INSURANCE FORM ━━━━━━━━━━━━━━━━━━━ */
const insuranceSchema = z.object({
  provider: z.string().min(2, "Seguradora é obrigatória"),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  coverage: z.string().min(2, "Cobertura é obrigatória"),
  price: z.number().min(0),
  is_unit_price: z.boolean(),
  notes: z.string().optional(),
});

function InsuranceForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const totalPax = adultsCount + childrenCount;
  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { provider: init?.provider || "", coverage: init?.coverage || "", price: init?.price || initialData?.amount || 0, is_unit_price: init?.is_unit_price !== false, start_date: init?.start_date ? parseLocalDate(init.start_date) : tripStartDate, end_date: init?.end_date ? parseLocalDate(init.end_date) : tripEndDate, notes: init?.notes || "" },
  });

  const isUnitPrice = form.watch("is_unit_price");
  const price = form.watch("price");
  const totalAmount = isUnitPrice ? price * totalPax : price;

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    const computed = values.is_unit_price ? values.price * totalPax : values.price;
    onSubmit({ provider: values.provider, start_date: format(values.start_date, "yyyy-MM-dd"), end_date: format(values.end_date, "yyyy-MM-dd"), coverage: values.coverage, price: values.price, is_unit_price: values.is_unit_price, notes: values.notes || "" }, computed);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="provider" render={({ field }) => (
          <FormItem><FormLabel>Seguradora</FormLabel><FormControl><Input placeholder="Assist Card, Travel Ace..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data Início</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data Fim</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripEndDate || tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="coverage" render={({ field }) => (
          <FormItem><FormLabel>Cobertura</FormLabel><FormControl><Input placeholder="USD 60.000, USD 100.000..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* Pricing mode toggle */}
        <FormField control={form.control} name="is_unit_price" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de valor</FormLabel>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => field.onChange(true)}
                className={cn("rounded-lg border-2 p-2 text-center text-sm font-medium transition-all", field.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                Por pessoa
              </button>
              <button type="button" onClick={() => field.onChange(false)}
                className={cn("rounded-lg border-2 p-2 text-center text-sm font-medium transition-all", !field.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
                Valor único (total)
              </button>
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel>{isUnitPrice ? "Valor por pessoa (R$)" : "Valor total (R$)"}</FormLabel>
            <FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} /></FormControl>
            {isUnitPrice && totalPax > 0 && price > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalPax} passageiro{totalPax > 1 ? "s" : ""} × {formatCurrencyInline(price)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalAmount)}</span>
              </p>
            )}
            <FormMessage />
          </FormItem>
        )} />
        {renderPaymentSlot(paymentSlot, totalAmount)}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ CRUISE FORM ━━━━━━━━━━━━━━━━━━━ */
const cruiseSchema = z.object({
  ship_name: z.string().min(2, "Nome do navio é obrigatório"),
  route: z.string().min(2, "Rota é obrigatória"),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  cabin_type: z.string().min(1, "Tipo de cabine é obrigatório"),
  price: z.number().min(0),
  notes: z.string().optional(),
});

function CruiseForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: { ship_name: init?.ship_name || "", route: init?.route || "", cabin_type: init?.cabin_type || "", price: init?.price || initialData?.amount || 0, start_date: init?.start_date ? parseLocalDate(init.start_date) : tripStartDate, end_date: init?.end_date ? parseLocalDate(init.end_date) : tripEndDate, notes: init?.notes || "" },
  });

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    onSubmit({
      ship_name: values.ship_name, route: values.route,
      start_date: format(values.start_date, "yyyy-MM-dd"), end_date: format(values.end_date, "yyyy-MM-dd"),
      cabin_type: values.cabin_type, price: values.price, notes: values.notes || "",
    }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="ship_name" render={({ field }) => (
          <FormItem><FormLabel>Nome do Navio</FormLabel><FormControl><Input placeholder="MSC Seaview, Costa Diadema..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="route" render={({ field }) => (
          <FormItem><FormLabel>Rota</FormLabel><FormControl><Input placeholder="Santos → Búzios → Ilha Grande → Santos" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data Embarque</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data Desembarque</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripEndDate || tripStartDate)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="cabin_type" render={({ field }) => (
          <FormItem><FormLabel>Tipo de Cabine</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="interna">Interna</SelectItem><SelectItem value="externa">Externa</SelectItem>
                <SelectItem value="varanda">Varanda</SelectItem><SelectItem value="suite">Suíte</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        {renderPaymentSlot(paymentSlot, form.watch("price"))}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ OTHER FORM ━━━━━━━━━━━━━━━━━━━ */
const otherSchema = z.object({
  custom_title: z.string().max(80, "Máximo 80 caracteres").optional(),
  company_name: z.string().optional(),
  description: z.string().min(5, "Descrição é obrigatória"),
  price: z.number().min(0),
});

function OtherForm({ onSubmit, onCancel, isLoading, initialData, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: {
      custom_title: init?.custom_title || "",
      company_name: init?.company_name || "",
      description: init?.description || "",
      price: init?.price || initialData?.amount || 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    onSubmit({
      custom_title: values.custom_title?.trim() || "",
      company_name: values.company_name || "",
      description: values.description,
      price: values.price,
    }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="custom_title" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Título do Bloco <span className="text-muted-foreground font-normal">(opcional)</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Outros Serviços"
                maxLength={80}
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Personalize o nome deste bloco. Ex: "Chip Internacional", "Seguro Viagem", "Ingressos Disney". Se vazio, usaremos "Outros Serviços".
            </p>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="company_name" render={({ field }) => (
          <FormItem><FormLabel>Nome da Empresa</FormLabel><FormControl>
            <PlacesAutocomplete
              value={field.value || ""}
              onChange={field.onChange}
              placeType="general"
              placeholder="Nome da empresa..."
            />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descrição do Serviço</FormLabel><FormControl><Textarea placeholder="Descreva o serviço..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        {renderPaymentSlot(paymentSlot, form.watch("price"))}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ CIRCUIT FORM ━━━━━━━━━━━━━━━━━━━ */
const circuitSchema = z.object({
  circuit_name: z.string().min(2, "Nome do circuito é obrigatório"),
  duration: z.string().optional(),
  itinerary: z.string().min(5, "Roteiro day by day é obrigatório"),
  notes: z.string().optional(),
  price: z.number().min(0),
});

function CircuitForm({ onSubmit, onCancel, isLoading, initialData, paymentSlot }: Omit<ServiceFormProps, "serviceType">) {
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof circuitSchema>>({
    resolver: zodResolver(circuitSchema),
    defaultValues: {
      circuit_name: init?.circuit_name || "",
      duration: init?.duration || "",
      itinerary: init?.itinerary || "",
      notes: init?.notes || "",
      price: init?.price ?? initialData?.amount ?? 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof circuitSchema>) => {
    onSubmit(
      {
        circuit_name: values.circuit_name,
        duration: values.duration || "",
        itinerary: values.itinerary,
        notes: values.notes || "",
        price: values.price,
      },
      values.price,
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="circuit_name" render={({ field }) => (
          <FormItem><FormLabel>Nome do Circuito</FormLabel><FormControl>
            <Input placeholder="Ex: Circuito Itália Clássica" {...field} />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="duration" render={({ field }) => (
          <FormItem><FormLabel>Duração <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl>
            <Input placeholder="Ex: 10 dias / 9 noites" {...field} />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="itinerary" render={({ field }) => (
          <FormItem>
            <FormLabel>Roteiro Day by Day</FormLabel>
            <FormControl>
              <Textarea
                placeholder={"Dia 1 — Chegada em Roma\nDia 2 — City tour pelo Coliseu e Fórum Romano\nDia 3 — Vaticano e Castel Sant'Angelo\n..."}
                rows={12}
                className="font-mono text-sm leading-relaxed"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">Dica: separe cada dia em uma linha (Dia 1, Dia 2…). Quebras de linha são preservadas no orçamento e PDF.</p>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl>
            <Textarea placeholder="Inclusões, exclusões, hotéis previstos, etc." rows={3} {...field} />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor (R$) <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl>
            <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
          </FormControl><FormMessage /></FormItem>
        )} />
        {renderPaymentSlot(paymentSlot, form.watch("price"))}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ IMAGE UPLOAD BLOCK ━━━━━━━━━━━━━━━━━━━ */
import { optimizeImage, validateImageFile, formatFileSize } from "@/utils/imageOptimizer";

const MAX_IMAGES_PER_SERVICE = 5;

function ServiceImageUpload({ imageUrls, onImageUrlsChange, isUploading, placeId, hotelMode }: { imageUrls: string[]; onImageUrlsChange: (urls: string[]) => void; isUploading: boolean; placeId?: string | null; hotelMode?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [compressionInfo, setCompressionInfo] = useState<string>("");

  const canAddMore = imageUrls.length < MAX_IMAGES_PER_SERVICE;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadStatus(validationError);
      setTimeout(() => setUploadStatus(""), 4000);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (!canAddMore) {
      setUploadStatus(`Máximo de ${MAX_IMAGES_PER_SERVICE} fotos por serviço.`);
      setTimeout(() => setUploadStatus(""), 3000);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadStatus("Otimizando imagem…");

    try {
      const result = await optimizeImage(file);
      const reduction = Math.round((1 - result.optimizedSize / result.originalSize) * 100);
      setCompressionInfo(`${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)} (−${reduction}%)`);

      setUploadStatus("Enviando…");

      // Upload full version
      const fullPath = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("quote-images").upload(fullPath, result.full, {
        upsert: true,
        contentType: "image/webp",
      });

      if (error) {
        setUploadStatus("Erro ao enviar. Tente novamente.");
        setTimeout(() => setUploadStatus(""), 3000);
        setUploading(false);
        return;
      }

      // Upload thumbnail
      const thumbPath = `thumb_${fullPath}`;
      await supabase.storage.from("quote-images").upload(thumbPath, result.thumb, {
        upsert: true,
        contentType: "image/webp",
      });

      const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(fullPath);
      onImageUrlsChange([...imageUrls, urlData.publicUrl]);
      setUploadStatus("Upload concluído ✓");
      setTimeout(() => { setUploadStatus(""); setCompressionInfo(""); }, 3000);
    } catch {
      setUploadStatus("Erro ao processar imagem.");
      setTimeout(() => setUploadStatus(""), 3000);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onImageUrlsChange(imageUrls.filter((_, i) => i !== index));
  };

  const handleGooglePhotosSelected = (urls: string[]) => {
    const remaining = MAX_IMAGES_PER_SERVICE - imageUrls.length;
    onImageUrlsChange([...imageUrls, ...urls.slice(0, remaining)]);
  };

  const statusColor = uploadStatus.includes("Erro") || uploadStatus.includes("Máximo") || uploadStatus.includes("Formato")
    ? "text-destructive"
    : uploadStatus.includes("✓")
      ? "text-green-600 dark:text-green-400"
      : "text-muted-foreground";

  const imageGrid = imageUrls.length > 0 && (
    <>
      {!hotelMode && <p className="text-sm font-medium">Fotos selecionadas ({imageUrls.length}/{MAX_IMAGES_PER_SERVICE})</p>}
      {hotelMode && <p className="text-sm font-medium">Fotos selecionadas</p>}
      <div className="flex flex-wrap gap-2">
        {imageUrls.map((url, i) => (
          <div key={i} className="relative inline-block group">
            <img
              src={url}
              alt={`Serviço ${i + 1}`}
              className="h-24 w-32 rounded-lg border border-border object-cover transition-opacity"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </>
  );

  const statusLine = (uploadStatus || compressionInfo) && (
    <div className="flex flex-col gap-0.5">
      {uploadStatus && <p className={`text-xs ${statusColor} animate-in fade-in`}>{uploadStatus}</p>}
      {compressionInfo && <p className="text-xs text-muted-foreground">{compressionInfo}</p>}
    </div>
  );

  // Hotel mode
  if (hotelMode) {
    return (
      <div className="space-y-2">
        {imageGrid}
        <div className="flex items-center gap-2">
          {placeId && (
            <div className="flex-1">
              <GoogleHotelPhotos
                placeId={placeId}
                onPhotosSelected={handleGooglePhotosSelected}
                existingUrls={imageUrls}
                autoShow
              />
            </div>
          )}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
              title="Enviar foto própria"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {uploading ? "Otimizando..." : "Upload"}
            </button>
          )}
        </div>
        {statusLine}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
        {!placeId && imageUrls.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Selecione um hotel acima para carregar fotos automaticamente</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fotos do serviço <span className="text-muted-foreground font-normal">(opcional — máx. {MAX_IMAGES_PER_SERVICE})</span></p>
      <div className="flex flex-wrap gap-2">
        {imageUrls.map((url, i) => (
          <div key={i} className="relative inline-block">
            <img
              src={url}
              alt={`Serviço ${i + 1}`}
              className="h-24 w-32 rounded-lg border border-border object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors h-24 w-32"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            <span className="text-xs">{uploading ? "Otimizando..." : "Adicionar"}</span>
          </button>
        )}
      </div>
      {statusLine}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      {placeId && (
        <GoogleHotelPhotos
          placeId={placeId}
          onPhotosSelected={handleGooglePhotosSelected}
          existingUrls={imageUrls}
        />
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ MAIN ROUTER ━━━━━━━━━━━━━━━━━━━ */
export function ServiceForm({ serviceType, onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, adultsCount, childrenCount, initialData, paymentSlot }: ServiceFormProps) {
  const initUrls: string[] = initialData?.image_urls?.length ? initialData.image_urls : (initialData?.image_url ? [initialData.image_url] : []);
  const [serviceImageUrls, setServiceImageUrls] = useState<string[]>(initUrls);
  const [isImgUploading, setIsImgUploading] = useState(false);
  const [hotelPlaceId, setHotelPlaceId] = useState<string | null>(null);
  const [transferCompanyName, setTransferCompanyName] = useState(
    initialData?.service_data?.company_name || ""
  );
  const hasMultipleOptions = serviceType === 'flight' || serviceType === 'hotel';

  const wrappedSubmit = (data: any, amount: number, optionLabel?: string, description?: string) => {
    const finalData = serviceType === 'transfer' ? { ...data, company_name: transferCompanyName } : data;
    onSubmit(finalData, amount, optionLabel, description, serviceImageUrls.length > 0 ? serviceImageUrls[0] : undefined, serviceImageUrls);
  };

  const isHotel = serviceType === 'hotel';
  const photoSlotElement = (
    <ServiceImageUpload
      imageUrls={serviceImageUrls}
      onImageUrlsChange={setServiceImageUrls}
      isUploading={isImgUploading}
      placeId={isHotel ? hotelPlaceId : undefined}
      hotelMode={isHotel}
    />
  );
  const formProps = {
    onSubmit: wrappedSubmit, onCancel, isLoading: isLoading || isImgUploading, showOptionLabel: hasMultipleOptions,
    tripStartDate, tripEndDate, adultsCount, childrenCount, initialData, paymentSlot, photoSlot: photoSlotElement,
    ...(serviceType === 'hotel' ? { onPlaceIdChange: setHotelPlaceId } : {}),
  };

  let formElement: React.ReactNode = null;
  switch (serviceType) {
    case "flight": formElement = <FlightForm {...formProps} />; break;
    case "hotel": formElement = <HotelForm {...formProps} />; break;
    case "car_rental": formElement = <CarRentalForm {...formProps} />; break;
    case "transfer": formElement = <TransferForm {...formProps} />; break;
    case "attraction": formElement = <AttractionForm {...formProps} />; break;
    case "insurance": formElement = <InsuranceForm {...formProps} />; break;
    case "cruise": formElement = <CruiseForm {...formProps} />; break;
    case "circuit": formElement = <CircuitForm {...formProps} />; break;
    case "other": formElement = <OtherForm {...formProps} />; break;
    default: return null;
  }

  return (
    <div className="space-y-4">
      {serviceType === 'transfer' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome da Empresa</label>
          <Input placeholder="Ex: Wemoov, TourTransfer..." value={transferCompanyName} onChange={(e) => setTransferCompanyName(e.target.value)} />
        </div>
      )}
      {!(serviceType === 'flight' || serviceType === 'hotel') && photoSlotElement}
      {formElement}
    </div>
  );
}
