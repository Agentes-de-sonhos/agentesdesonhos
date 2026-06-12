import React, { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, ImageIcon, X, Loader2, Pencil, ChevronDown, Plane, Trash2, Hotel, MapPin, CheckCircle2, DollarSign, Settings2, Car } from "lucide-react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { Badge } from "@/components/ui/badge";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextareaWithTemplate } from "@/components/notes/TextareaWithTemplate";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  ServiceType, FlightData, HotelData, CarRentalData, TransferData,
  AttractionData, InsuranceData, CruiseData, OtherServiceData,
  RailTransportData, RailTransportType, RailTransportClass,
} from "@/types/quote";
import { RAIL_TYPE_LABELS, RAIL_CLASS_LABELS } from "@/types/quote";
import { FlightWizard, FlightModeChooser, type WizardFlightDraft } from "./flight-wizard/FlightWizard";
import { AirfareSmartImport } from "./flight-wizard/AirfareSmartImport";
import { HotelSmartImport } from "./hotel-import/HotelSmartImport";
import { CarRentalSmartImport } from "./car-rental-import/CarRentalSmartImport";
import { Sparkles, Ticket, Shield, Ship, Map as MapIcon, Package, TramFront } from "lucide-react";
import { GenericServiceSmartImport, type GenericServiceKey } from "./service-import/GenericServiceSmartImport";
import { SERVICE_IMPORT_CONFIGS } from "./service-import/serviceImportConfigs";
import { SEGMENT_TYPE_OPTIONS, classifySegments, classifyReturnSegments, splitFlightLegs } from "@/lib/flightSegments";
import type { SegmentType } from "@/types/quote";
import { useAirports } from "@/hooks/useAirports";

/** Parse "YYYY-MM-DD" as a local date to avoid UTC-shift bug (-1 day).
 * Returns undefined for empty/invalid input (e.g. "25 Set" from AI import
 * when the year is not visible in the document) so downstream date-fns
 * `format()` calls don't throw RangeError: Invalid time value. */
function parseLocalDate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr || typeof dateStr !== "string") return undefined;
  const datePart = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return undefined;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (isNaN(dt.getTime()) || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return undefined;
  }
  return dt;
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
  // Extended fields from AI import (passthrough — not rendered but preserved)
  airline: z.string().optional(),
  origin_city: z.string().optional(),
  destination_city: z.string().optional(),
  duration: z.string().optional(),
  stops: z.number().optional(),
  equipment: z.string().optional(),
  cabin: z.string().optional(),
  fare_basis: z.string().optional(),
  baggage_text: z.string().optional(),
  baggage_carry_on: z.boolean().nullable().optional(),
  baggage_hand: z.boolean().nullable().optional(),
  baggage_checked: z.boolean().nullable().optional(),
  baggage_checked_count: z.number().nullable().optional(),
  alert: z.string().optional(),
  segment_type: z.string().optional(),
}).passthrough();

const emptyLeg = (): z.infer<typeof flightLegSchema> => ({ leg_date: "", airport_origin: "", airport_destination: "", departure_time: "", arrival_time: "", flight_number: "" });

/** Normalize old single-leg data to multi-leg arrays */
function normalizeLegs(init: any): {
  outbound: z.infer<typeof flightLegSchema>[];
  internal: z.infer<typeof flightLegSchema>[];
  return_: z.infer<typeof flightLegSchema>[];
} {
  const split = splitFlightLegs(init) as unknown as {
    outbound: z.infer<typeof flightLegSchema>[];
    internal: z.infer<typeof flightLegSchema>[];
    return_: z.infer<typeof flightLegSchema>[];
  };
  let { outbound, internal, return_ } = split;
  if (!outbound.length) outbound = [emptyLeg()];
  if (!return_.length) return_ = [emptyLeg()];
  // internal stays empty by default — section only appears when user adds a leg
  return { outbound, internal, return_ };
}

