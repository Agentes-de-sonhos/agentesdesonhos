import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, ArrowRight, CalendarIcon, Check, ChevronLeft, ExternalLink,
  Plane, Plus, SkipForward, Trash2, Save, Sparkles, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { TextareaWithTemplate } from "@/components/notes/TextareaWithTemplate";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { suggestAirlines } from "@/lib/airlines";
import { searchAirportsSync, type AirportSuggestion } from "@/lib/airports";
import { useAirports } from "@/hooks/useAirports";
import { cn } from "@/lib/utils";
import { useFormDraft } from "@/hooks/usePersistedState";
import { computeFlightStatus } from "./flightStatus";
import { SEGMENT_TYPE_OPTIONS, classifySegments, classifyReturnSegments } from "@/lib/flightSegments";
import type { SegmentType } from "@/types/quote";

/* ─── Types ─── */
export interface FlightLegDraft {
  leg_date?: string;
  airport_origin?: string;
  airport_destination?: string;
  departure_time?: string;
  arrival_time?: string;
  flight_number?: string;
  segment_type?: SegmentType;
}

export interface WizardFlightDraft {
  airline?: string;
  origin_city?: string;
  destination_city?: string;
  is_one_way?: boolean;
  departure_date?: string; // yyyy-MM-dd
  return_date?: string;    // yyyy-MM-dd
  includes_baggage?: boolean;
  includes_boarding_fee?: boolean;
  fees_amount?: number;
  charge_fees_first_installment?: boolean;
  outbound_legs?: FlightLegDraft[];
  return_legs?: FlightLegDraft[];
  internal_legs?: FlightLegDraft[];
  adult_price?: number;
  child_price?: number;
  option_label?: string;
  description?: string;
  notes?: string;
}

