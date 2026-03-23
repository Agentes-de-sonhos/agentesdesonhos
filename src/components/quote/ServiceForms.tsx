import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, ImageIcon, X, Loader2, Pencil, ChevronDown, Plane } from "lucide-react";
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
  airport_origin: z.string().optional(),
  airport_destination: z.string().optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  flight_number: z.string().optional(),
});

const flightSchema = z.object({
  option_label: z.string().optional(),
  service_description: z.string().optional(),
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  airline: z.string().min(2, "Companhia aérea é obrigatória"),
  departure_date: z.date({ required_error: "Data de ida é obrigatória" }),
  return_date: z.date({ required_error: "Data de volta é obrigatória" }),
  includes_baggage: z.boolean(),
  includes_boarding_fee: z.boolean(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  is_unit_price: z.boolean(),
  notes: z.string().optional(),
  outbound_detail: flightLegSchema.optional(),
  return_detail: flightLegSchema.optional(),
});

function FlightForm({ onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0 }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const [showFlightDetails, setShowFlightDetails] = useState(
    !!(init?.outbound_detail || init?.return_detail)
  );
  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      option_label: initialData?.option_label || "", service_description: initialData?.description || "",
      origin_city: init?.origin_city || "", destination_city: init?.destination_city || "",
      airline: init?.airline || "",
      includes_baggage: init?.includes_baggage ?? true, includes_boarding_fee: init?.includes_boarding_fee ?? true,
      adult_price: init?.adult_price || 0, child_price: init?.child_price || 0,
      is_unit_price: true,
      notes: init?.notes || "",
      departure_date: init?.departure_date ? parseLocalDate(init.departure_date) : tripStartDate,
      return_date: init?.return_date ? parseLocalDate(init.return_date) : tripEndDate,
      outbound_detail: init?.outbound_detail || { airport_origin: "", airport_destination: "", departure_time: "", arrival_time: "", flight_number: "" },
      return_detail: init?.return_detail || { airport_origin: "", airport_destination: "", departure_time: "", arrival_time: "", flight_number: "" },
    },
  });

  const isUnitPrice = true;
  const adultPrice = form.watch("adult_price");
  const childPrice = form.watch("child_price");

  const totalAdults = adultPrice * adultsCount;
  const totalChildren = childPrice * childrenCount;
  const totalAmount = totalAdults + totalChildren;

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    const computedTotalAdults = values.adult_price * adultsCount;
    const computedTotalChildren = values.child_price * childrenCount;
    
    const hasOutbound = showFlightDetails && values.outbound_detail && Object.values(values.outbound_detail).some(v => v && v.length > 0);
    const hasReturn = showFlightDetails && values.return_detail && Object.values(values.return_detail).some(v => v && v.length > 0);
    
    const data = {
      origin_city: values.origin_city, destination_city: values.destination_city,
      airline: values.airline, departure_date: format(values.departure_date, "yyyy-MM-dd"),
      return_date: format(values.return_date, "yyyy-MM-dd"),
      includes_baggage: values.includes_baggage, includes_boarding_fee: values.includes_boarding_fee,
      adult_price: values.adult_price, child_price: values.child_price,
      is_unit_price: true,
      notes: values.notes || "",
      ...(hasOutbound ? { outbound_detail: values.outbound_detail } : {}),
      ...(hasReturn ? { return_detail: values.return_detail } : {}),
    };
    onSubmit(data, computedTotalAdults + computedTotalChildren, values.option_label || undefined, values.service_description || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {showOptionLabel && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="option_label" render={({ field }) => (
              <FormItem><FormLabel>Nome da Opção (opcional)</FormLabel><FormControl><Input placeholder="Ex: Melhor custo-benefício" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="service_description" render={({ field }) => (
              <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><Input placeholder="Detalhes, diferenciais..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade de Origem</FormLabel><FormControl><Input placeholder="São Paulo" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade de Destino</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="airline" render={({ field }) => (
          <FormItem><FormLabel>Companhia Aérea</FormLabel><FormControl><Input placeholder="LATAM, GOL, Air France..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormField control={form.control} name="return_date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Data de Volta</FormLabel>
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
        <div className="flex gap-6">
          <FormField control={form.control} name="includes_baggage" render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Inclui bagagem</FormLabel></FormItem>
          )} />
          <FormField control={form.control} name="includes_boarding_fee" render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Inclui taxa de embarque</FormLabel></FormItem>
          )} />
        </div>

        {/* Flight Details - Expandable */}
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
            <div className="px-4 pb-4 space-y-4 border-t border-border/40">
              {/* Outbound Leg */}
              <div className="pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">✈ Ida</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField control={form.control} name="outbound_detail.airport_origin" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aeroporto de origem</FormLabel><FormControl><Input placeholder="GRU" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="outbound_detail.airport_destination" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aeroporto de destino</FormLabel><FormControl><Input placeholder="CDG" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 mt-2">
                  <FormField control={form.control} name="outbound_detail.departure_time" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Horário de saída</FormLabel><FormControl><Input type="time" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="outbound_detail.arrival_time" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Horário de chegada</FormLabel><FormControl><Input type="time" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="outbound_detail.flight_number" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Nº do voo</FormLabel><FormControl><Input placeholder="LA8084" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                </div>
              </div>

              {/* Return Leg */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">✈ Volta</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField control={form.control} name="return_detail.airport_origin" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aeroporto de origem</FormLabel><FormControl><Input placeholder="CDG" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="return_detail.airport_destination" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Aeroporto de destino</FormLabel><FormControl><Input placeholder="GRU" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 mt-2">
                  <FormField control={form.control} name="return_detail.departure_time" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Horário de saída</FormLabel><FormControl><Input type="time" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="return_detail.arrival_time" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Horário de chegada</FormLabel><FormControl><Input type="time" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="return_detail.flight_number" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Nº do voo</FormLabel><FormControl><Input placeholder="LA8085" {...field} className="h-8 text-sm" /></FormControl></FormItem>
                  )} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing is always per-person — multiplication is automatic */}

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

        {/* Total breakdown */}
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

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
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
  notes: z.string().optional(),
});

