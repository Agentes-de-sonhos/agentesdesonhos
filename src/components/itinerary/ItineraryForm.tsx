import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, MapPin, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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
  TRIP_PROFILE_LABELS,
  TRAVEL_INTEREST_LABELS,
  TRAVEL_INTEREST_ICONS,
  TRAVEL_PACE_LABELS,
} from "@/types/itinerary";
import type { DateRange } from "react-day-picker";

const formSchema = z.object({
  destination: z.string().min(2, "Destino é obrigatório"),
  startDate: z.date({ required_error: "Data de início é obrigatória" }),
  endDate: z.date({ required_error: "Data de fim é obrigatória" }),
  travelersCount: z.number().min(1, "Mínimo 1 viajante"),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      travelersCount: 2,
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
    onSubmit({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      travelersCount: values.travelersCount,
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
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Cliente + Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <ClientSelector
              value={selectedClient}
              onChange={(c) => { setSelectedClient(c); setClientError(""); }}
              required
              error={clientError}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destino</Label>
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
            <Label htmlFor="travelersCount">Número de Viajantes</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="travelersCount"
                type="number"
                min={1}
                className="pl-10"
                {...form.register("travelersCount", { valueAsNumber: true })}
              />
            </div>
          </div>
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