const flightSchema = z.object({
  option_label: z.string().optional(),
  service_description: z.string().optional(),
  origin_city: z.string().optional(),
  destination_city: z.string().optional(),
  airline: z.string().optional(),
  departure_date: z.date().optional().nullable(),
  return_date: z.date().optional().nullable(),
  is_one_way: z.boolean(),
  includes_baggage: z.boolean(),
  includes_boarding_fee: z.boolean(),
  fees_amount: z.number().min(0).optional(),
  charge_fees_first_installment: z.boolean().optional(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  is_unit_price: z.boolean(),
  notes: z.string().optional(),
  outbound_legs: z.array(flightLegSchema),
  return_legs: z.array(flightLegSchema),
  internal_legs: z.array(flightLegSchema),
});

function FlightLegFields({ legs, onChange, label, direction, defaultSegmentType }: { legs: z.infer<typeof flightLegSchema>[]; onChange: (legs: z.infer<typeof flightLegSchema>[]) => void; label: string; direction: "outbound" | "return" | "internal"; defaultSegmentType?: SegmentType }) {
  const { getAirport } = useAirports();
  const airportHint = (code?: string, fallbackCity?: string) => {
    const c = (code || "").toUpperCase().trim();
    if (c.length !== 3) return "";
    const info = getAirport(c);
    if (info) return `${c} • ${info.city} • ${info.name}`;
    if (fallbackCity) return `${c} • ${fallbackCity}`;
    return "";
  };
  const updateLeg = (idx: number, field: string, value: any) => {
    const updated = legs.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    onChange(updated);
  };
  const addLeg = () => {
    const leg = emptyLeg();
    if (defaultSegmentType) (leg as any).segment_type = defaultSegmentType;
    onChange([...legs, leg]);
  };
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
              {airportHint(leg.airport_origin, leg.origin_city) && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate" title={airportHint(leg.airport_origin, leg.origin_city)}>
                  {airportHint(leg.airport_origin, leg.origin_city)}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aeroporto de destino</label>
              <Input placeholder="CDG" value={leg.airport_destination || ""} onChange={e => updateLeg(idx, "airport_destination", e.target.value)} className="h-8 text-sm mt-1" />
              {airportHint(leg.airport_destination, leg.destination_city) && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate" title={airportHint(leg.airport_destination, leg.destination_city)}>
                  {airportHint(leg.airport_destination, leg.destination_city)}
                </p>
              )}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Companhia</label>
              <Input placeholder="LATAM" value={leg.airline || ""} onChange={e => updateLeg(idx, "airline", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duração</label>
              <Input placeholder="11:25" value={leg.duration || ""} onChange={e => updateLeg(idx, "duration", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Paradas</label>
              <Input type="number" min={0} placeholder="0" value={leg.stops ?? ""} onChange={e => updateLeg(idx, "stops", e.target.value === "" ? undefined : Number(e.target.value))} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Equipamento</label>
              <Input placeholder="77W / 320" value={leg.equipment || ""} onChange={e => updateLeg(idx, "equipment", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cabine</label>
              <Input placeholder="Econômica / Executiva" value={leg.cabin || ""} onChange={e => updateLeg(idx, "cabin", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Base tarifária</label>
              <Input placeholder="YBXOBR" value={leg.fare_basis || ""} onChange={e => updateLeg(idx, "fare_basis", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-1">
            <div>
              <label className="text-xs text-muted-foreground">Bagagem</label>
              <Input placeholder="1 bagagem de mão + 1 despachada de 23kg" value={leg.baggage_text || ""} onChange={e => updateLeg(idx, "baggage_text", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Alerta / Observação do trecho</label>
            <Input placeholder="Conexão longa, troca de aeroporto…" value={leg.alert || ""} onChange={e => updateLeg(idx, "alert", e.target.value)} className="h-8 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo do trecho</label>
            <select
              value={(leg.segment_type as string) || ""}
              onChange={e => updateLeg(idx, "segment_type", e.target.value || undefined)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Não classificado</option>
              {SEGMENT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addLeg} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Adicionar trecho
      </Button>
      {legs.length > 1 && direction !== "internal" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs ml-2"
          onClick={() => {
            const types = direction === "return" ? classifyReturnSegments(legs as any) : classifySegments(legs as any);
            onChange(legs.map((l, i) => ({ ...l, segment_type: types[i] || (l.segment_type as SegmentType) })));
          }}
        >
          Classificar trechos automaticamente
        </Button>
      )}
    </div>
  );
}

function FlightForm({ onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0, paymentSlot, photoSlot }: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init = initialData?.service_data;
  const normalizedLegs = normalizeLegs(init);
  const hasImportedLegs =
    (init?.outbound_legs?.length ?? 0) > 0 || (init?.return_legs?.length ?? 0) > 0 || (init?.internal_legs?.length ?? 0) > 0;
  const [showFlightDetails, setShowFlightDetails] = useState(hasImportedLegs);
  const [showPricing, setShowPricing] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [outboundLegs, setOutboundLegs] = useState(normalizedLegs.outbound);
  const [returnLegs, setReturnLegs] = useState(normalizedLegs.return_);
  const [internalLegs, setInternalLegs] = useState(normalizedLegs.internal);

  const isOneWayInit = init?.return_date ? false : !tripEndDate || (init && !init.return_date);
  const [isOneWay, setIsOneWay] = useState(init?.is_one_way ?? isOneWayInit ?? false);

  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      option_label: initialData?.option_label || "", service_description: initialData?.description || "",
      origin_city: init?.origin_city || "", destination_city: init?.destination_city || "",
      airline: init?.airline || "",
      includes_baggage: init?.includes_baggage ?? true, includes_boarding_fee: init?.includes_boarding_fee ?? true,
      fees_amount: (init as any)?.fees_amount ?? 0,
      charge_fees_first_installment: (init as any)?.charge_fees_first_installment ?? false,
      adult_price: init?.adult_price || 0, child_price: init?.child_price || 0,
      is_unit_price: true,
      is_one_way: init?.is_one_way ?? isOneWayInit ?? false,
      notes: init?.notes || "",
      departure_date: init?.departure_date ? parseLocalDate(init.departure_date) : tripStartDate,
      return_date: init?.return_date ? parseLocalDate(init.return_date) : (isOneWayInit ? undefined : tripEndDate),
      outbound_legs: normalizedLegs.outbound,
      return_legs: normalizedLegs.return_,
      internal_legs: normalizedLegs.internal,
    },
  });

  const isUnitPrice = true;
  const adultPrice = form.watch("adult_price");
  const childPrice = form.watch("child_price");

  const totalAdults = adultPrice * adultsCount;
  const totalChildren = childPrice * childrenCount;
  const totalAmount = totalAdults + totalChildren;

  const hasNonEmptyLegs = (legs: z.infer<typeof flightLegSchema>[]) =>
    legs.some(l => Object.entries(l).some(([key, v]) => key !== "segment_type" && v && String(v).length > 0));

  const prepareLegsForSave = () => {
    const outbound = hasNonEmptyLegs(outboundLegs) ? outboundLegs : [];
    const internal = hasNonEmptyLegs(internalLegs) ? internalLegs : [];
    const return_ = !isOneWay && hasNonEmptyLegs(returnLegs) ? returnLegs : [];
    // Internal legs are always classified as "internal" (don't reclassify).
    const internalStamped = internal.map((l) => ({ ...l, segment_type: l.segment_type || ("internal" as SegmentType) }));
    const all = [...outbound, ...return_];
    const hasManualTypes = all.some((leg) => !!leg.segment_type);
    if (hasManualTypes) return { outbound, internal: internalStamped, return_ };
    const classified = classifySegments(all as any);
    const stamped = all.map((leg, i) => ({ ...leg, segment_type: classified[i] || leg.segment_type }));
    return { outbound: stamped.slice(0, outbound.length), internal: internalStamped, return_: stamped.slice(outbound.length) };
  };

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    const computedTotalAdults = values.adult_price * adultsCount;
    const computedTotalChildren = values.child_price * childrenCount;

    // Always persist legs that have data, regardless of whether the panel is expanded.
    // This guarantees imported segments survive save → reopen even if the user collapsed the section.
    const preparedLegs = prepareLegsForSave();
    const hasOutbound = preparedLegs.outbound.length > 0;
    const hasReturn = preparedLegs.return_.length > 0;
    const hasInternal = preparedLegs.internal.length > 0;

    // Fallback: derive top-level dates from leg dates when the date pickers are empty
    // (e.g. AI import gave segments dates but the main "Data de ida/volta" wasn't picked).
    const safeFormat = (d: Date | null | undefined) => {
      if (!d) return "";
      try { return format(d, "yyyy-MM-dd"); } catch { return ""; }
    };
    const firstLegDate = outboundLegs.find(l => l.leg_date)?.leg_date || "";
    const firstReturnLegDate = returnLegs.find(l => l.leg_date)?.leg_date || "";
    const departureDateStr = safeFormat(values.departure_date) || firstLegDate;
    const returnDateStr = !isOneWay
      ? (safeFormat(values.return_date) || firstReturnLegDate)
      : "";

    const data: any = {
      origin_city: values.origin_city, destination_city: values.destination_city,
      airline: values.airline,
      departure_date: departureDateStr,
      return_date: returnDateStr,
      includes_baggage: values.includes_baggage, includes_boarding_fee: values.includes_boarding_fee,
      fees_amount: values.includes_boarding_fee ? (Number(values.fees_amount) || 0) : 0,
      charge_fees_first_installment: !!(values.includes_boarding_fee && values.charge_fees_first_installment && (Number(values.fees_amount) || 0) > 0),
      adult_price: values.adult_price, child_price: values.child_price,
      is_unit_price: true, is_one_way: isOneWay,
      notes: values.notes || "",
    };

    // Preserve structured AI import summary (currency, totals, exchange, observations, etc.)
    if (init?.imported_summary) {
      data.imported_summary = init.imported_summary;
    }

    if (hasOutbound) {
      data.outbound_legs = preparedLegs.outbound;
      // backward compat: keep first leg as outbound_detail
      data.outbound_detail = preparedLegs.outbound[0];
    }
    if (hasInternal) {
      data.internal_legs = preparedLegs.internal;
    }
    if (!isOneWay && hasReturn) {
      data.return_legs = preparedLegs.return_;
      data.return_detail = preparedLegs.return_[0];
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

        {form.watch("includes_boarding_fee") && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <FormField control={form.control} name="fees_amount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Valor total das taxas (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number" min={0} step="0.01"
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    placeholder="Ex: 1200.00"
                  />
                </FormControl>
                <p className="text-[11px] text-muted-foreground">Embarque, RAV ou outras taxas inclusas. Usado para destacar a 1ª parcela.</p>
              </FormItem>
            )} />
            <FormField control={form.control} name="charge_fees_first_installment" render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={!(Number(form.watch("fees_amount")) > 0)}
                  />
                </FormControl>
                <FormLabel className="font-normal">Cobrar taxas integralmente na 1ª parcela</FormLabel>
              </FormItem>
            )} />
          </div>
        )}

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
              <FlightLegFields legs={outboundLegs} onChange={setOutboundLegs} label="Ida" direction="outbound" />
              {internalLegs.length > 0 && (
                <FlightLegFields legs={internalLegs} onChange={setInternalLegs} label="Trecho interno" direction="internal" defaultSegmentType="internal" />
              )}
              {internalLegs.length === 0 && (
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setInternalLegs([{ ...emptyLeg(), segment_type: "internal" as SegmentType }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar trecho interno
                </Button>
              )}
              {!isOneWay && <FlightLegFields legs={returnLegs} onChange={setReturnLegs} label="Volta" direction="return" />}
            </div>
          )}
        </div>

        {/* Resumo da importação inteligente (somente leitura) */}
        {init?.imported_summary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Resumo da importação</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {init.imported_summary.fare_type && (<div><span className="text-muted-foreground">Tipo tarifa: </span>{init.imported_summary.fare_type}</div>)}
              {init.imported_summary.passengers && (<div><span className="text-muted-foreground">Passageiros: </span>{init.imported_summary.passengers}</div>)}
              {init.imported_summary.currency && (<div><span className="text-muted-foreground">Moeda: </span>{init.imported_summary.currency}</div>)}
              {init.imported_summary.total_original != null && (<div><span className="text-muted-foreground">Total original: </span>{init.imported_summary.total_original}</div>)}
              {init.imported_summary.total_brl != null && (<div><span className="text-muted-foreground">Total BRL: </span>R$ {init.imported_summary.total_brl}</div>)}
              {init.imported_summary.exchange_rate != null && (<div><span className="text-muted-foreground">Câmbio: </span>{init.imported_summary.exchange_rate}{init.imported_summary.exchange_date ? ` (${init.imported_summary.exchange_date})` : ""}</div>)}
              {init.imported_summary.fuel_tax && (<div><span className="text-muted-foreground">Taxa combustível: </span>{init.imported_summary.fuel_tax}</div>)}
            </div>
            {!!init.imported_summary.observations?.length && (
              <div>
                <p className="text-xs text-muted-foreground mt-2">Observações:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {init.imported_summary.observations.map((o: string, i: number) => (<li key={i}>{o}</li>))}
                </ul>
              </div>
            )}
            {!!init.imported_summary.unidentified_fields?.length && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Campos não identificados: {init.imported_summary.unidentified_fields.join(", ")}
              </p>
            )}
          </div>
        )}

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
                <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><TextareaWithTemplate placeholder="Detalhes, diferenciais, informações complementares..." className="min-h-[80px]" onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><TextareaWithTemplate placeholder="Observações adicionais..." onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  hotel_name: z.string().min(1, "Informe o nome do hotel"),
  city: z.string().min(1, "Informe a cidade"),
  check_in: z.date({ required_error: "Selecione a data de check-in", invalid_type_error: "Selecione a data de check-in" }),
  check_out: z.date({ required_error: "Selecione a data de check-out", invalid_type_error: "Selecione a data de check-out" }),
  room_type: z.string().min(1, "Selecione o tipo de quarto"),
  meal_plan: z.string().min(1, "Selecione o regime de alimentação"),
  price: z.number().min(0),
  adult_price: z.number().min(0).optional(),
  child_price: z.number().min(0).optional(),
  notes: z.string().optional(),
}).refine((v) => !v.check_in || !v.check_out || v.check_out >= v.check_in, {
  message: "Check-out deve ser igual ou posterior ao check-in",
  path: ["check_out"],
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
    try {
      const data: any = {
        hotel_name: values.hotel_name, city: values.city,
        check_in: format(values.check_in, "yyyy-MM-dd"), check_out: format(values.check_out, "yyyy-MM-dd"),
        room_type: values.room_type, meal_plan: values.meal_plan, price: values.price, notes: values.notes || "",
      };
      if (values.adult_price && values.adult_price > 0) data.adult_price = values.adult_price;
      if (values.child_price && values.child_price > 0) data.child_price = values.child_price;
      onSubmit(data, values.price, values.option_label || undefined, values.service_description || undefined);
    } catch (err) {
      console.error("HotelForm submit failed:", err);
      toast({
        title: "Não foi possível salvar a hospedagem",
        description: "Verifique se as datas e os campos obrigatórios estão preenchidos.",
        variant: "destructive",
      });
    }
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
            <FormItem><FormLabel>Descrição (opcional)</FormLabel><FormControl><TextareaWithTemplate placeholder="Detalhes, diferenciais..." className="min-h-[80px]" onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
          <FormItem><FormLabel>Observações</FormLabel><FormControl><TextareaWithTemplate placeholder="Observações adicionais..." onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  pickup_location: z.string().optional(),
  dropoff_location: z.string().optional(),
  pickup_date: z.date().optional().nullable(),
  pickup_time: z.string().optional(),
  dropoff_date: z.date().optional().nullable(),
  dropoff_time: z.string().optional(),
  car_type: z.string().optional(),
  days: z.number().optional(),
  price: z.number().min(0),
  notes: z.string().optional(),
}).refine((data) => data.dropoff_date >= data.pickup_date, {
  message: "A data de devolução não pode ser anterior à retirada",
  path: ["dropoff_date"],
});

function CarRentalForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, paymentSlot, photoSlot, onPlaceIdChange }: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
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
              onChange={(v) => { field.onChange(v); onPlaceIdChange?.(null); }}
              onPlaceSelect={(p) => onPlaceIdChange?.(p.place_id)}
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
        {photoSlot}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><TextareaWithTemplate placeholder="Observações adicionais..." onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  location: z.string().optional(),
  arrival_date: z.date().optional().nullable(),
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
            <FormControl><TextareaWithTemplate placeholder="Detalhes adicionais do transfer..." className="min-h-[80px]" onValueChange={field.onChange} {...field} /></FormControl>
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
  product_name: z.string().optional(),
  ticket_type: z.string().optional(),
  service_description: z.string().optional(),
  date: z.date().optional().nullable(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  notes: z.string().optional(),
});

