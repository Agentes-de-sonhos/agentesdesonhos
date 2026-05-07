import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, MapPin, Sparkles, ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientSelector } from "@/components/shared/ClientSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  ItineraryFormData,
  TripProfile,
  TravelInterest,
  TravelPace,
  JourneyInfo,
  JourneyPeriod,
  JOURNEY_PERIOD_LABELS,
  ExtraDestination,
  DestinationKind,
  TransportMode,
  DESTINATION_KIND_LABELS,
  TRANSPORT_MODE_LABELS,
  TRIP_PROFILE_LABELS,
  TRAVEL_INTEREST_LABELS,
  TRAVEL_INTEREST_ICONS,
  TRAVEL_PACE_LABELS,
} from "@/types/itinerary";
import type { DateRange } from "react-day-picker";

const formSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().min(2, "Destino é obrigatório"),
  startDate: z.date({ required_error: "Data de início é obrigatória" }),
  endDate: z.date({ required_error: "Data de fim é obrigatória" }),
  adultsCount: z.number().min(1, "Mínimo 1 adulto"),
  childrenCount: z.number().min(0).default(0),
  tripType: z.string(),
  budgetLevel: z.enum(["economico", "conforto", "luxo"]),
  interests: z.array(z.string()).default([]),
  travelPace: z.string().default("moderado"),
  dietaryRestrictions: z.string().optional(),
  localOrTouristy: z.string().optional(),
  exclusiveOrPopular: z.string().optional(),
  mobilityLimitations: z.string().optional(),
});

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export function ItineraryForm({ onSubmit, isLoading }: ItineraryFormProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<TravelInterest[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showPace, setShowPace] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [clientError, setClientError] = useState("");
  const [journeyEnabled, setJourneyEnabled] = useState(false);
  const [arrivalInfo, setArrivalInfo] = useState<JourneyInfo>({ transport: 'aviao', period: 'manha' });
  const [departureInfo, setDepartureInfo] = useState<JourneyInfo>({ transport: 'aviao', period: 'tarde' });
  const [multiEnabled, setMultiEnabled] = useState(false);
  const [extraDestinations, setExtraDestinations] = useState<ExtraDestination[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: "",
      destination: "",
      adultsCount: 2,
      childrenCount: 0,
      tripType: "casal",
      budgetLevel: "conforto",
      interests: [],
      travelPace: "moderado",
      dietaryRestrictions: "",
      localOrTouristy: "mix",
      exclusiveOrPopular: "mix",
      mobilityLimitations: "",
    },
  });

  const toggleInterest = (interest: TravelInterest) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest];
      form.setValue("interests", next);
      return next;
    });
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedClient) {
      setClientError("Selecione um cliente para continuar");
      return;
    }
    setClientError("");
    const adults = values.adultsCount || 1;
    const children = values.childrenCount || 0;
    onSubmit({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      origin: values.origin || undefined,
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      travelersCount: adults + children,
      adultsCount: adults,
      childrenCount: children,
      tripType: values.tripType as TripProfile,
      budgetLevel: values.budgetLevel,
      interests: selectedInterests,
      travelPace: (values.travelPace || "moderado") as TravelPace,
      additionalPreferences: {
        dietaryRestrictions: values.dietaryRestrictions || undefined,
        localOrTouristy: (values.localOrTouristy as "local" | "touristy" | "mix") || "mix",
        exclusiveOrPopular: (values.exclusiveOrPopular as "exclusive" | "popular" | "mix") || "mix",
        mobilityLimitations: values.mobilityLimitations || undefined,
      },
      arrivalInfo: journeyEnabled ? arrivalInfo : undefined,
      departureInfo: journeyEnabled ? departureInfo : undefined,
      extraDestinations: multiEnabled && extraDestinations.length > 0 ? extraDestinations : undefined,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Linha 1: Cliente */}
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <ClientSelector
            value={selectedClient}
            onChange={(c) => { setSelectedClient(c); setClientError(""); }}
            required
            error={clientError}
          />
        </div>

        {/* Linha 2: Origem + Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="origin">Cidade de origem</Label>
            <PlacesAutocomplete
              value={form.watch("origin") || ""}
              onChange={(val) => form.setValue("origin", val)}
              onPlaceSelect={(pred) => form.setValue("origin", pred.name)}
              placeType="city"
              placeholder="Ex: São Paulo, Brasil"
              fetchDetailsOnSelect={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destino principal</Label>
            <PlacesAutocomplete
              value={form.watch("destination") || ""}
              onChange={(val) => form.setValue("destination", val)}
              onPlaceSelect={(pred) => form.setValue("destination", pred.name)}
              placeType="city"
              placeholder="Ex: Paris, França"
              fetchDetailsOnSelect={false}
            />
            {form.formState.errors.destination && (
              <p className="text-sm text-destructive">
                {form.formState.errors.destination.message}
              </p>
            )}
          </div>
        </div>

        {/* Multi-destinos toggle + builder */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={multiEnabled}
              onChange={(e) => setMultiEnabled(e.target.checked)}
            />
            <span>Esta viagem possui múltiplos destinos</span>
          </label>

          {multiEnabled && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  O destino principal acima é o ponto de partida. Adicione abaixo os demais destinos na ordem que serão visitados.
                </p>
              </div>

              {extraDestinations.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum destino adicional ainda.</p>
              )}

              {extraDestinations.map((dest, idx) => (
                <DestinationRow
                  key={idx}
                  index={idx}
                  total={extraDestinations.length}
                  value={dest}
                  onChange={(next) =>
                    setExtraDestinations((prev) => prev.map((d, i) => (i === idx ? next : d)))
                  }
                  onRemove={() =>
                    setExtraDestinations((prev) => prev.filter((_, i) => i !== idx))
                  }
                  onMove={(dir) =>
                    setExtraDestinations((prev) => {
                      const arr = [...prev];
                      const target = idx + dir;
                      if (target < 0 || target >= arr.length) return prev;
                      [arr[idx], arr[target]] = [arr[target], arr[idx]];
                      return arr;
                    })
                  }
                />
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setExtraDestinations((prev) => [
                    ...prev,
                    { city: "", kind: "secundario", nights: 2, transportFromPrevious: "aviao", notes: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar destino
              </Button>
            </div>
          )}
        </div>

        {/* Período + Número de Viajantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Período da Viagem
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                      {" → "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.from) {
                    form.setValue("startDate", range.from);
                  }
                  if (range?.from && range?.to) {
                    form.setValue("endDate", range.to);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {dateRange?.from && dateRange?.to && (
            <p className="text-xs text-muted-foreground">
              {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias de viagem
            </p>
          )}
          {(form.formState.errors.startDate || form.formState.errors.endDate) && (
            <p className="text-sm text-destructive">Selecione o período completo da viagem</p>
          )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Viajantes
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  min={1}
                  placeholder="Adultos"
                  {...form.register("adultsCount", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Adultos</p>
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  placeholder="Crianças"
                  {...form.register("childrenCount", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Crianças</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voos de ida e volta (opcionais, em blocos colapsáveis) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleFlight
            label="Voo de ida"
            helper="Usado pela IA para ajustar o Dia 1 (chegada no destino)"
            enabled={outboundEnabled}
            onToggle={setOutboundEnabled}
            value={outboundFlight}
            onChange={setOutboundFlight}
          />
          <CollapsibleFlight
            label="Voo de volta"
            helper="Usado pela IA para ajustar o último dia (saída do destino)"
            enabled={returnEnabled}
            onToggle={setReturnEnabled}
            value={returnFlight}
            onChange={setReturnFlight}
          />
        </div>

        {/* Perfil + Orçamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Perfil do Viajante</Label>
            <Select
              defaultValue="casal"
              onValueChange={(value) => form.setValue("tripType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TRIP_PROFILE_LABELS) as [TripProfile, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nível de Orçamento</Label>
            <Select
              defaultValue="conforto"
              onValueChange={(value) =>
                form.setValue("budgetLevel", value as ItineraryFormData["budgetLevel"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economico">Econômico (3 estrelas)</SelectItem>
                <SelectItem value="conforto">Conforto (4 estrelas)</SelectItem>
                <SelectItem value="luxo">Luxo (5 estrelas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interests multi-select */}
        {/* Interests multi-select (collapsible) */}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between text-muted-foreground"
          onClick={() => setShowInterests(!showInterests)}
        >
          <span>
            Interesses da viagem
            {selectedInterests.length > 0 && (
              <span className="ml-2 text-xs text-primary">({selectedInterests.length} selecionados)</span>
            )}
          </span>
          {showInterests ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showInterests && (
          <div className="space-y-2 rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Selecione um ou mais interesses</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TRAVEL_INTEREST_LABELS) as [TravelInterest, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleInterest(value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selectedInterests.includes(value)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span>{TRAVEL_INTEREST_ICONS[value]}</span>
                    <span className="truncate">{label}</span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Advanced Preferences Toggle */}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between text-muted-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          Preferências adicionais
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <Label>Ritmo da viagem</Label>
              <Select
                defaultValue={form.watch("travelPace") || "moderado"}
                onValueChange={(value) => form.setValue("travelPace", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ritmo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TRAVEL_PACE_LABELS) as [TravelPace, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions">Restrições alimentares</Label>
              <Input
                id="dietaryRestrictions"
                placeholder="Ex: vegetariano, sem glúten, kosher..."
                {...form.register("dietaryRestrictions")}
              />
            </div>

            <div className="space-y-2">
              <Label>Preferência de experiências</Label>
              <Select
                defaultValue="mix"
                onValueChange={(value) => form.setValue("localOrTouristy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Experiências locais e autênticas</SelectItem>
                  <SelectItem value="touristy">Pontos turísticos clássicos</SelectItem>
                  <SelectItem value="mix">Mistura de ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de locais</Label>
              <Select
                defaultValue="mix"
                onValueChange={(value) => form.setValue("exclusiveOrPopular", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Locais exclusivos e reservados</SelectItem>
                  <SelectItem value="popular">Locais populares e movimentados</SelectItem>
                  <SelectItem value="mix">Mistura de ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobilityLimitations">Limitações de mobilidade</Label>
              <Textarea
                id="mobilityLimitations"
                placeholder="Descreva qualquer limitação de mobilidade..."
                rows={2}
                {...form.register("mobilityLimitations")}
              />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
            Gerando roteiro com IA...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Roteiro com IA
          </>
        )}
      </Button>
    </form>
  );
}

interface FlightFieldProps {
  label: string;
  helper?: string;
  value: FlightInfo;
  onChange: (v: FlightInfo) => void;
}

function FlightField({ label, helper, value, onChange }: FlightFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={value.period}
        onValueChange={(v) => onChange({ period: v as FlightPeriod })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manha">Manhã</SelectItem>
          <SelectItem value="tarde">Tarde</SelectItem>
          <SelectItem value="noite">Noite</SelectItem>
        </SelectContent>
      </Select>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

interface CollapsibleFlightProps {
  label: string;
  helper?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  value: FlightInfo;
  onChange: (v: FlightInfo) => void;
}

function CollapsibleFlight({ label, helper, enabled, onToggle, value, onChange }: CollapsibleFlightProps) {
  if (!enabled) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start h-auto py-3"
        onClick={() => onToggle(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="text-sm">Adicionar {label.toLowerCase()} (opcional)</span>
      </Button>
    );
  }
  return (
    <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onToggle(false)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Select
        value={value.period}
        onValueChange={(v) => onChange({ period: v as FlightPeriod })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manha">Manhã</SelectItem>
          <SelectItem value="tarde">Tarde</SelectItem>
          <SelectItem value="noite">Noite</SelectItem>
        </SelectContent>
      </Select>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

interface DestinationRowProps {
  index: number;
  total: number;
  value: ExtraDestination;
  onChange: (v: ExtraDestination) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function DestinationRow({ index, total, value, onChange, onRemove, onMove }: DestinationRowProps) {
  return (
    <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Destino {index + 2}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Cidade / destino</Label>
          <PlacesAutocomplete
            value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            onPlaceSelect={(pred) => onChange({ ...value, city: pred.name })}
            placeType="city"
            placeholder="Ex: Miami, EUA"
            fetchDetailsOnSelect={false}
          />
        </div>
        <div>
          <Label className="text-xs">Tipo de destino</Label>
          <Select value={value.kind} onValueChange={(v) => onChange({ ...value, kind: v as DestinationKind })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(DESTINATION_KIND_LABELS) as [DestinationKind, string][]).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Noites neste destino</Label>
          <Input
            type="number"
            min={0}
            value={value.nights ?? 0}
            onChange={(e) => onChange({ ...value, nights: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label className="text-xs">Deslocamento até aqui</Label>
          <Select
            value={value.transportFromPrevious || "aviao"}
            onValueChange={(v) => onChange({ ...value, transportFromPrevious: v as TransportMode })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(TRANSPORT_MODE_LABELS) as [TransportMode, string][]).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Observações (opcional)</Label>
        <Textarea
          rows={2}
          placeholder="Ex: hospedagem na cidade base, retornar no fim do dia, etc."
          value={value.notes || ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