function HotelForm({ onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, initialData }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      option_label: initialData?.option_label || "", service_description: initialData?.description || "",
      hotel_name: init?.hotel_name || "", city: init?.city || "",
      room_type: init?.room_type || "", meal_plan: init?.meal_plan || "", price: init?.price || initialData?.amount || 0, notes: init?.notes || "",
      check_in: init?.check_in ? parseLocalDate(init.check_in) : tripStartDate,
      check_out: init?.check_out ? parseLocalDate(init.check_out) : tripEndDate,
    },
  });

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    const data = {
      hotel_name: values.hotel_name, city: values.city,
      check_in: format(values.check_in, "yyyy-MM-dd"), check_out: format(values.check_out, "yyyy-MM-dd"),
      room_type: values.room_type, meal_plan: values.meal_plan, price: values.price, notes: values.notes || "",
    };
    onSubmit(data, values.price, values.option_label || undefined, values.service_description || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {showOptionLabel && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="option_label" render={({ field }) => (
              <FormItem><FormLabel>Nome da Opção (opcional)</FormLabel><FormControl><Input placeholder="Ex: Hotel mais próximo do parque" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="service_description" render={({ field }) => (
              <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><Input placeholder="Detalhes, diferenciais..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_name" render={({ field }) => (
            <FormItem><FormLabel>Nome do Hotel</FormLabel><FormControl><Input placeholder="Hotel Marriott" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
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
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ CAR RENTAL FORM ━━━━━━━━━━━━━━━━━━━ */
const carRentalSchema = z.object({
  pickup_location: z.string().min(2, "Local de retirada é obrigatório"),
  dropoff_location: z.string().min(2, "Local de devolução é obrigatório"),
  car_type: z.string().min(1, "Tipo de carro é obrigatório"),
  days: z.number().min(1, "Mínimo 1 diária"),
  price: z.number().min(0),
  notes: z.string().optional(),
});

function CarRentalForm({ onSubmit, onCancel, isLoading, initialData }: Omit<ServiceFormProps, "serviceType">) {
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof carRentalSchema>>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: { pickup_location: init?.pickup_location || "", dropoff_location: init?.dropoff_location || "", car_type: init?.car_type || "", days: init?.days || 1, price: init?.price || initialData?.amount || 0, notes: init?.notes || "" },
  });

  const handleSubmit = (values: z.infer<typeof carRentalSchema>) => {
    onSubmit({ pickup_location: values.pickup_location, dropoff_location: values.dropoff_location, car_type: values.car_type, days: values.days, price: values.price, notes: values.notes || "" }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Retirada</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="dropoff_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Devolução</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
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
            <FormItem><FormLabel>Diárias</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ TRANSFER FORM ━━━━━━━━━━━━━━━━━━━ */
const transferSchema = z.object({
  transfer_mode: z.enum(["arrival", "departure", "round_trip"]),
  location: z.string().min(2, "Local é obrigatório"),
  arrival_date: z.date({ required_error: "Data de chegada é obrigatória" }),
  departure_date: z.date().optional(),
  price: z.number().min(0),
});

function TransferForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transfer_mode: init?.transfer_type || "round_trip",
      location: init?.location || "",
      price: init?.price || initialData?.amount || 0,
      arrival_date: init?.date ? parseLocalDate(init.date) : tripStartDate,
      departure_date: tripEndDate,
    },
  });

  const transferMode = form.watch("transfer_mode");
  const price = form.watch("price");
  const isRoundTrip = transferMode === "round_trip";

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    if (values.transfer_mode === "round_trip") {
      // Submit arrival
      onSubmit(
        { transfer_type: "arrival" as const, location: values.location, date: format(values.arrival_date, "yyyy-MM-dd"), price: values.price },
        values.price
      );
      // Submit departure as second service — uses a special flag
      if (values.departure_date) {
        onSubmit(
          { transfer_type: "departure" as const, location: values.location, date: format(values.departure_date, "yyyy-MM-dd"), price: values.price },
          values.price
        );
      }
    } else {
      const mappedType = values.transfer_mode === "arrival" ? "arrival" : "departure";
      onSubmit(
        { transfer_type: mappedType, location: values.location, date: format(values.arrival_date, "yyyy-MM-dd"), price: values.price },
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

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {initialData ? "Salvar" : isRoundTrip ? "Adicionar 2 trechos" : "Adicionar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ ATTRACTION FORM ━━━━━━━━━━━━━━━━━━━ */
const attractionSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  date: z.date({ required_error: "Data é obrigatória" }),
  quantity: z.number().min(1, "Mínimo 1 ingresso"),
  price: z.number().min(0),
});

function AttractionForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0 }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const totalPax = adultsCount + childrenCount;
  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: { name: init?.name || "", quantity: init?.quantity || totalPax, price: init?.price || initialData?.amount || 0, date: init?.date ? parseLocalDate(init.date) : tripStartDate },
  });

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    onSubmit({ name: values.name, date: format(values.date, "yyyy-MM-dd"), quantity: values.quantity, price: values.price }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nome da Atração/Ingresso</FormLabel><FormControl><Input placeholder="Torre Eiffel, Museu do Louvre..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
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
});

function InsuranceForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0 }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const totalPax = adultsCount + childrenCount;
  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { provider: init?.provider || "", coverage: init?.coverage || "", price: init?.price || initialData?.amount || 0, is_unit_price: true, start_date: init?.start_date ? parseLocalDate(init.start_date) : tripStartDate, end_date: init?.end_date ? parseLocalDate(init.end_date) : tripEndDate },
  });

  const isUnitPrice = true;
  const price = form.watch("price");
  const totalAmount = price * totalPax;

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    const computed = values.price * totalPax;
    onSubmit({ provider: values.provider, start_date: format(values.start_date, "yyyy-MM-dd"), end_date: format(values.end_date, "yyyy-MM-dd"), coverage: values.coverage, price: values.price, is_unit_price: true }, computed);
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

        {/* Pricing is always per-person — multiplication is automatic */}

        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel>Valor por pessoa (R$)</FormLabel>
            <FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} /></FormControl>
            {isUnitPrice && totalPax > 0 && price > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalPax} passageiro{totalPax > 1 ? "s" : ""} × {formatCurrencyInline(price)} = <span className="font-medium text-foreground">{formatCurrencyInline(totalAmount)}</span>
              </p>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
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
});

function CruiseForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: { ship_name: init?.ship_name || "", route: init?.route || "", cabin_type: init?.cabin_type || "", price: init?.price || initialData?.amount || 0, start_date: init?.start_date ? parseLocalDate(init.start_date) : tripStartDate, end_date: init?.end_date ? parseLocalDate(init.end_date) : tripEndDate },
  });

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    onSubmit({
      ship_name: values.ship_name, route: values.route,
      start_date: format(values.start_date, "yyyy-MM-dd"), end_date: format(values.end_date, "yyyy-MM-dd"),
      cabin_type: values.cabin_type, price: values.price,
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
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ OTHER FORM ━━━━━━━━━━━━━━━━━━━ */
const otherSchema = z.object({
  description: z.string().min(5, "Descrição é obrigatória"),
  price: z.number().min(0),
});

function OtherForm({ onSubmit, onCancel, isLoading, initialData }: Omit<ServiceFormProps, "serviceType">) {
  const init = initialData?.service_data;
  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: { description: init?.description || "", price: init?.price || initialData?.amount || 0 },
  });

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    onSubmit({ description: values.description, price: values.price }, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descrição do Serviço</FormLabel><FormControl><Textarea placeholder="Descreva o serviço..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{initialData ? "Salvar" : "Adicionar"}</Button>
        </div>
      </form>
    </Form>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ IMAGE UPLOAD BLOCK ━━━━━━━━━━━━━━━━━━━ */
function ServiceImageUpload({ imageUrls, onImageUrlsChange, isUploading }: { imageUrls: string[]; onImageUrlsChange: (urls: string[]) => void; isUploading: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowed.includes(ext)) return;
    const path = `${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from("quote-images").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("quote-images").getPublicUrl(path);
    onImageUrlsChange([...imageUrls, urlData.publicUrl]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onImageUrlsChange(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fotos do serviço (opcional)</p>
      <div className="flex flex-wrap gap-2">
        {imageUrls.map((url, i) => (
          <div key={i} className="relative inline-block">
            <img src={url} alt={`Serviço ${i + 1}`} className="h-24 w-36 rounded-lg border border-border object-cover" />
            <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors h-24"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {uploading ? "Enviando..." : "Adicionar foto"}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━ MAIN ROUTER ━━━━━━━━━━━━━━━━━━━ */
export function ServiceForm({ serviceType, onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, adultsCount, childrenCount, initialData }: ServiceFormProps) {
  const initUrls: string[] = initialData?.image_urls?.length ? initialData.image_urls : (initialData?.image_url ? [initialData.image_url] : []);
  const [serviceImageUrls, setServiceImageUrls] = useState<string[]>(initUrls);
  const [isImgUploading, setIsImgUploading] = useState(false);
  const hasMultipleOptions = serviceType === 'flight' || serviceType === 'hotel';

  const wrappedSubmit = (data: any, amount: number, optionLabel?: string, description?: string) => {
    onSubmit(data, amount, optionLabel, description, serviceImageUrls.length > 0 ? serviceImageUrls[0] : undefined, serviceImageUrls);
  };

  const formProps = { onSubmit: wrappedSubmit, onCancel, isLoading: isLoading || isImgUploading, showOptionLabel: hasMultipleOptions, tripStartDate, tripEndDate, adultsCount, childrenCount, initialData };

  let formElement: React.ReactNode = null;
  switch (serviceType) {
    case "flight": formElement = <FlightForm {...formProps} />; break;
    case "hotel": formElement = <HotelForm {...formProps} />; break;
    case "car_rental": formElement = <CarRentalForm {...formProps} />; break;
    case "transfer": formElement = <TransferForm {...formProps} />; break;
    case "attraction": formElement = <AttractionForm {...formProps} />; break;
    case "insurance": formElement = <InsuranceForm {...formProps} />; break;
    case "cruise": formElement = <CruiseForm {...formProps} />; break;
    case "other": formElement = <OtherForm {...formProps} />; break;
    default: return null;
  }

  return (
    <div className="space-y-4">
      <ServiceImageUpload imageUrls={serviceImageUrls} onImageUrlsChange={setServiceImageUrls} isUploading={isImgUploading} />
      {formElement}
    </div>
  );
}