function AttractionForm({ onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, initialData, adultsCount = 1, childrenCount = 0, paymentSlot, photoSlot, onPlaceIdChange }: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
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
                onChange={(v) => { field.onChange(v); onPlaceIdChange?.(null); }}
                onPlaceSelect={(p) => onPlaceIdChange?.(p.place_id)}
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
          <FormItem><FormLabel>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel><FormControl><TextareaWithTemplate placeholder="Detalhes, diferenciais, informações complementares..." className="min-h-[80px]" onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
          <FormItem><FormLabel>Observações <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel><FormControl><TextareaWithTemplate placeholder="Observações sobre o ingresso..." className="min-h-[80px]" onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  provider: z.string().optional(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  coverage: z.string().optional(),
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
          <FormItem><FormLabel>Observações</FormLabel><FormControl><TextareaWithTemplate placeholder="Observações adicionais..." onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  ship_name: z.string().optional(),
  route: z.string().optional(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  cabin_type: z.string().optional(),
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
          <FormItem><FormLabel>Observações</FormLabel><FormControl><TextareaWithTemplate placeholder="Observações adicionais..." onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  description: z.string().optional(),
  price: z.number().min(0),
});

/* ━━━━━━━━━━━━━━━━━━━ RAIL TRANSPORT FORM ━━━━━━━━━━━━━━━━━━━ */
const railSchema = z.object({
  origin_city: z.string().min(1, "Informe a cidade de origem"),
  origin_station: z.string().optional(),
  destination_city: z.string().min(1, "Informe a cidade de destino"),
  destination_station: z.string().optional(),
  travel_date: z.date().optional().nullable(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  operator: z.string().optional(),
  rail_type: z.enum(["high_speed", "regional", "night", "panoramic", "other"]),
  travel_class: z.enum(["economy", "second", "first", "executive", "sleeper"]),
  adults_count: z.number().min(0),
  children_count: z.number().min(0),
  description: z.string().optional(),
  whats_included: z.string().optional(),
  notes: z.string().optional(),
  wifi: z.boolean().optional(),
  power_outlets: z.boolean().optional(),
  meal_included: z.boolean().optional(),
  assigned_seat: z.boolean().optional(),
  private_cabin: z.boolean().optional(),
  panoramic_view: z.boolean().optional(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
});

function RailTransportForm({
  onSubmit, onCancel, isLoading, tripStartDate, tripEndDate, adultsCount, childrenCount, initialData, paymentSlot,
}: Omit<ServiceFormProps, "serviceType">) {
  const disableDate = makeDateDisabler(tripStartDate, tripEndDate);
  const init: any = initialData?.service_data || {};
  const form = useForm<z.infer<typeof railSchema>>({
    resolver: zodResolver(railSchema),
    defaultValues: {
      origin_city: init.origin_city || "",
      origin_station: init.origin_station || "",
      destination_city: init.destination_city || "",
      destination_station: init.destination_station || "",
      travel_date: init.travel_date ? parseLocalDate(init.travel_date) : tripStartDate,
      departure_time: init.departure_time || "",
      arrival_time: init.arrival_time || "",
      operator: init.operator || "",
      rail_type: (init.rail_type as RailTransportType) || "high_speed",
      travel_class: (init.travel_class as RailTransportClass) || "economy",
      adults_count: init.adults_count ?? (adultsCount ?? 1),
      children_count: init.children_count ?? (childrenCount ?? 0),
      description: init.description || "",
      whats_included: init.whats_included || "",
      notes: init.notes || "",
      wifi: !!init.features?.wifi,
      power_outlets: !!init.features?.power_outlets,
      meal_included: !!init.features?.meal_included,
      assigned_seat: !!init.features?.assigned_seat,
      private_cabin: !!init.features?.private_cabin,
      panoramic_view: !!init.features?.panoramic_view,
      adult_price: typeof init.adult_price === "number" ? init.adult_price : 0,
      child_price: typeof init.child_price === "number" ? init.child_price : 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof railSchema>) => {
    const totalPrice =
      (values.adults_count || 0) * (values.adult_price || 0) +
      (values.children_count || 0) * (values.child_price || 0);
    const payload: RailTransportData = {
      origin_city: values.origin_city,
      origin_station: values.origin_station || undefined,
      destination_city: values.destination_city,
      destination_station: values.destination_station || undefined,
      travel_date: values.travel_date ? format(values.travel_date, "yyyy-MM-dd") : "",
      departure_time: values.departure_time || undefined,
      arrival_time: values.arrival_time || undefined,
      operator: values.operator || "",
      rail_type: values.rail_type,
      travel_class: values.travel_class,
      adults_count: values.adults_count,
      children_count: values.children_count,
      infants_count: 0,
      description: values.description || "",
      whats_included: values.whats_included || "",
      notes: values.notes || "",
      features: {
        wifi: !!values.wifi,
        power_outlets: !!values.power_outlets,
        meal_included: !!values.meal_included,
        assigned_seat: !!values.assigned_seat,
        private_cabin: !!values.private_cabin,
        panoramic_view: !!values.panoramic_view,
      },
      adult_price: values.adult_price,
      child_price: values.child_price,
      price: totalPrice,
    };
    onSubmit(payload as any, totalPrice, undefined, values.description || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TramFront className="h-4 w-4 text-primary" /> Trajeto
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="origin_city" render={({ field }) => (
              <FormItem><FormLabel>Cidade de origem</FormLabel><FormControl>
                <PlacesAutocomplete value={field.value || ""} onChange={field.onChange} placeType="city" placeholder="Ex: Paris" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="origin_station" render={({ field }) => (
              <FormItem><FormLabel>Estação de origem <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl><Input placeholder="Ex: Gare de Lyon" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="destination_city" render={({ field }) => (
              <FormItem><FormLabel>Cidade de destino</FormLabel><FormControl>
                <PlacesAutocomplete value={field.value || ""} onChange={field.onChange} placeType="city" placeholder="Ex: Lyon" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="destination_station" render={({ field }) => (
              <FormItem><FormLabel>Estação de destino <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl><Input placeholder="Ex: Lyon Part-Dieu" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="travel_date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Data da viagem</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={disableDate} defaultMonth={defaultMonth(tripStartDate)} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="departure_time" render={({ field }) => (
              <FormItem><FormLabel>Horário de saída</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="arrival_time" render={({ field }) => (
              <FormItem><FormLabel>Horário de chegada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="operator" render={({ field }) => (
              <FormItem><FormLabel>Operadora ferroviária</FormLabel><FormControl><Input placeholder="SNCF, Trenitalia, Eurostar..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="rail_type" render={({ field }) => (
              <FormItem><FormLabel>Tipo de transporte</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(Object.keys(RAIL_TYPE_LABELS) as RailTransportType[]).map(k => (
                      <SelectItem key={k} value={k}>{RAIL_TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="travel_class" render={({ field }) => (
              <FormItem><FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(Object.keys(RAIL_CLASS_LABELS) as RailTransportClass[]).map(k => (
                      <SelectItem key={k} value={k}>{RAIL_CLASS_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="adults_count" render={({ field }) => (
              <FormItem><FormLabel>Adultos</FormLabel><FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="children_count" render={({ field }) => (
              <FormItem><FormLabel>Crianças</FormLabel><FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Descrição para o cliente</FormLabel><FormControl>
              <TextareaWithTemplate placeholder="Conte ao cliente como será o trajeto, o conforto, o que esperar..." onValueChange={field.onChange} {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="whats_included" render={({ field }) => (
            <FormItem><FormLabel>O que está incluso</FormLabel><FormControl>
              <TextareaWithTemplate placeholder="Bilhete, reserva de assento, bagagem permitida..." onValueChange={field.onChange} {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Observações</FormLabel><FormControl>
              <TextareaWithTemplate placeholder="Observações internas ou avisos importantes..." onValueChange={field.onChange} {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <div className="space-y-2">
            <FormLabel>Características</FormLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["wifi", "Wi-Fi"],
                ["power_outlets", "Tomadas"],
                ["meal_included", "Refeição incluída"],
                ["assigned_seat", "Assento marcado"],
                ["private_cabin", "Cabine privativa"],
                ["panoramic_view", "Vista panorâmica"],
              ] as const).map(([key, label]) => (
                <FormField key={key} control={form.control} name={key as any} render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer font-normal">{label}</FormLabel>
                  </FormItem>
                )} />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Valores por Passageiro</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="adult_price" render={({ field }) => (
              <FormItem><FormLabel>Valor Adulto</FormLabel><FormControl>
                <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="child_price" render={({ field }) => (
              <FormItem><FormLabel>Valor Criança</FormLabel><FormControl>
                <Input type="number" min={0} step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          {(() => {
            const a = Number(form.watch("adults_count")) || 0;
            const c = Number(form.watch("children_count")) || 0;
            const ap = Number(form.watch("adult_price")) || 0;
            const cp = Number(form.watch("child_price")) || 0;
            const total = a * ap + c * cp;
            return (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {a} adulto(s) × {formatCurrencyInline(ap)}
                  {c > 0 && <> + {c} criança(s) × {formatCurrencyInline(cp)}</>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total do Serviço</div>
                  <div className="text-lg font-semibold text-primary">{formatCurrencyInline(total)}</div>
                </div>
              </div>
            );
          })()}
        </section>

        {renderPaymentSlot(
          paymentSlot,
          (Number(form.watch("adults_count")) || 0) * (Number(form.watch("adult_price")) || 0) +
            (Number(form.watch("children_count")) || 0) * (Number(form.watch("child_price")) || 0)
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{initialData ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </form>
    </Form>
  );
}

function OtherForm({ onSubmit, onCancel, isLoading, initialData, paymentSlot, photoSlot, onPlaceIdChange }: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
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
              onChange={(v) => { field.onChange(v); onPlaceIdChange?.(null); }}
              onPlaceSelect={(p) => onPlaceIdChange?.(p.place_id)}
              placeType="general"
              placeholder="Nome da empresa..."
            />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Descrição do Serviço</FormLabel><FormControl><TextareaWithTemplate placeholder="Descreva o serviço..." rows={3} onValueChange={field.onChange} {...field} /></FormControl><FormMessage /></FormItem>
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
  circuit_name: z.string().optional(),
  duration: z.string().optional(),
  itinerary: z.string().optional(),
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
              <TextareaWithTemplate
                placeholder={"Dia 1 — Chegada em Roma\nDia 2 — City tour pelo Coliseu e Fórum Romano\nDia 3 — Vaticano e Castel Sant'Angelo\n..."}
                rows={12}
                className="font-mono text-sm leading-relaxed"
                onValueChange={field.onChange} {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">Dica: separe cada dia em uma linha (Dia 1, Dia 2…). Quebras de linha são preservadas no orçamento e PDF.</p>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel><FormControl>
            <TextareaWithTemplate placeholder="Inclusões, exclusões, hotéis previstos, etc." rows={3} onValueChange={field.onChange} {...field} />
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
  const { user } = useAuth();
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

      if (!user?.id) {
        setUploadStatus("Sessão expirada. Faça login novamente.");
        setTimeout(() => setUploadStatus(""), 3000);
        setUploading(false);
        return;
      }

      // Upload full version (path scoped to user_id for ownership-based RLS)
      const fileId = crypto.randomUUID();
      const fullPath = `${user.id}/quotes/${fileId}.webp`;
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

      // Upload thumbnail (same user folder)
      const thumbPath = `${user.id}/quotes/thumb_${fileId}.webp`;
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
/* Hotel entry: mode chooser → AI import or classic HotelForm.
   Editing existing services skips chooser. */
function HotelEntry(props: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
  const isEditing = !!props.initialData;
  const [mode, setMode] = useState<"chooser" | "manual" | "import">(isEditing ? "manual" : "chooser");
  const [injectedInitial, setInjectedInitial] = useState<ServiceFormProps["initialData"] | undefined>(undefined);

  if (mode === "chooser") {
    return <HotelModeChooser onChoose={(m) => setMode(m)} />;
  }
  if (mode === "import") {
    return (
      <>
        <HotelModeChooser onChoose={(m) => setMode(m)} />
        <Dialog open onOpenChange={(open) => { if (!open) setMode("chooser"); }}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Importar hospedagem com IA</DialogTitle>
              <DialogDescription>
                Envie um PDF, imagem ou cole o texto da reserva. A IA extrai hotel, datas, regime, valores e taxas para você revisar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <HotelSmartImport
                onCancel={() => setMode("chooser")}
                onConfirm={(mapped) => {
                  setInjectedInitial({
                    service_data: mapped as any,
                    amount: mapped.price || 0,
                    option_label: null,
                    description: null,
                  });
                  setMode("manual");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  const merged = injectedInitial ? { ...props, initialData: injectedInitial } : props;
  return <HotelForm {...merged} />;
}

function HotelModeChooser({ onChoose }: { onChoose: (mode: "manual" | "import") => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Como você quer preencher a hospedagem?</h3>
        <p className="text-sm text-muted-foreground">Escolha o modo que for mais confortável agora.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose("import")}
          className="text-left rounded-lg border-2 border-primary/60 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Importar com IA</span>
          </div>
          <p className="font-semibold mb-1">Enviar PDF, imagem ou texto</p>
          <p className="text-sm text-muted-foreground">A IA lê a reserva, extrai hotel, datas, regime, valores e taxas, e abre a tela de revisão.</p>
        </button>
        <button type="button" onClick={() => onChoose("manual")}
          className="group text-left rounded-lg border border-border p-4 hover:border-foreground/40 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Preencher manualmente</span>
          </div>
          <p className="font-semibold mb-1">Formulário tradicional</p>
          <p className="text-sm text-muted-foreground">Digite os dados da hospedagem campo a campo.</p>
        </button>
      </div>
    </div>
  );
}

/* Car rental entry: mode chooser → AI import or classic CarRentalForm.
   Editing existing services skips chooser. */
function CarRentalEntry(props: Omit<ServiceFormProps, "serviceType"> & { onPlaceIdChange?: (id: string | null) => void }) {
  const isEditing = !!props.initialData;
  const [mode, setMode] = useState<"chooser" | "manual" | "import">(isEditing ? "manual" : "chooser");
  const [injectedInitial, setInjectedInitial] = useState<ServiceFormProps["initialData"] | undefined>(undefined);

  if (mode === "chooser") {
    return <CarRentalModeChooser onChoose={(m) => setMode(m)} />;
  }
  if (mode === "import") {
    return (
      <>
        <CarRentalModeChooser onChoose={(m) => setMode(m)} />
        <Dialog open onOpenChange={(open) => { if (!open) setMode("chooser"); }}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Importar locação com IA</DialogTitle>
              <DialogDescription>
                Envie um PDF, imagem ou cole o texto da reserva. A IA extrai locadora, veículo, datas, locais, valores e proteções para você revisar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <CarRentalSmartImport
                onCancel={() => setMode("chooser")}
                onConfirm={(mapped) => {
                  setInjectedInitial({
                    service_data: mapped as any,
                    amount: mapped.price || 0,
                    option_label: null,
                    description: null,
                  });
                  setMode("manual");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  const merged = injectedInitial ? { ...props, initialData: injectedInitial } : props;
  return <CarRentalForm {...merged} />;
}

function CarRentalModeChooser({ onChoose }: { onChoose: (mode: "manual" | "import") => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Como você quer preencher a locação?</h3>
        <p className="text-sm text-muted-foreground">Escolha o modo que for mais confortável agora.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose("import")}
          className="text-left rounded-lg border-2 border-primary/60 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Importar com IA</span>
          </div>
          <p className="font-semibold mb-1">Enviar PDF, imagem ou texto</p>
          <p className="text-sm text-muted-foreground">A IA lê a reserva, extrai locadora, veículo, datas, valores e taxas, e abre a tela de revisão.</p>
        </button>
        <button type="button" onClick={() => onChoose("manual")}
          className="group text-left rounded-lg border border-border p-4 hover:border-foreground/40 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Preencher manualmente</span>
          </div>
          <p className="font-semibold mb-1">Formulário tradicional</p>
          <p className="text-sm text-muted-foreground">Digite os dados da locação campo a campo.</p>
        </button>
      </div>
    </div>
  );
}

/* Flight entry: mode chooser → FlightWizard or classic FlightForm.
   Editing existing services skips chooser and opens classic form (no regression). */
function FlightEntry(props: Omit<ServiceFormProps, "serviceType">) {
  const isEditing = !!props.initialData;
  const [mode, setMode] = useState<"chooser" | "wizard" | "manual" | "import">(isEditing ? "manual" : "chooser");
  const [wizardPrefill, setWizardPrefill] = useState<WizardFlightDraft | undefined>(undefined);
  const [injectedInitial, setInjectedInitial] = useState<ServiceFormProps["initialData"] | undefined>(undefined);

  if (mode === "chooser") {
    return <FlightModeChooser onChoose={(m) => setMode(m)} />;
  }
  if (mode === "import") {
    return (
      <>
        {/* Render chooser behind so user returns there on close */}
        <FlightModeChooser onChoose={(m) => setMode(m)} />
        <Dialog open onOpenChange={(open) => { if (!open) setMode("chooser"); }}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Importar passagem aérea com IA</DialogTitle>
              <DialogDescription>
                Envie um PDF, imagem ou cole o texto do orçamento. A IA extrai voos, bagagens e tarifas para você revisar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <AirfareSmartImport
                onCancel={() => setMode("chooser")}
                onConfirm={(mapped) => {
                  setInjectedInitial({
                    service_data: mapped as any,
                    amount: (mapped.adult_price || 0) + (mapped.child_price || 0),
                    option_label: null,
                    description: null,
                  });
                  setMode("manual");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  if (mode === "wizard") {
    // Stable draft key per session — falls back to "new" for unsaved services
    const draftKey = `flight-wizard:${props.initialData ? "edit" : "new"}`;
    return (
      <>
        {/* Render chooser behind so user returns there on close */}
        <FlightModeChooser onChoose={(m) => setMode(m)} />
        <Dialog open onOpenChange={(open) => { if (!open) setMode("chooser"); }}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[calc(100vh-48px)] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Preencher passagem aérea passo a passo</DialogTitle>
              <DialogDescription>
                Vamos preencher a passagem aérea em etapas simples. Você pode pular o que ainda não souber e completar depois.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <FlightWizard
                {...props}
                draftKey={draftKey}
                prefill={wizardPrefill}
                onOpenFullForm={(draft) => {
          // Map wizard draft → FlightForm initialData and switch to manual
          const sd: any = {
            airline: draft.airline,
            origin_city: draft.origin_city,
            destination_city: draft.destination_city,
            departure_date: draft.departure_date || "",
            return_date: draft.return_date || "",
            is_one_way: draft.is_one_way,
            includes_baggage: draft.includes_baggage,
            includes_boarding_fee: draft.includes_boarding_fee,
            fees_amount: (draft as any).fees_amount,
            charge_fees_first_installment: (draft as any).charge_fees_first_installment,
            adult_price: draft.adult_price || 0,
            child_price: draft.child_price || 0,
            notes: draft.notes || "",
            outbound_legs: draft.outbound_legs,
            return_legs: draft.return_legs,
            internal_legs: (draft as any).internal_legs,
          };
          setInjectedInitial({
            service_data: sd,
            amount: (draft.adult_price || 0) + (draft.child_price || 0),
            option_label: draft.option_label || null,
            description: draft.description || null,
          });
          setWizardPrefill(draft);
          setMode("manual");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  // manual
  const merged = injectedInitial ? { ...props, initialData: injectedInitial } : props;
  return <FlightForm {...merged} />;
}

/* Generic entry for services that share the unified AI importer:
   transfer, attraction, insurance, cruise, circuit, other.
   Editing existing services skips the chooser. */
function GenericImportEntry({
  serviceKey,
  icon,
  children,
  ...props
}: Omit<ServiceFormProps, "serviceType"> & {
  serviceKey: GenericServiceKey;
  icon: React.ReactNode;
  children: React.ReactElement;
}) {
  const isEditing = !!props.initialData;
  const [mode, setMode] = useState<"chooser" | "manual" | "import">(isEditing ? "manual" : "chooser");
  const [injectedInitial, setInjectedInitial] = useState<ServiceFormProps["initialData"] | undefined>(undefined);
  const cfg = SERVICE_IMPORT_CONFIGS[serviceKey];

  const Chooser = (
    <GenericModeChooser
      label={cfg.serviceLabel}
      icon={icon}
      onChoose={(m) => setMode(m)}
    />
  );

  if (mode === "chooser") return Chooser;

  if (mode === "import") {
    return (
      <>
        {Chooser}
        <Dialog open onOpenChange={(open) => { if (!open) setMode("chooser"); }}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Importar {cfg.serviceLabel} com IA</DialogTitle>
              <DialogDescription>
                Envie um PDF, imagem ou cole o texto da reserva. A IA extrai os dados principais para você revisar antes de aplicar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <GenericServiceSmartImport
                serviceType={serviceKey}
                serviceLabel={cfg.serviceLabel}
                fields={cfg.fields}
                mapToInitialData={cfg.mapToInitialData}
                onCancel={() => setMode("chooser")}
                onConfirm={(mapped) => {
                  setInjectedInitial({
                    service_data: mapped.service_data as any,
                    amount: mapped.amount || 0,
                    option_label: null,
                    description: null,
                  });
                  setMode("manual");
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // manual — inject extracted initialData into the wrapped form
  const child = injectedInitial
    ? React.cloneElement(children, { initialData: injectedInitial })
    : children;
  // Services whose form already renders the photo slot internally
  const FORMS_WITH_INTERNAL_PHOTO: GenericServiceKey[] = ["attraction", "other"];
  const showExternalPhoto = !FORMS_WITH_INTERNAL_PHOTO.includes(serviceKey) && !!props.photoSlot;
  return (
    <>
      {showExternalPhoto && props.photoSlot}
      {child}
    </>
  );
}

function GenericModeChooser({
  label, icon, onChoose,
}: { label: string; icon: React.ReactNode; onChoose: (mode: "manual" | "import") => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Como você quer preencher o serviço de {label}?</h3>
        <p className="text-sm text-muted-foreground">Escolha o modo que for mais confortável agora.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose("import")}
          className="text-left rounded-lg border-2 border-primary/60 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Importar com IA</span>
          </div>
          <p className="font-semibold mb-1">Enviar PDF, imagem ou texto</p>
          <p className="text-sm text-muted-foreground">A IA lê a reserva, extrai os dados principais e abre a tela de revisão.</p>
        </button>
        <button type="button" onClick={() => onChoose("manual")}
          className="group text-left rounded-lg border border-border p-4 hover:border-foreground/40 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-sm font-semibold text-muted-foreground">Preencher manualmente</span>
          </div>
          <p className="font-semibold mb-1">Formulário tradicional</p>
          <p className="text-sm text-muted-foreground">Digite os dados campo a campo.</p>
        </button>
      </div>
    </div>
  );
}

export function ServiceForm({ serviceType, onSubmit, onCancel, isLoading, showOptionLabel, tripStartDate, tripEndDate, adultsCount, childrenCount, initialData, paymentSlot }: ServiceFormProps) {
  const initUrls: string[] = initialData?.image_urls?.length ? initialData.image_urls : (initialData?.image_url ? [initialData.image_url] : []);
  const [serviceImageUrls, setServiceImageUrls] = useState<string[]>(initUrls);
  const [isImgUploading, setIsImgUploading] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const hasMultipleOptions = serviceType === 'flight' || serviceType === 'hotel';

  const wrappedSubmit = (data: any, amount: number, optionLabel?: string, description?: string) => {
    onSubmit(data, amount, optionLabel, description, serviceImageUrls.length > 0 ? serviceImageUrls[0] : undefined, serviceImageUrls);
  };

  const isHotel = serviceType === 'hotel';
  const photoSlotElement = (
    <ServiceImageUpload
      imageUrls={serviceImageUrls}
      onImageUrlsChange={setServiceImageUrls}
      isUploading={isImgUploading}
      placeId={placeId}
      hotelMode={isHotel}
    />
  );
  const formProps = {
    onSubmit: wrappedSubmit, onCancel, isLoading: isLoading || isImgUploading, showOptionLabel: hasMultipleOptions,
    tripStartDate, tripEndDate, adultsCount, childrenCount, initialData, paymentSlot, photoSlot: photoSlotElement,
    ...(['hotel', 'attraction', 'car_rental', 'other'].includes(serviceType) ? { onPlaceIdChange: setPlaceId } : {}),
  };

  let formElement: React.ReactNode = null;
  switch (serviceType) {
    case "flight": formElement = <FlightEntry {...formProps} />; break;
    case "hotel": formElement = <HotelEntry {...formProps} />; break;
    case "car_rental": formElement = <CarRentalEntry {...formProps} />; break;
    case "transfer": formElement = <GenericImportEntry serviceKey="transfer" icon={<MapIcon className="h-4 w-4 text-muted-foreground" />} {...formProps}><TransferForm {...formProps} /></GenericImportEntry>; break;
    case "attraction": formElement = <GenericImportEntry serviceKey="attraction" icon={<Ticket className="h-4 w-4 text-muted-foreground" />} {...formProps}><AttractionForm {...formProps} /></GenericImportEntry>; break;
    case "insurance": formElement = <GenericImportEntry serviceKey="insurance" icon={<Shield className="h-4 w-4 text-muted-foreground" />} {...formProps}><InsuranceForm {...formProps} /></GenericImportEntry>; break;
    case "cruise": formElement = <GenericImportEntry serviceKey="cruise" icon={<Ship className="h-4 w-4 text-muted-foreground" />} {...formProps}><CruiseForm {...formProps} /></GenericImportEntry>; break;
    case "rail_transport": formElement = <RailTransportForm {...formProps} />; break;
    case "circuit": formElement = <GenericImportEntry serviceKey="circuit" icon={<MapIcon className="h-4 w-4 text-muted-foreground" />} {...formProps}><CircuitForm {...formProps} /></GenericImportEntry>; break;
    case "other": formElement = <GenericImportEntry serviceKey="other" icon={<Package className="h-4 w-4 text-muted-foreground" />} {...formProps}><OtherForm {...formProps} /></GenericImportEntry>; break;
    default: return null;
  }

  return (
    <div className="space-y-4">
      {!(['flight','hotel','car_rental','transfer','attraction','insurance','cruise','circuit','other'] as ServiceType[]).includes(serviceType) && photoSlotElement}
      {formElement}
    </div>
  );
}