interface FlightWizardProps {
  onSubmit: (data: any, amount: number, optionLabel?: string, description?: string, imageUrl?: string, imageUrls?: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showOptionLabel?: boolean;
  tripStartDate?: Date;
  tripEndDate?: Date;
  adultsCount?: number;
  childrenCount?: number;
  /** Same paymentSlot from ServiceForms — function that receives live amount */
  paymentSlot?: ((liveAmount: number) => React.ReactNode) | React.ReactNode;
  /** Same photoSlot from ServiceForms */
  photoSlot?: React.ReactNode;
  /** When user wants to switch to manual form mid-wizard */
  onOpenFullForm: (prefill: WizardFlightDraft) => void;
  /** Quote id, used to key the draft */
  draftKey: string;
  /** Optional prefill (future AI/upload feature) */
  prefill?: Partial<WizardFlightDraft>;
}

const TAG_SUGGESTIONS = [
  "Melhor custo-benefício",
  "Voo direto",
  "Menor tempo de conexão",
  "Tarifa promocional",
  "Opção recomendada",
];

const emptyLeg = (): FlightLegDraft => ({
  leg_date: "", airport_origin: "", airport_destination: "",
  departure_time: "", arrival_time: "", flight_number: "",
});

function fmt(d?: string) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-").map(Number);
    return format(new Date(y, m - 1, day), "dd/MM/yyyy", { locale: ptBR });
  } catch { return d; }
}
function parseLocal(d?: string): Date | undefined {
  if (!d) return undefined;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return undefined;
  return new Date(y, m - 1, day);
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

/* ─── Airline autocomplete (livre, com sugestões) ─── */
function AirlineInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => suggestAirlines(value || "", 8), [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showList = open && focused && suggestions.length > 0 && !suggestions.some(s => s.toLowerCase() === (value || "").toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="LATAM, GOL, Air France..."
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      {showList && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => { e.preventDefault(); onChange(name); setOpen(false); }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Airport autocomplete (IATA, city or airport name) ─── */
function AirportInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { loaded } = useAirports();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState<string>(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions: AirportSuggestion[] = useMemo(
    () => loaded ? searchAirportsSync(query, 8) : [],
    [query, loaded]
  );

  // Hide list if the query exactly matches a 3-letter IATA already selected.
  const isExactIata = /^[A-Za-z]{3}$/.test(query.trim()) && suggestions.some(
    s => s.iata.toLowerCase() === query.trim().toLowerCase() && s.iata === (value || "").toUpperCase()
  );
  const showList = open && focused && suggestions.length > 0 && !isExactIata;

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          // Only propagate as IATA when user typed exactly a 3-letter code
          if (/^[A-Za-z]{3}$/.test(v.trim())) onChange(v.trim().toUpperCase());
          else if (v.trim() === "") onChange("");
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      {showList && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-72 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.iata + s.name}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground border-b border-border/40 last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.iata);
                setQuery(s.iata);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-primary">{s.iata}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{s.city}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{s.name}{s.country ? ` — ${s.country}` : ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Step shell ─── */
function StepShell({
  step, total, title, help, children,
}: { step: number; total: number; title: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {help && <p className="text-sm text-muted-foreground">{help}</p>}
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

/* ─── Leg editor (mirrors FlightLegFields) ─── */
function LegEditor({
  legs, onChange, label, defaultSegmentType,
}: { legs: FlightLegDraft[]; onChange: (l: FlightLegDraft[]) => void; label: string; defaultSegmentType?: SegmentType }) {
  const upd = (idx: number, field: keyof FlightLegDraft, value: string) => {
    onChange(legs.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const autoClassify = () => {
    const types = defaultSegmentType === "return" ? classifyReturnSegments(legs) : classifySegments(legs);
    onChange(legs.map((l, i) => ({ ...l, segment_type: types[i] || l.segment_type })));
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">✈ {label}</p>
        {legs.length > 1 && (
          <Button type="button" variant="ghost" size="sm" onClick={autoClassify} className="h-6 text-xs">
            <Sparkles className="h-3 w-3 mr-1" /> Classificar trechos
          </Button>
        )}
      </div>
      {legs.map((leg, idx) => (
        <div key={idx} className="relative border border-border/30 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Trecho {idx + 1}</span>
            {legs.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                onClick={() => onChange(legs.filter((_, i) => i !== idx))}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Data do voo</label>
              <Input type="date" value={leg.leg_date || ""} onChange={e => upd(idx, "leg_date", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aeroporto de origem</label>
              <div className="mt-1">
                <AirportInput
                  placeholder="GRU, São Paulo, Guarulhos..."
                  value={leg.airport_origin || ""}
                  onChange={v => upd(idx, "airport_origin", v)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aeroporto de destino</label>
              <div className="mt-1">
                <AirportInput
                  placeholder="CDG, Paris, Charles de Gaulle..."
                  value={leg.airport_destination || ""}
                  onChange={v => upd(idx, "airport_destination", v)}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Horário de saída</label>
              <Input type="time" value={leg.departure_time || ""} onChange={e => upd(idx, "departure_time", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horário de chegada</label>
              <Input type="time" value={leg.arrival_time || ""} onChange={e => upd(idx, "arrival_time", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nº do voo</label>
              <Input placeholder="LA8084" value={leg.flight_number || ""} onChange={e => upd(idx, "flight_number", e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo do trecho</label>
            <select
              value={leg.segment_type || ""}
              onChange={(e) => upd(idx, "segment_type", e.target.value as SegmentType)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">{defaultSegmentType ? `Auto (${SEGMENT_TYPE_OPTIONS.find(o => o.value === defaultSegmentType)?.label})` : "Não classificado"}</option>
              {SEGMENT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...legs, emptyLeg()])} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Adicionar trecho
      </Button>
    </div>
  );
}

/* ─── Main wizard ─── */
export function FlightWizard({
  onSubmit, onCancel, isLoading, showOptionLabel,
  tripStartDate, tripEndDate, adultsCount = 1, childrenCount = 0,
  paymentSlot, photoSlot, onOpenFullForm, draftKey, prefill,
}: FlightWizardProps) {
  const { loadDraft, saveDraft, clearDraft } = useFormDraft<WizardFlightDraft>(draftKey, 600);

  const initial: WizardFlightDraft = useMemo(() => {
    const saved = loadDraft() || {};
    return {
      airline: "", origin_city: "", destination_city: "",
      is_one_way: false,
      departure_date: tripStartDate ? format(tripStartDate, "yyyy-MM-dd") : "",
      return_date: tripEndDate ? format(tripEndDate, "yyyy-MM-dd") : "",
      includes_baggage: true, includes_boarding_fee: true,
      outbound_legs: [emptyLeg()], return_legs: [emptyLeg()],
      adult_price: 0, child_price: 0,
      option_label: "", description: "", notes: "",
      ...prefill,
      ...saved,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [data, setData] = useState<WizardFlightDraft>(initial);
  const [step, setStep] = useState(0);

  // Autosave to localStorage
  useEffect(() => { saveDraft(data); }, [data, saveDraft]);

  const upd = (patch: Partial<WizardFlightDraft>) => setData(d => ({ ...d, ...patch }));

  const isOneWay = !!data.is_one_way;

  // Step list — return step (#3) is skipped when one-way
  const stepKeys = useMemo(() => {
    const base = ["main", "outbound"];
    if (!isOneWay) base.push("return");
    base.push("baggage", "prices", "payment", "presentation", "review");
    return base;
  }, [isOneWay]);
  const totalSteps = stepKeys.length;
  const currentKey = stepKeys[step];

  const adultPrice = Number(data.adult_price) || 0;
  const childPrice = Number(data.child_price) || 0;
  const liveAmount = adultPrice * adultsCount + childPrice * childrenCount;

  const hasNonEmptyLegs = (legs?: FlightLegDraft[]) =>
    !!legs?.some(l => Object.values(l).some(v => v && String(v).length > 0));

  const buildPayload = (savedAsDraft = false) => {
    const out: any = {
      origin_city: data.origin_city || "",
      destination_city: data.destination_city || "",
      airline: data.airline || "",
      departure_date: data.departure_date || "",
      return_date: !isOneWay ? (data.return_date || "") : "",
      includes_baggage: !!data.includes_baggage,
      includes_boarding_fee: !!data.includes_boarding_fee,
      fees_amount: data.includes_boarding_fee ? (Number(data.fees_amount) || 0) : 0,
      charge_fees_first_installment: !!(data.includes_boarding_fee && data.charge_fees_first_installment && (Number(data.fees_amount) || 0) > 0),
      adult_price: adultPrice,
      child_price: childPrice,
      is_unit_price: true,
      is_one_way: isOneWay,
      notes: data.notes || "",
    };
    if (hasNonEmptyLegs(data.outbound_legs)) {
      out.outbound_legs = data.outbound_legs;
      out.outbound_detail = data.outbound_legs![0];
    }
    if (hasNonEmptyLegs(data.internal_legs)) {
      out.internal_legs = data.internal_legs!.map(l => ({ ...l, segment_type: l.segment_type || "internal" as SegmentType }));
    }
    if (!isOneWay && hasNonEmptyLegs(data.return_legs)) {
      out.return_legs = data.return_legs;
      out.return_detail = data.return_legs![0];
    }
    out.flight_status = computeFlightStatus(out, savedAsDraft);
    return out;
  };

  const handleSave = (savedAsDraft = false) => {
    const payload = buildPayload(savedAsDraft);
    onSubmit(payload, liveAmount, data.option_label || undefined, data.description || undefined);
    clearDraft();
  };

  const goNext = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  /* Step renderers */
  const renderStep = () => {
    switch (currentKey) {
      case "main":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Informações principais"
            help="Comece pelas informações principais da passagem. Se ainda não souber algum dado, você pode pular e completar depois.">
            <div className="space-y-2">
              <Label>Companhia aérea</Label>
              <AirlineInput value={data.airline || ""} onChange={(v) => upd({ airline: v })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cidade de origem</Label>
                <PlacesAutocomplete
                  value={data.origin_city || ""}
                  onChange={(v) => upd({ origin_city: v })}
                  placeType="city"
                  placeholder="São Paulo"
                  fetchDetailsOnSelect={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade de destino</Label>
                <PlacesAutocomplete
                  value={data.destination_city || ""}
                  onChange={(v) => upd({ destination_city: v })}
                  placeType="city"
                  placeholder="Paris"
                  fetchDetailsOnSelect={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!isOneWay} onChange={() => upd({ is_one_way: false })} className="accent-primary" />
                <span className="text-sm">Ida e volta</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isOneWay} onChange={() => upd({ is_one_way: true, return_date: "" })} className="accent-primary" />
                <span className="text-sm">Somente ida</span>
              </label>
            </div>
            <div className={cn("grid gap-3", !isOneWay && "sm:grid-cols-2")}>
              <div className="space-y-2">
                <Label>Data de ida</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {fmt(data.departure_date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single"
                      selected={parseLocal(data.departure_date)}
                      onSelect={(d) => upd({ departure_date: d ? format(d, "yyyy-MM-dd") : "" })}
                      initialFocus className="pointer-events-auto"
                      locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              {!isOneWay && (
                <div className="space-y-2">
                  <Label>Data de volta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {fmt(data.return_date)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single"
                        selected={parseLocal(data.return_date)}
                        onSelect={(d) => upd({ return_date: d ? format(d, "yyyy-MM-dd") : "" })}
                        initialFocus className="pointer-events-auto"
                        locale={ptBR}
                        defaultMonth={parseLocal(data.return_date) || parseLocal(data.departure_date)} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </StepShell>
        );

      case "outbound":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Detalhes da ida"
            help="Cadastre o primeiro trecho da ida. Se houver conexão, adicione outro trecho para deixar o orçamento mais claro para o cliente.">
            <LegEditor legs={data.outbound_legs || [emptyLeg()]} onChange={(legs) => upd({ outbound_legs: legs })} label="Ida" defaultSegmentType="outbound" />
          </StepShell>
        );

      case "return":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Detalhes da volta"
            help="Agora informe os dados da volta. Se ainda não tiver os horários ou número do voo, você pode pular.">
            <LegEditor legs={data.return_legs || [emptyLeg()]} onChange={(legs) => upd({ return_legs: legs })} label="Volta" defaultSegmentType="return" />
          </StepShell>
        );

      case "baggage":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Bagagem e taxas"
            help="Essas informações ajudam a evitar dúvidas frequentes do cliente sobre bagagem e taxas.">
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border/60 p-3">
              <Checkbox checked={!!data.includes_baggage} onCheckedChange={(c) => upd({ includes_baggage: !!c })} />
              <div>
                <p className="text-sm font-medium">Inclui bagagem</p>
                <p className="text-xs text-muted-foreground">Marque se a tarifa já contempla bagagem despachada.</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border/60 p-3">
              <Checkbox checked={!!data.includes_boarding_fee} onCheckedChange={(c) => upd({ includes_boarding_fee: !!c })} />
              <div>
                <p className="text-sm font-medium">Inclui taxa de embarque</p>
                <p className="text-xs text-muted-foreground">Marque se o valor cobrado já inclui as taxas aeroportuárias.</p>
              </div>
            </label>
            {data.includes_boarding_fee && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Valor total das taxas (R$)</Label>
                  <Input
                    type="number" min={0} step="0.01"
                    value={data.fees_amount ?? ''}
                    onChange={e => upd({ fees_amount: parseFloat(e.target.value) || 0 })}
                    onFocus={e => e.target.select()}
                    placeholder="Ex: 1200.00"
                  />
                  <p className="text-[11px] text-muted-foreground">Embarque, RAV ou outras taxas inclusas no valor. Use para destacar a 1ª parcela.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={!!data.charge_fees_first_installment}
                    onCheckedChange={(c) => upd({ charge_fees_first_installment: !!c })}
                    disabled={!(Number(data.fees_amount) > 0)}
                  />
                  <span className="text-sm">Cobrar taxas integralmente na 1ª parcela</span>
                </label>
              </div>
            )}
          </StepShell>
        );

      case "prices":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Valores"
            help="Informe o valor da passagem por tipo de passageiro. Se não houver criança neste orçamento, deixe como zero ou pule.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor por adulto (R$)</Label>
                <Input type="number" min={0} step="0.01" value={data.adult_price ?? 0}
                  onChange={e => upd({ adult_price: parseFloat(e.target.value) || 0 })}
                  onFocus={e => e.target.select()} />
                {adultsCount > 0 && adultPrice > 0 && (
                  <p className="text-xs text-muted-foreground">{adultsCount} adulto{adultsCount > 1 ? "s" : ""} × {fmtCurrency(adultPrice)} = <span className="font-medium text-foreground">{fmtCurrency(adultPrice * adultsCount)}</span></p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Valor por criança (R$)</Label>
                <Input type="number" min={0} step="0.01" value={data.child_price ?? 0}
                  onChange={e => upd({ child_price: parseFloat(e.target.value) || 0 })}
                  onFocus={e => e.target.select()} />
                {childrenCount > 0 && childPrice > 0 && (
                  <p className="text-xs text-muted-foreground">{childrenCount} criança{childrenCount > 1 ? "s" : ""} × {fmtCurrency(childPrice)} = <span className="font-medium text-foreground">{fmtCurrency(childPrice * childrenCount)}</span></p>
                )}
              </div>
            </div>
            {liveAmount > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Passagens</span>
                  <span className="text-lg font-bold text-primary">{fmtCurrency(liveAmount)}</span>
                </div>
              </div>
            )}
          </StepShell>
        );

      case "payment":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Forma de pagamento"
            help="Você quer usar a forma de pagamento padrão do orçamento ou personalizar para esta passagem?">
            {typeof paymentSlot === "function" ? paymentSlot(liveAmount) : paymentSlot}
            <p className="text-xs text-muted-foreground">
              Mantenha o seletor acima desligado para usar a forma padrão do orçamento, ou ative-o para personalizar esta passagem.
            </p>
          </StepShell>
        );

      case "presentation":
        return (
          <StepShell step={step + 1} total={totalSteps} title="Apresentação para o cliente"
            help="Use esta etapa para destacar diferenciais, alertas importantes ou informações que deixam a apresentação mais profissional.">
            {showOptionLabel && (
              <div className="space-y-2">
                <Label>Etiqueta (opcional)</Label>
                <Input placeholder="Ex: Melhor custo-benefício" value={data.option_label || ""} onChange={e => upd({ option_label: e.target.value })} />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TAG_SUGGESTIONS.map(tag => (
                    <button key={tag} type="button" onClick={() => upd({ option_label: tag })}
                      className="text-xs rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {photoSlot && (
              <div className="space-y-2">
                <Label>Fotos do serviço (máx. 5)</Label>
                {photoSlot}
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <TextareaWithTemplate placeholder="Detalhes, diferenciais, informações complementares..." className="min-h-[80px]"
                value={data.description || ""}
                onValueChange={(v) => upd({ description: v })}
                onChange={(e) => upd({ description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <TextareaWithTemplate placeholder="Observações adicionais..."
                value={data.notes || ""}
                onValueChange={(v) => upd({ notes: v })}
                onChange={(e) => upd({ notes: e.target.value })} />
            </div>
          </StepShell>
        );

      case "review": {
        const warnings: string[] = [];
        if (!data.airline) warnings.push("Companhia aérea não informada.");
        if (!data.origin_city || !data.destination_city) warnings.push("Origem ou destino em branco.");
        if (!data.departure_date) warnings.push("Data de ida não informada.");
        if (!isOneWay && !data.return_date) warnings.push("Data de volta não informada.");
        if (adultPrice <= 0) warnings.push("Valor por adulto ainda não informado.");
        const status = computeFlightStatus(buildPayload(false));
        return (
          <StepShell step={step + 1} total={totalSteps} title="Revisão final"
            help="Confira os dados antes de salvar. Você pode salvar mesmo com campos faltando — eles serão sinalizados como pendentes.">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Companhia</dt><dd className="font-medium">{data.airline || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Tipo</dt><dd className="font-medium">{isOneWay ? "Somente ida" : "Ida e volta"}</dd></div>
              <div><dt className="text-muted-foreground">Origem → Destino</dt><dd className="font-medium">{(data.origin_city || "—")} → {(data.destination_city || "—")}</dd></div>
              <div><dt className="text-muted-foreground">Datas</dt><dd className="font-medium">{fmt(data.departure_date)}{!isOneWay && ` → ${fmt(data.return_date)}`}</dd></div>
              <div><dt className="text-muted-foreground">Bagagem</dt><dd className="font-medium">{data.includes_baggage ? "Inclusa" : "Não inclusa"}</dd></div>
              <div><dt className="text-muted-foreground">Taxa de embarque</dt><dd className="font-medium">{data.includes_boarding_fee ? "Inclusa" : "Não inclusa"}</dd></div>
              <div><dt className="text-muted-foreground">Valor adulto</dt><dd className="font-medium">{fmtCurrency(adultPrice)}</dd></div>
              <div><dt className="text-muted-foreground">Valor criança</dt><dd className="font-medium">{fmtCurrency(childPrice)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Total</dt><dd className="text-base font-bold text-primary">{fmtCurrency(liveAmount)}</dd></div>
              {data.option_label && <div className="sm:col-span-2"><dt className="text-muted-foreground">Etiqueta</dt><dd className="font-medium">{data.option_label}</dd></div>}
              {data.description && <div className="sm:col-span-2"><dt className="text-muted-foreground">Descrição</dt><dd className="whitespace-pre-wrap">{data.description}</dd></div>}
              {data.notes && <div className="sm:col-span-2"><dt className="text-muted-foreground">Observações</dt><dd className="whitespace-pre-wrap">{data.notes}</dd></div>}
            </dl>
            <div className="text-xs">
              Status atual: <Badge variant="outline" className="ml-1">{status === "ready" ? "Pronto para apresentar" : status === "draft" ? "Rascunho" : "Incompleto"}</Badge>
            </div>
            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-medium">
                  <AlertCircle className="h-4 w-4" /> Atenção
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <p className="text-xs text-muted-foreground">Você pode salvar mesmo assim e completar depois.</p>
              </div>
            )}
          </StepShell>
        );
      }
      default: return null;
    }
  };

  const isFirst = step === 0;
  const isLast = currentKey === "review";

  return (
    <div className="space-y-4">
      {/* Top bar: title + compact step indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <Plane className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Modo Assistido — Passagem Aérea</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {step + 1}/{totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden -mt-2">
        <div className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
      </div>

      {renderStep()}

      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex gap-2">
          {!isFirst ? (
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          )}
          {!isLast && (
            <Button type="button" variant="ghost" size="sm" onClick={goNext} className="text-muted-foreground">
              <SkipForward className="h-4 w-4 mr-1" /> Pular por enquanto
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={() => handleSave(true)}>
            <Save className="h-4 w-4 mr-1" /> Salvar rascunho
          </Button>
          {!isLast ? (
            <Button type="button" size="sm" onClick={goNext}>
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={isLoading} onClick={() => handleSave(false)}>
              <Check className="h-4 w-4 mr-1" /> Salvar passagem aérea
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mode chooser ─── */
interface ModeChooserProps {
  onChoose: (mode: "wizard" | "import") => void;
}
export function FlightModeChooser({ onChoose }: ModeChooserProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Como você quer preencher a passagem aérea?</h3>
        <p className="text-sm text-muted-foreground">Escolha o modo que for mais confortável agora. Você pode trocar a qualquer momento.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onChoose("import")}
          className="text-left rounded-lg border-2 border-primary/60 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Importar com IA</span>
          </div>
          <p className="font-semibold mb-1">Enviar PDF, imagem ou texto</p>
          <p className="text-sm text-muted-foreground">A IA lê o orçamento aéreo, extrai voos, bagagens, tarifas e abre a tela de revisão.</p>
        </button>
        <button type="button" onClick={() => onChoose("wizard")}
          className="group text-left rounded-lg border border-border p-4 hover:border-foreground/40 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Passo a passo</span>
          </div>
          <p className="font-semibold mb-1">Preencher com ajuda</p>
          <p className="text-sm text-muted-foreground">Responda passo a passo, pule o que ainda não souber e complete depois.</p>
        </button>
      </div>
    </div>
  );
}