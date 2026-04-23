import { TextareaWithTemplate } from "@/components/notes/TextareaWithTemplate";
import { useState } from "react";
import { FlightAutoImport } from "@/components/trip/FlightAutoImport";
import { CollapsibleFormSection } from "@/components/trip/CollapsibleFormSection";
import { PassengerNameInput } from "@/components/trip/PassengerNameInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Upload, X, Pencil, Search, Loader2, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TripServiceType } from "@/types/trip";

interface TripServiceFormProps {
  serviceType: TripServiceType;
  onSubmit: (data: any, files?: File[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: any;
  isEditing?: boolean;
}

interface MultiFileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  label?: string;
}

function MultiFileUpload({ files, setFiles, label = "Documentos / Vouchers" }: MultiFileUploadProps) {
  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setFiles([...files, ...newFiles]);
    }
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span className="text-sm truncate flex-1">{file.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(index)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {files.length > 0 ? "Adicionar mais arquivos" : "Clique para enviar arquivos"}
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleAdd}
        />
      </label>
    </div>
  );
}

// Flight Form - Professional multi-segment
const flightSchema = z.object({
  main_airline: z.string().min(2, "Companhia aérea principal é obrigatória"),
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  trip_type: z.enum(["ida", "ida_volta", "multi_trechos"]),
  locator_code: z.string().optional(),
  flight_status: z.enum(["confirmado", "emitido", "pendente"]),
  carry_on: z.string().optional(),
  checked_baggage: z.string().optional(),
  extra_baggage: z.string().optional(),
  baggage_rules: z.string().optional(),
  baggage_notes: z.string().optional(),
  checkin_url: z.string().optional(),
  checkin_status: z.enum(["pendente", "realizado"]),
  checkin_open_date: z.string().optional(),
  checkin_notes: z.string().optional(),
  recommended_arrival: z.string().optional(),
  boarding_terminal: z.string().optional(),
  required_documents: z.string().optional(),
  immigration_rules: z.string().optional(),
  boarding_notes: z.string().optional(),
});

interface FlightSegmentInput {
  origin_airport: string; origin_city: string; destination_airport: string; destination_city: string;
  flight_date: string; departure_time: string; arrival_time: string; flight_number: string;
  airline: string; terminal: string; gate: string; segment_type: 'ida' | 'conexao' | 'volta';
}

interface FlightPassengerInput {
  name: string; passenger_type: 'adulto' | 'crianca' | 'bebe'; document: string; seat: string; notes: string;
}

const emptySegment = (): FlightSegmentInput => ({
  origin_airport: '', origin_city: '', destination_airport: '', destination_city: '',
  flight_date: '', departure_time: '', arrival_time: '', flight_number: '',
  airline: '', terminal: '', gate: '', segment_type: 'ida',
});

const emptyPassenger = (): FlightPassengerInput => ({
  name: '', passenger_type: 'adulto', document: '', seat: '', notes: '',
});


function FlightForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const [files, setFiles] = useState<File[]>([]);
  const [segments, setSegments] = useState<FlightSegmentInput[]>(
    defaultValues?.segments?.length > 0 ? defaultValues.segments : [emptySegment()]
  );
  const [passengers, setPassengers] = useState<FlightPassengerInput[]>(
    defaultValues?.passengers?.length > 0 ? defaultValues.passengers : []
  );
  const [newPax, setNewPax] = useState<FlightPassengerInput>(emptyPassenger());
  const [isEditingPax, setIsEditingPax] = useState(false);

  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      main_airline: defaultValues?.main_airline || defaultValues?.airline || "",
      origin_city: defaultValues?.origin_city || "",
      destination_city: defaultValues?.destination_city || "",
      trip_type: defaultValues?.trip_type || "ida_volta",
      locator_code: defaultValues?.locator_code || "",
      flight_status: defaultValues?.flight_status || "confirmado",
      carry_on: defaultValues?.carry_on || "",
      checked_baggage: defaultValues?.checked_baggage || "",
      extra_baggage: defaultValues?.extra_baggage || "",
      baggage_rules: defaultValues?.baggage_rules || "",
      baggage_notes: defaultValues?.baggage_notes || "",
      checkin_url: defaultValues?.checkin_url || "",
      checkin_status: defaultValues?.checkin_status || "pendente",
      checkin_open_date: defaultValues?.checkin_open_date || "",
      checkin_notes: defaultValues?.checkin_notes || "",
      recommended_arrival: defaultValues?.recommended_arrival || "",
      boarding_terminal: defaultValues?.boarding_terminal || "",
      required_documents: defaultValues?.required_documents || "",
      immigration_rules: defaultValues?.immigration_rules || "",
      boarding_notes: defaultValues?.boarding_notes || "",
    },
  });

  const updateSegment = (index: number, field: keyof FlightSegmentInput, value: string) => {
    const updated = [...segments];
    (updated[index] as any)[field] = value;
    setSegments(updated);
  };

  const addPassenger = () => {
    if (!newPax.name.trim()) return;
    setPassengers([...passengers, { ...newPax }]);
    setNewPax(emptyPassenger());
    setIsEditingPax(false);
  };

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    onSubmit(
      {
        main_airline: values.main_airline,
        origin_city: values.origin_city,
        destination_city: values.destination_city,
        trip_type: values.trip_type,
        locator_code: values.locator_code || "",
        flight_status: values.flight_status,
        segments,
        passengers,
        carry_on: values.carry_on || "",
        checked_baggage: values.checked_baggage || "",
        extra_baggage: values.extra_baggage || "",
        baggage_rules: values.baggage_rules || "",
        baggage_notes: values.baggage_notes || "",
        checkin_url: values.checkin_url || "",
        checkin_status: values.checkin_status,
        checkin_open_date: values.checkin_open_date || "",
        checkin_notes: values.checkin_notes || "",
        recommended_arrival: values.recommended_arrival || "",
        boarding_terminal: values.boarding_terminal || "",
        required_documents: values.required_documents || "",
        immigration_rules: values.immigration_rules || "",
        boarding_notes: values.boarding_notes || "",
        // Legacy compat
        airline: values.main_airline,
        departure_date: firstSeg?.flight_date || "",
        return_date: lastSeg?.flight_date || firstSeg?.flight_date || "",
        notes: values.boarding_notes || "",
      },
      files.length > 0 ? files : undefined
    );
  };

  const tripTypeLabels: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
  const segmentTypeLabels: Record<string, string> = { ida: 'Ida', conexao: 'Conexão', volta: 'Volta' };

  const handleFlightImport = (importData: any) => {
    // Fill main form fields
    if (importData.airline) form.setValue("main_airline", importData.airline);
    if (importData.origin_city) form.setValue("origin_city", importData.origin_city);
    if (importData.destination_city) form.setValue("destination_city", importData.destination_city);

    // Fill first segment
    const updatedSegments = [...segments];
    const seg = updatedSegments[0] || emptySegment();
    if (importData.airline) seg.airline = importData.airline;
    if (importData.flight_number) seg.flight_number = importData.flight_number;
    if (importData.origin_airport) seg.origin_airport = importData.origin_airport;
    if (importData.origin_city) seg.origin_city = importData.origin_city;
    if (importData.destination_airport) seg.destination_airport = importData.destination_airport;
    if (importData.destination_city) seg.destination_city = importData.destination_city;
    if (importData.departure_time) {
      const t = importData.departure_time;
      seg.departure_time = t.includes("T")
        ? new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : t;
      if (t.includes("T")) {
        seg.flight_date = t.split("T")[0];
      }
    }
    if (importData.arrival_time) {
      const t = importData.arrival_time;
      seg.arrival_time = t.includes("T")
        ? new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : t;
    }
    updatedSegments[0] = seg;
    setSegments(updatedSegments);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* FlightAutoImport hidden per user request */}

        <CollapsibleFormSection title="✈️ Informações Principais" defaultOpen>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="main_airline" render={({ field }) => (
            <FormItem>
              <FormLabel>Companhia Aérea Principal *</FormLabel>
              <FormControl><Input placeholder="LATAM, GOL, Air France..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="locator_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Código Localizador (PNR)</FormLabel>
              <FormControl><Input placeholder="ABC123" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem *</FormLabel>
              <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Destino Final *</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="trip_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Viagem</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ida">Somente Ida</SelectItem>
                  <SelectItem value="ida_volta">Ida e Volta</SelectItem>
                  <SelectItem value="multi_trechos">Multi-trechos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="flight_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="emitido">Emitido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🛫 Trechos de Voo">

        {segments.map((seg, i) => (
          <CollapsibleFormSection key={i} title={`Trecho ${i + 1}${seg.origin_airport && seg.destination_airport ? ` — ${seg.origin_airport} → ${seg.destination_airport}` : ''}`} defaultOpen={i === 0}>
            <div className="flex items-center justify-end">
              {segments.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setSegments(segments.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3 mr-1" /> Remover
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo do Trecho</label>
                <Select value={seg.segment_type} onValueChange={(v) => updateSegment(i, 'segment_type', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ida">Ida</SelectItem>
                    <SelectItem value="conexao">Conexão</SelectItem>
                    <SelectItem value="volta">Volta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Companhia Aérea</label>
                <Input className="mt-1" placeholder="LATAM" value={seg.airline} onChange={(e) => updateSegment(i, 'airline', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nº do Voo</label>
                <Input className="mt-1" placeholder="LA8084" value={seg.flight_number} onChange={(e) => updateSegment(i, 'flight_number', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aeroporto Origem</label>
                <Input className="mt-1" placeholder="GRU" value={seg.origin_airport} onChange={(e) => updateSegment(i, 'origin_airport', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cidade Origem</label>
                <Input className="mt-1" placeholder="São Paulo" value={seg.origin_city} onChange={(e) => updateSegment(i, 'origin_city', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aeroporto Destino</label>
                <Input className="mt-1" placeholder="CDG" value={seg.destination_airport} onChange={(e) => updateSegment(i, 'destination_airport', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cidade Destino</label>
                <Input className="mt-1" placeholder="Paris" value={seg.destination_city} onChange={(e) => updateSegment(i, 'destination_city', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data do Voo</label>
                <Input className="mt-1" type="date" value={seg.flight_date} onChange={(e) => updateSegment(i, 'flight_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Partida</label>
                <Input className="mt-1" type="time" value={seg.departure_time} onChange={(e) => updateSegment(i, 'departure_time', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chegada</label>
                <Input className="mt-1" type="time" value={seg.arrival_time} onChange={(e) => updateSegment(i, 'arrival_time', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Terminal</label>
                <Input className="mt-1" placeholder="2E" value={seg.terminal} onChange={(e) => updateSegment(i, 'terminal', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Portão de Embarque</label>
              <Input className="mt-1" placeholder="A32" value={seg.gate} onChange={(e) => updateSegment(i, 'gate', e.target.value)} />
            </div>
          </CollapsibleFormSection>
        ))}

        <Button type="button" variant="outline" className="w-full" onClick={() => setSegments([...segments, emptySegment()])}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Trecho de Voo
        </Button>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👤 Passageiros">

        {passengers.map((p, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
            <span className="flex-1">{p.name} ({p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'}){p.seat ? ` • ${p.seat}` : ''}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewPax({ ...p }); setPassengers(passengers.filter((_, idx) => idx !== i)); setIsEditingPax(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid gap-2 sm:grid-cols-3">
            <PassengerNameInput
              value={newPax.name}
              onChange={(name) => setNewPax({ ...newPax, name })}
              onSelectPassenger={(name, type) => setNewPax({ ...newPax, name, passenger_type: type ?? newPax.passenger_type })}
              excludeNames={passengers.map((p) => p.name)}
            />
            <Select value={newPax.passenger_type} onValueChange={(v: any) => setNewPax({ ...newPax, passenger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="crianca">Criança</SelectItem>
                <SelectItem value="bebe">Bebê</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Assento (ex: 12A)" value={newPax.seat} onChange={(e) => setNewPax({ ...newPax, seat: e.target.value })} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Documento (opcional)" value={newPax.document} onChange={(e) => setNewPax({ ...newPax, document: e.target.value })} />
            <Input placeholder="Observações" value={newPax.notes} onChange={(e) => setNewPax({ ...newPax, notes: e.target.value })} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
            {isEditingPax ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro</>}
          </Button>
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧳 Bagagem">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="carry_on" render={({ field }) => (
            <FormItem>
              <FormLabel>Bagagem de Mão</FormLabel>
              <FormControl><Input placeholder="1x 10kg" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="checked_baggage" render={({ field }) => (
            <FormItem>
              <FormLabel>Bagagem Despachada</FormLabel>
              <FormControl><Input placeholder="2x 23kg" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="extra_baggage" render={({ field }) => (
            <FormItem>
              <FormLabel>Bagagem Extra</FormLabel>
              <FormControl><Input placeholder="Não inclusa" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="baggage_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras de Bagagem</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Peso máximo, dimensões, itens proibidos..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="✅ Check-in Online">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="checkin_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Link do Check-in</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status do Check-in</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="checkin_open_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Abertura do Check-in</FormLabel>
              <FormControl><Input placeholder="48h antes do voo" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Observações do Check-in</FormLabel>
              <FormControl><Input placeholder="Fazer check-in pelo app..." {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⚠️ Orientações de Embarque">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="recommended_arrival" render={({ field }) => (
            <FormItem>
              <FormLabel>Antecedência no Aeroporto</FormLabel>
              <FormControl><Input placeholder="3 horas antes" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="boarding_terminal" render={({ field }) => (
            <FormItem>
              <FormLabel>Terminal de Embarque</FormLabel>
              <FormControl><Input placeholder="Terminal 2" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="required_documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Documentos Obrigatórios</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Passaporte válido, visto, certificado de vacinação..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="immigration_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras de Imigração</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações sobre alfândega, declarações..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações adicionais para o passageiro..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="E-ticket / Cartão de Embarque" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Hotel Form - Professional
const hotelSchema = z.object({
  hotel_name: z.string().min(2, "Nome do hotel é obrigatório"),
  hotel_category: z.string().optional(),
  city: z.string().min(2, "Cidade é obrigatória"),
  country: z.string().optional(),
  check_in: z.date({ required_error: "Check-in é obrigatório" }),
  check_out: z.date({ required_error: "Check-out é obrigatório" }),
  room_type: z.string().optional(),
  reservation_status: z.string().optional(),
  reservation_code: z.string().optional(),
  checkin_time: z.string().optional(),
  early_checkin: z.string().optional(),
  checkin_holder: z.string().optional(),
  checkin_instructions: z.string().optional(),
  late_arrival_policy: z.string().optional(),
  checkout_time: z.string().optional(),
  late_checkout: z.string().optional(),
  late_checkout_fee: z.string().optional(),
  checkout_instructions: z.string().optional(),
  checkout_procedure: z.string().optional(),
  bed_type: z.string().optional(),
  guest_count: z.string().optional(),
  room_view: z.string().optional(),
  meal_plan: z.string().optional(),
  cleaning_policy: z.string().optional(),
  amenities: z.string().optional(),
  address: z.string().optional(),
  hotel_phone: z.string().optional(),
  hotel_email: z.string().optional(),
  hotel_website: z.string().optional(),
  maps_url: z.string().optional(),
  breakfast_hours: z.string().optional(),
  restaurants_included: z.string().optional(),
  food_notes: z.string().optional(),
  all_inclusive_rules: z.string().optional(),
  breakfast_included: z.string().optional(),
  wifi_included: z.string().optional(),
  taxes_included: z.string().optional(),
  resort_fee: z.string().optional(),
  parking_included: z.string().optional(),
  transfer_included: z.string().optional(),
  other_inclusions: z.string().optional(),
  cancellation_policy: z.string().optional(),
  change_policy: z.string().optional(),
  children_policy: z.string().optional(),
  pet_policy: z.string().optional(),
  mandatory_fees: z.string().optional(),
  hotel_deposit: z.string().optional(),
  hotel_deposit_method: z.string().optional(),
  special_requests: z.string().optional(),
  agency_notes: z.string().optional(),
  notes: z.string().optional(),
});

interface HotelGuestInput {
  name: string;
  age: string;
  notes: string;
}

const emptyGuest = (): HotelGuestInput => ({ name: '', age: '', notes: '' });

function HotelForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);
  const [guests, setGuests] = useState<HotelGuestInput[]>(
    defaultValues?.guests?.length > 0 ? defaultValues.guests : []
  );
  const [newGuest, setNewGuest] = useState<HotelGuestInput>(emptyGuest());
  const [isEditingGuest, setIsEditingGuest] = useState(false);

  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      hotel_name: defaultValues?.hotel_name || "",
      hotel_category: defaultValues?.hotel_category || "",
      city: defaultValues?.city || "",
      country: defaultValues?.country || "",
      room_type: defaultValues?.room_type || "",
      reservation_status: defaultValues?.reservation_status || "",
      reservation_code: defaultValues?.reservation_code || "",
      checkin_time: defaultValues?.checkin_time || "",
      early_checkin: defaultValues?.early_checkin || "",
      checkin_holder: defaultValues?.checkin_holder || "",
      checkin_instructions: defaultValues?.checkin_instructions || "",
      late_arrival_policy: defaultValues?.late_arrival_policy || "",
      checkout_time: defaultValues?.checkout_time || "",
      late_checkout: defaultValues?.late_checkout || "",
      late_checkout_fee: defaultValues?.late_checkout_fee || "",
      checkout_instructions: defaultValues?.checkout_instructions || "",
      checkout_procedure: defaultValues?.checkout_procedure || "",
      bed_type: defaultValues?.bed_type || "",
      guest_count: defaultValues?.guest_count || "",
      room_view: defaultValues?.room_view || "",
      meal_plan: defaultValues?.meal_plan || "",
      cleaning_policy: defaultValues?.cleaning_policy || "",
      amenities: defaultValues?.amenities || "",
      address: defaultValues?.address || "",
      hotel_phone: defaultValues?.hotel_phone || "",
      hotel_email: defaultValues?.hotel_email || "",
      hotel_website: defaultValues?.hotel_website || "",
      maps_url: defaultValues?.maps_url || "",
      breakfast_hours: defaultValues?.breakfast_hours || "",
      restaurants_included: defaultValues?.restaurants_included || "",
      food_notes: defaultValues?.food_notes || "",
      all_inclusive_rules: defaultValues?.all_inclusive_rules || "",
      breakfast_included: defaultValues?.breakfast_included || "",
      wifi_included: defaultValues?.wifi_included || "",
      taxes_included: defaultValues?.taxes_included || "",
      resort_fee: defaultValues?.resort_fee || "",
      parking_included: defaultValues?.parking_included || "",
      transfer_included: defaultValues?.transfer_included || "",
      other_inclusions: defaultValues?.other_inclusions || "",
      cancellation_policy: defaultValues?.cancellation_policy || "",
      change_policy: defaultValues?.change_policy || "",
      children_policy: defaultValues?.children_policy || "",
      pet_policy: defaultValues?.pet_policy || "",
      mandatory_fees: defaultValues?.mandatory_fees || "",
      hotel_deposit: defaultValues?.hotel_deposit || "",
      hotel_deposit_method: defaultValues?.hotel_deposit_method || "",
      special_requests: defaultValues?.special_requests || "",
      agency_notes: defaultValues?.agency_notes || "",
      notes: defaultValues?.notes || "",
      ...(defaultValues?.check_in ? { check_in: parseLocal(defaultValues.check_in) } : {}),
      ...(defaultValues?.check_out ? { check_out: parseLocal(defaultValues.check_out) } : {}),
    },
  });

  const addGuest = () => {
    if (!newGuest.name.trim()) return;
    setGuests([...guests, { ...newGuest }]);
    setNewGuest(emptyGuest());
    setIsEditingGuest(false);
  };

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    onSubmit(
      {
        ...values,
        check_in: format(values.check_in, "yyyy-MM-dd"),
        check_out: format(values.check_out, "yyyy-MM-dd"),
        guests,
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🏨 Informações Principais" defaultOpen>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Hotel *</FormLabel>
              <FormControl><Input placeholder="Hotel Marriott Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="hotel_category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="3">3 Estrelas ⭐⭐⭐</SelectItem>
                  <SelectItem value="4">4 Estrelas ⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="5">5 Estrelas ⭐⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="resort">Resort</SelectItem>
                  <SelectItem value="pousada">Pousada</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade *</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem>
              <FormLabel>País</FormLabel>
              <FormControl><Input placeholder="França" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="check_in" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-in *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="check_out" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-out *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="reservation_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status da Reserva</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="pre_reserva">Pré-reserva</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="reservation_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Nº da Reserva</FormLabel>
              <FormControl><Input placeholder="CONF-12345" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="room_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Acomodação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="superior">Superior</SelectItem>
                  <SelectItem value="deluxe">Deluxe</SelectItem>
                  <SelectItem value="suite">Suíte</SelectItem>
                  <SelectItem value="suite_junior">Suíte Júnior</SelectItem>
                  <SelectItem value="presidencial">Presidencial</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="bangalo">Bangalô</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="bed_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cama</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="king">King</SelectItem>
                  <SelectItem value="queen">Queen</SelectItem>
                  <SelectItem value="twin">Twin (2 Solteiro)</SelectItem>
                  <SelectItem value="single">Solteiro</SelectItem>
                  <SelectItem value="double">Casal</SelectItem>
                  <SelectItem value="triple">Triplo</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📅 Detalhes do Check-in">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="checkin_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário do Check-in</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="early_checkin" render={({ field }) => (
            <FormItem>
              <FormLabel>Early Check-in</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim, incluso</SelectItem>
                  <SelectItem value="nao">Não disponível</SelectItem>
                  <SelectItem value="mediante_taxa">Mediante taxa</SelectItem>
                  <SelectItem value="sob_consulta">Sob consulta</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_holder" render={({ field }) => (
            <FormItem>
              <FormLabel>Titular da Reserva</FormLabel>
              <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="checkin_instructions" render={({ field }) => (
          <FormItem>
            <FormLabel>Instruções de Check-in</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Instruções especiais para chegada..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="late_arrival_policy" render={({ field }) => (
          <FormItem>
            <FormLabel>Política de Chegada Tardia</FormLabel>
            <FormControl><Input placeholder="Recepção 24h, chave no cofre..." {...field} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧳 Detalhes do Check-out">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="checkout_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário do Check-out</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="late_checkout" render={({ field }) => (
            <FormItem>
              <FormLabel>Late Check-out</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim, incluso</SelectItem>
                  <SelectItem value="nao">Não disponível</SelectItem>
                  <SelectItem value="mediante_taxa">Mediante taxa</SelectItem>
                  <SelectItem value="sob_consulta">Sob consulta</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="late_checkout_fee" render={({ field }) => (
            <FormItem>
              <FormLabel>Taxa Late Check-out</FormLabel>
              <FormControl><Input placeholder="USD 50" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="checkout_procedure" render={({ field }) => (
          <FormItem>
            <FormLabel>Procedimento de Check-out</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="recepcao">Recepção</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🛏️ Detalhes da Acomodação">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="guest_count" render={({ field }) => (
            <FormItem>
              <FormLabel>Hóspedes no Quarto</FormLabel>
              <FormControl><Input placeholder="2 adultos" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="room_view" render={({ field }) => (
            <FormItem>
              <FormLabel>Vista do Quarto</FormLabel>
              <FormControl><Input placeholder="Vista mar, jardim..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="meal_plan" render={({ field }) => (
            <FormItem>
              <FormLabel>Regime</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="somente_hospedagem">Somente Hospedagem</SelectItem>
                  <SelectItem value="cafe_manha">Café da Manhã</SelectItem>
                  <SelectItem value="meia_pensao">Meia Pensão</SelectItem>
                  <SelectItem value="pensao_completa">Pensão Completa</SelectItem>
                  <SelectItem value="all_inclusive">All Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="amenities" render={({ field }) => (
          <FormItem>
            <FormLabel>Amenities do Quarto</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Ar condicionado, cofre, minibar, secador..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📍 Localização e Contato">

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço Completo</FormLabel>
            <FormControl><Input placeholder="Rua, número, bairro..." {...field} /></FormControl>
          </FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl><Input placeholder="+33 1 2345 6789" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="hotel_email" render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input placeholder="reservas@hotel.com" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_website" render={({ field }) => (
            <FormItem>
              <FormLabel>Site Oficial</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Link Google Maps</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🍽️ Alimentação">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="breakfast_hours" render={({ field }) => (
            <FormItem>
              <FormLabel>Horários do Café da Manhã</FormLabel>
              <FormControl><Input placeholder="06:30 - 10:00" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="restaurants_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Restaurantes Inclusos</FormLabel>
              <FormControl><Input placeholder="Principal, Pool Bar..." {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="food_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações sobre Alimentação</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Restrições, opções vegetarianas..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="all_inclusive_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras do All Inclusive</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Horários, restaurantes, bebidas..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="💰 O que está incluso">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="breakfast_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Café da Manhã</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="wifi_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Wi-Fi</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="taxes_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Taxas Incluídas</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="resort_fee" render={({ field }) => (
            <FormItem>
              <FormLabel>Resort Fee</FormLabel>
              <FormControl><Input placeholder="USD 35/noite" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="parking_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Estacionamento</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Incluso</SelectItem>
                  <SelectItem value="nao">Não incluso</SelectItem>
                  <SelectItem value="pago">Pago à parte</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="transfer_included" render={({ field }) => (
            <FormItem>
              <FormLabel>Transfer</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Incluso</SelectItem>
                  <SelectItem value="nao">Não incluso</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="other_inclusions" render={({ field }) => (
          <FormItem>
            <FormLabel>Outros Serviços Inclusos</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Spa, academia, piscina, toalhas de praia..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧾 Políticas do Hotel">

        <FormField control={form.control} name="cancellation_policy" render={({ field }) => (
          <FormItem>
            <FormLabel>Política de Cancelamento</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Cancelamento gratuito até..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="children_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Crianças</FormLabel>
              <FormControl><Input placeholder="Até 12 anos grátis..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="pet_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Pets</FormLabel>
              <FormControl><Input placeholder="Aceita pets até 10kg" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="mandatory_fees" render={({ field }) => (
            <FormItem>
              <FormLabel>Taxas Obrigatórias no Destino</FormLabel>
              <FormControl><Input placeholder="City tax EUR 3/noite" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="hotel_deposit" render={({ field }) => (
            <FormItem>
              <FormLabel>Caução no Hotel</FormLabel>
              <FormControl><Input placeholder="EUR 200" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👨‍👩‍👧 Hóspedes">

        {guests.map((g, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
            <span className="flex-1">{g.name}{g.age ? ` (${g.age})` : ''}{g.notes ? ` • ${g.notes}` : ''}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewGuest({ ...g }); setGuests(guests.filter((_, idx) => idx !== i)); setIsEditingGuest(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGuests(guests.filter((_, idx) => idx !== i))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid gap-2 sm:grid-cols-3">
            <PassengerNameInput
              value={newGuest.name}
              onChange={(name) => setNewGuest({ ...newGuest, name })}
              placeholder="Nome do hóspede"
              excludeNames={guests.map((g) => g.name)}
            />
            <Input placeholder="Idade (opcional)" value={newGuest.age} onChange={(e) => setNewGuest({ ...newGuest, age: e.target.value })} />
            <Input placeholder="Obs (aniversário, lua de mel...)" value={newGuest.notes} onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addGuest} disabled={!newGuest.name.trim()}>
            {isEditingGuest ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar Hóspede</>}
          </Button>
        </div>

        <FormField control={form.control} name="special_requests" render={({ field }) => (
          <FormItem>
            <FormLabel>Solicitações Especiais</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Andar alto, berço, travesseiro extra..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📝 Observações">

        <FormField control={form.control} name="agency_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações da Agência</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Notas internas da agência para o cliente..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações adicionais..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Voucher / Confirmação do Hotel" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Car Rental Form - Professional
const carRentalSchema = z.object({
  rental_company: z.string().min(2, "Locadora é obrigatória"),
  reservation_code: z.string().optional(),
  reservation_status: z.enum(["confirmada", "emitida", "a_retirar"]),
  pickup_location: z.string().min(2, "Local de retirada é obrigatório"),
  pickup_address: z.string().optional(),
  pickup_city: z.string().optional(),
  pickup_country: z.string().optional(),
  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  pickup_terminal: z.string().optional(),
  pickup_instructions: z.string().optional(),
  pickup_phone: z.string().optional(),
  pickup_maps_url: z.string().optional(),
  dropoff_location: z.string().min(2, "Local de devolução é obrigatório"),
  dropoff_address: z.string().optional(),
  dropoff_city: z.string().optional(),
  dropoff_country: z.string().optional(),
  dropoff_date: z.string().optional(),
  dropoff_time: z.string().optional(),
  dropoff_instructions: z.string().optional(),
  dropoff_late_policy: z.string().optional(),
  car_type: z.string().min(1, "Categoria é obrigatória"),
  car_model: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  doors: z.string().optional(),
  passenger_capacity: z.string().optional(),
  luggage_capacity: z.string().optional(),
  plate: z.string().optional(),
  car_notes: z.string().optional(),
  basic_insurance: z.string().optional(),
  full_insurance: z.string().optional(),
  third_party_protection: z.string().optional(),
  theft_protection: z.string().optional(),
  damage_protection: z.string().optional(),
  deductible: z.string().optional(),
  insurance_coverage: z.string().optional(),
  insurance_notes: z.string().optional(),
  deposit_amount: z.string().optional(),
  deposit_method: z.string().optional(),
  card_in_driver_name: z.string().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  additional_driver_fee: z.string().optional(),
  fuel_policy: z.string().optional(),
  fuel_rules: z.string().optional(),
  fuel_penalty: z.string().optional(),
  fuel_notes: z.string().optional(),
  required_documents: z.string().optional(),
  minimum_age: z.string().optional(),
  international_permit: z.string().optional(),
  traffic_rules: z.string().optional(),
  emergency_contact: z.string().optional(),
  agency_contact: z.string().optional(),
  notes: z.string().optional(),
});

interface CarDriverInput {
  name: string; document: string; age: string; notes: string;
}

const emptyDriver = (): CarDriverInput => ({ name: '', document: '', age: '', notes: '' });

function CarRentalForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const [files, setFiles] = useState<File[]>([]);
  const [drivers, setDrivers] = useState<CarDriverInput[]>(
    defaultValues?.drivers?.length > 0 ? defaultValues.drivers : [emptyDriver()]
  );

  const form = useForm<z.infer<typeof carRentalSchema>>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: {
      rental_company: defaultValues?.rental_company || "",
      reservation_code: defaultValues?.reservation_code || "",
      reservation_status: defaultValues?.reservation_status || "confirmada",
      pickup_location: defaultValues?.pickup_location || "",
      pickup_address: defaultValues?.pickup_address || "",
      pickup_city: defaultValues?.pickup_city || "",
      pickup_country: defaultValues?.pickup_country || "",
      pickup_date: defaultValues?.pickup_date || "",
      pickup_time: defaultValues?.pickup_time || "",
      pickup_terminal: defaultValues?.pickup_terminal || "",
      pickup_instructions: defaultValues?.pickup_instructions || "",
      pickup_phone: defaultValues?.pickup_phone || "",
      pickup_maps_url: defaultValues?.pickup_maps_url || "",
      dropoff_location: defaultValues?.dropoff_location || "",
      dropoff_address: defaultValues?.dropoff_address || "",
      dropoff_city: defaultValues?.dropoff_city || "",
      dropoff_country: defaultValues?.dropoff_country || "",
      dropoff_date: defaultValues?.dropoff_date || "",
      dropoff_time: defaultValues?.dropoff_time || "",
      dropoff_instructions: defaultValues?.dropoff_instructions || "",
      dropoff_late_policy: defaultValues?.dropoff_late_policy || "",
      car_type: defaultValues?.car_type || "",
      car_model: defaultValues?.car_model || "",
      transmission: defaultValues?.transmission || "",
      fuel_type: defaultValues?.fuel_type || "",
      doors: defaultValues?.doors || "",
      passenger_capacity: defaultValues?.passenger_capacity || "",
      luggage_capacity: defaultValues?.luggage_capacity || "",
      plate: defaultValues?.plate || "",
      car_notes: defaultValues?.car_notes || "",
      basic_insurance: defaultValues?.basic_insurance || "",
      full_insurance: defaultValues?.full_insurance || "",
      third_party_protection: defaultValues?.third_party_protection || "",
      theft_protection: defaultValues?.theft_protection || "",
      damage_protection: defaultValues?.damage_protection || "",
      deductible: defaultValues?.deductible || "",
      insurance_coverage: defaultValues?.insurance_coverage || "",
      insurance_notes: defaultValues?.insurance_notes || "",
      deposit_amount: defaultValues?.deposit_amount || "",
      deposit_method: defaultValues?.deposit_method || "",
      card_in_driver_name: defaultValues?.card_in_driver_name || "",
      payment_method: defaultValues?.payment_method || "",
      payment_status: defaultValues?.payment_status || "",
      additional_driver_fee: defaultValues?.additional_driver_fee || "",
      fuel_policy: defaultValues?.fuel_policy || "",
      fuel_rules: defaultValues?.fuel_rules || "",
      fuel_penalty: defaultValues?.fuel_penalty || "",
      fuel_notes: defaultValues?.fuel_notes || "",
      required_documents: defaultValues?.required_documents || "",
      minimum_age: defaultValues?.minimum_age || "",
      international_permit: defaultValues?.international_permit || "",
      traffic_rules: defaultValues?.traffic_rules || "",
      emergency_contact: defaultValues?.emergency_contact || "",
      agency_contact: defaultValues?.agency_contact || "",
      notes: defaultValues?.notes || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof carRentalSchema>) => {
    onSubmit({ ...values, drivers }, files.length > 0 ? files : undefined);
  };

  const statusLabels: Record<string, string> = { confirmada: 'Confirmada', emitida: 'Emitida', a_retirar: 'A Retirar' };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🚗 Informações Principais" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="rental_company" render={({ field }) => (
            <FormItem><FormLabel>Locadora *</FormLabel><FormControl><Input placeholder="Hertz, Alamo, Localiza..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="reservation_code" render={({ field }) => (
            <FormItem><FormLabel>Código da Reserva</FormLabel><FormControl><Input placeholder="ABC123" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="reservation_status" render={({ field }) => (
            <FormItem><FormLabel>Status da Reserva</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="a_retirar">A Retirar</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="car_type" render={({ field }) => (
            <FormItem><FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="economico">Econômico</SelectItem>
                  <SelectItem value="compacto">Compacto</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="luxo">Luxo</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📍 Dados de Retirada">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Retirada *</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="pickup_address" render={({ field }) => (
            <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Terminal 2E, Área de locação" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="pickup_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="pickup_date" render={({ field }) => (
            <FormItem><FormLabel>Data de Retirada</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="pickup_time" render={({ field }) => (
            <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_terminal" render={({ field }) => (
            <FormItem><FormLabel>Balcão / Terminal</FormLabel><FormControl><Input placeholder="Terminal 2" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="pickup_phone" render={({ field }) => (
            <FormItem><FormLabel>Telefone da Locadora</FormLabel><FormControl><Input placeholder="+33 1 234 5678" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="pickup_instructions" render={({ field }) => (
          <FormItem><FormLabel>Instruções de Retirada</FormLabel><FormControl><TextareaWithTemplate placeholder="Siga as placas para 'Car Rental'..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="pickup_maps_url" render={({ field }) => (
          <FormItem><FormLabel>Link Google Maps (Retirada)</FormLabel><FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🔁 Dados de Devolução">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="dropoff_location" render={({ field }) => (
            <FormItem><FormLabel>Local de Devolução *</FormLabel><FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="dropoff_address" render={({ field }) => (
            <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Área de devolução" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="dropoff_city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="dropoff_date" render={({ field }) => (
            <FormItem><FormLabel>Data de Devolução</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="dropoff_time" render={({ field }) => (
            <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="dropoff_instructions" render={({ field }) => (
          <FormItem><FormLabel>Instruções de Devolução</FormLabel><FormControl><TextareaWithTemplate placeholder="Estacionar na área indicada..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="dropoff_late_policy" render={({ field }) => (
          <FormItem><FormLabel>Política de Atraso</FormLabel><FormControl><Input placeholder="Cobrança por hora adicional..." {...field} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🚘 Detalhes do Veículo">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="car_model" render={({ field }) => (
            <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Corolla ou similar" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="transmission" render={({ field }) => (
            <FormItem><FormLabel>Transmissão</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="automatico">Automático</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField control={form.control} name="fuel_type" render={({ field }) => (
            <FormItem><FormLabel>Combustível</FormLabel><FormControl><Input placeholder="Gasolina" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="doors" render={({ field }) => (
            <FormItem><FormLabel>Portas</FormLabel><FormControl><Input placeholder="4" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="passenger_capacity" render={({ field }) => (
            <FormItem><FormLabel>Passageiros</FormLabel><FormControl><Input placeholder="5" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="luggage_capacity" render={({ field }) => (
            <FormItem><FormLabel>Bagagem</FormLabel><FormControl><Input placeholder="2 malas" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="plate" render={({ field }) => (
            <FormItem><FormLabel>Placa (se disponível)</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="car_notes" render={({ field }) => (
            <FormItem><FormLabel>Observações do Veículo</FormLabel><FormControl><Input placeholder="Ar condicionado, GPS..." {...field} /></FormControl></FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🛡️ Seguros da Locação">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="basic_insurance" render={({ field }) => (
            <FormItem><FormLabel>Seguro Básico</FormLabel><FormControl><Input placeholder="Sim / Não / Incluso" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="full_insurance" render={({ field }) => (
            <FormItem><FormLabel>Seguro Total (CDW/LDW)</FormLabel><FormControl><Input placeholder="CDW incluso" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="third_party_protection" render={({ field }) => (
            <FormItem><FormLabel>Proteção Terceiros</FormLabel><FormControl><Input placeholder="Sim/Não" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="theft_protection" render={({ field }) => (
            <FormItem><FormLabel>Proteção Roubo</FormLabel><FormControl><Input placeholder="Sim/Não" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="damage_protection" render={({ field }) => (
            <FormItem><FormLabel>Proteção Danos</FormLabel><FormControl><Input placeholder="Sim/Não" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="deductible" render={({ field }) => (
            <FormItem><FormLabel>Franquia</FormLabel><FormControl><Input placeholder="€ 800" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="insurance_coverage" render={({ field }) => (
            <FormItem><FormLabel>Cobertura</FormLabel><FormControl><Input placeholder="Danos ao veículo até..." {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="insurance_notes" render={({ field }) => (
          <FormItem><FormLabel>Observações do Seguro</FormLabel><FormControl><TextareaWithTemplate placeholder="Informações importantes sobre o seguro..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="💳 Caução e Pagamento">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="deposit_amount" render={({ field }) => (
            <FormItem><FormLabel>Valor da Caução</FormLabel><FormControl><Input placeholder="€ 1.200" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="deposit_method" render={({ field }) => (
            <FormItem><FormLabel>Forma da Caução</FormLabel><FormControl><Input placeholder="Cartão de crédito" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="card_in_driver_name" render={({ field }) => (
            <FormItem><FormLabel>Cartão no Nome do Condutor</FormLabel><FormControl><Input placeholder="Sim / Obrigatório" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="payment_status" render={({ field }) => (
            <FormItem><FormLabel>Status do Pagamento</FormLabel><FormControl><Input placeholder="Pré-pago / A pagar no destino" {...field} /></FormControl></FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👤 Condutores">
        {drivers.map((d, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{i === 0 ? 'Condutor Principal' : `Condutor Adicional ${i}`}</span>
              {drivers.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setDrivers(drivers.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3 mr-1" /> Remover
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                <PassengerNameInput
                  className="mt-1"
                  placeholder="João Silva"
                  value={d.name}
                  onChange={(name) => { const u = [...drivers]; u[i] = { ...u[i], name }; setDrivers(u); }}
                  excludeNames={drivers.map((dr) => dr.name).filter((_, idx) => idx !== i)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Documento (CNH/Passaporte)</label>
                <Input className="mt-1" placeholder="123456789" value={d.document} onChange={(e) => { const u = [...drivers]; u[i] = { ...u[i], document: e.target.value }; setDrivers(u); }} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Idade</label>
                <Input className="mt-1" placeholder="30" value={d.age} onChange={(e) => { const u = [...drivers]; u[i] = { ...u[i], age: e.target.value }; setDrivers(u); }} />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={() => setDrivers([...drivers, emptyDriver()])}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Condutor
        </Button>
        <FormField control={form.control} name="additional_driver_fee" render={({ field }) => (
          <FormItem><FormLabel>Taxa Condutor Adicional</FormLabel><FormControl><Input placeholder="€ 10/dia" {...field} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⛽ Política de Combustível">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="fuel_policy" render={({ field }) => (
            <FormItem><FormLabel>Política</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="cheio_cheio">Cheio-Cheio</SelectItem>
                  <SelectItem value="cheio_vazio">Cheio-Vazio</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="fuel_penalty" render={({ field }) => (
            <FormItem><FormLabel>Penalidade</FormLabel><FormControl><Input placeholder="Cobrança por litro não reposto" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="fuel_notes" render={({ field }) => (
          <FormItem><FormLabel>Observações de Combustível</FormLabel><FormControl><TextareaWithTemplate placeholder="Posto mais próximo, tipo de combustível..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⚠️ Orientações Importantes">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="required_documents" render={({ field }) => (
            <FormItem><FormLabel>Documentos Obrigatórios</FormLabel><FormControl><TextareaWithTemplate placeholder="CNH válida, passaporte..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="minimum_age" render={({ field }) => (
            <FormItem><FormLabel>Idade Mínima</FormLabel><FormControl><Input placeholder="21 anos" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="international_permit" render={({ field }) => (
            <FormItem><FormLabel>Permissão Internacional (PID)</FormLabel><FormControl><Input placeholder="Sim / Não / Obrigatório" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="emergency_contact" render={({ field }) => (
            <FormItem><FormLabel>Contato de Emergência</FormLabel><FormControl><Input placeholder="+33 1 234 5678" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="traffic_rules" render={({ field }) => (
          <FormItem><FormLabel>Regras de Trânsito</FormLabel><FormControl><TextareaWithTemplate placeholder="Velocidade máxima, pedágios, estacionamento..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações Gerais</FormLabel><FormControl><TextareaWithTemplate placeholder="Informações adicionais..." rows={3} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Voucher / Contrato da Locação" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Transfer Form - Professional module
const transferSchema = z.object({
  transfer_type: z.enum(["arrival", "departure", "inter_hotel"]),
  transfer_mode: z.string().optional(),
  transfer_status: z.string().optional(),
  city: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
  time: z.string().optional(),
  origin_location: z.string().min(2, "Origem é obrigatória"),
  destination_location: z.string().min(2, "Destino é obrigatório"),
  company_name: z.string().optional(),
  reservation_code: z.string().optional(),
  // Arrival
  flight_number: z.string().optional(),
  arrival_time: z.string().optional(),
  arrival_airport: z.string().optional(),
  arrival_terminal: z.string().optional(),
  driver_wait_time: z.string().optional(),
  reception_type: z.string().optional(),
  meeting_instructions: z.string().optional(),
  // Departure
  hotel_departure_time: z.string().optional(),
  departure_flight_time: z.string().optional(),
  departure_airport: z.string().optional(),
  recommended_departure: z.string().optional(),
  boarding_point: z.string().optional(),
  departure_alert: z.string().optional(),
  // Locations
  pickup_address: z.string().optional(),
  pickup_maps_url: z.string().optional(),
  destination_address: z.string().optional(),
  destination_maps_url: z.string().optional(),
  location_notes: z.string().optional(),
  // Driver
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  driver_language: z.string().optional(),
  vehicle_plate: z.string().optional(),
  // Vehicle
  vehicle_type: z.string().optional(),
  vehicle_capacity: z.string().optional(),
  luggage_capacity: z.string().optional(),
  air_conditioning: z.string().optional(),
  accessibility: z.string().optional(),
  vehicle_notes: z.string().optional(),
  // Passengers
  adults_count: z.string().optional(),
  children_count: z.string().optional(),
  // Important
  required_documents: z.string().optional(),
  emergency_contact: z.string().optional(),
  agency_contact: z.string().optional(),
  plan_b: z.string().optional(),
  agency_notes: z.string().optional(),
  notes: z.string().optional(),
});

interface TransferPassengerInput {
  name: string;
  age: string;
  passenger_type: 'adulto' | 'crianca' | 'bebe';
  needs_child_seat: string;
  notes: string;
}

const emptyTransferPassenger = (): TransferPassengerInput => ({
  name: '', age: '', passenger_type: 'adulto', needs_child_seat: 'nao', notes: '',
});

function TransferForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const [files, setFiles] = useState<File[]>([]);
  const [passengers, setPassengers] = useState<TransferPassengerInput[]>(
    defaultValues?.passengers?.length > 0 ? defaultValues.passengers : []
  );

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transfer_type: defaultValues?.transfer_type || "arrival",
      transfer_mode: defaultValues?.transfer_mode || "",
      transfer_status: defaultValues?.transfer_status || "confirmado",
      city: defaultValues?.city || "",
      date: defaultValues?.date ? new Date(defaultValues.date + 'T12:00:00') : undefined,
      time: defaultValues?.time || "",
      origin_location: defaultValues?.origin_location || "",
      destination_location: defaultValues?.destination_location || "",
      company_name: defaultValues?.company_name || "",
      reservation_code: defaultValues?.reservation_code || "",
      flight_number: defaultValues?.flight_number || "",
      arrival_time: defaultValues?.arrival_time || "",
      arrival_airport: defaultValues?.arrival_airport || "",
      arrival_terminal: defaultValues?.arrival_terminal || "",
      driver_wait_time: defaultValues?.driver_wait_time || "",
      reception_type: defaultValues?.reception_type || "",
      meeting_instructions: defaultValues?.meeting_instructions || "",
      hotel_departure_time: defaultValues?.hotel_departure_time || "",
      departure_flight_time: defaultValues?.departure_flight_time || "",
      departure_airport: defaultValues?.departure_airport || "",
      recommended_departure: defaultValues?.recommended_departure || "",
      boarding_point: defaultValues?.boarding_point || "",
      departure_alert: defaultValues?.departure_alert || "",
      pickup_address: defaultValues?.pickup_address || "",
      pickup_maps_url: defaultValues?.pickup_maps_url || "",
      destination_address: defaultValues?.destination_address || "",
      destination_maps_url: defaultValues?.destination_maps_url || "",
      location_notes: defaultValues?.location_notes || "",
      driver_name: defaultValues?.driver_name || "",
      driver_phone: defaultValues?.driver_phone || "",
      driver_language: defaultValues?.driver_language || "",
      vehicle_plate: defaultValues?.vehicle_plate || "",
      vehicle_type: defaultValues?.vehicle_type || "",
      vehicle_capacity: defaultValues?.vehicle_capacity || "",
      luggage_capacity: defaultValues?.luggage_capacity || "",
      air_conditioning: defaultValues?.air_conditioning || "",
      accessibility: defaultValues?.accessibility || "",
      vehicle_notes: defaultValues?.vehicle_notes || "",
      adults_count: defaultValues?.adults_count || "",
      children_count: defaultValues?.children_count || "",
      required_documents: defaultValues?.required_documents || "",
      emergency_contact: defaultValues?.emergency_contact || "",
      agency_contact: defaultValues?.agency_contact || "",
      plan_b: defaultValues?.plan_b || "",
      agency_notes: defaultValues?.agency_notes || "",
      notes: defaultValues?.notes || "",
    },
  });

  const transferType = form.watch("transfer_type");

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    onSubmit(
      {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
        passengers,
        // Legacy compat
        location: `${values.origin_location} → ${values.destination_location}`,
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🚐 Informações Principais" defaultOpen>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="transfer_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Serviço *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="arrival">Transfer IN (Chegada)</SelectItem>
                  <SelectItem value="departure">Transfer OUT (Saída)</SelectItem>
                  <SelectItem value="inter_hotel">Inter-hotel</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="transfer_mode" render={({ field }) => (
            <FormItem>
              <FormLabel>Modalidade</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="privativo">Privativo</SelectItem>
                  <SelectItem value="compartilhado">Compartilhado</SelectItem>
                  <SelectItem value="shuttle">Shuttle</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="transfer_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem *</FormLabel>
              <FormControl><Input placeholder="Aeroporto CDG / Hotel Marriott" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Destino *</FormLabel>
              <FormControl><Input placeholder="Hotel / Aeroporto / Porto" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade / Destino</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="company_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa Receptiva</FormLabel>
              <FormControl><Input placeholder="Civitatis, GetTransfer..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="reservation_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Código da Reserva</FormLabel>
              <FormControl><Input placeholder="TRF-12345" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        {/* === TRANSFER IN (ARRIVAL) === */}
        {(transferType === 'arrival') && (
          <CollapsibleFormSection title="✈️ Detalhes da Chegada (Transfer IN)">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="flight_number" render={({ field }) => (
                <FormItem><FormLabel>Nº do Voo</FormLabel><FormControl><Input placeholder="LA8084" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="arrival_time" render={({ field }) => (
                <FormItem><FormLabel>Horário Previsto de Chegada</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="arrival_airport" render={({ field }) => (
                <FormItem><FormLabel>Aeroporto de Chegada</FormLabel><FormControl><Input placeholder="CDG" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="arrival_terminal" render={({ field }) => (
                <FormItem><FormLabel>Terminal</FormLabel><FormControl><Input placeholder="Terminal 2E" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="driver_wait_time" render={({ field }) => (
                <FormItem><FormLabel>Tempo de Espera do Motorista</FormLabel><FormControl><Input placeholder="1h após pouso" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="reception_type" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Recepção</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="placa">Com placa / nome</SelectItem>
                      <SelectItem value="balcao">Balcão da empresa</SelectItem>
                      <SelectItem value="ponto_fixo">Ponto fixo de encontro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="meeting_instructions" render={({ field }) => (
              <FormItem><FormLabel>Onde encontrar o motorista *</FormLabel><FormControl><TextareaWithTemplate placeholder="Ex: Saída do desembarque, portão B, motorista com placa com seu nome" rows={3} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
            )} />
          </CollapsibleFormSection>
        )}

        {/* === TRANSFER OUT (DEPARTURE) === */}
        {(transferType === 'departure') && (
          <CollapsibleFormSection title="🧳 Detalhes da Saída (Transfer OUT)">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="hotel_departure_time" render={({ field }) => (
                <FormItem><FormLabel>Horário de Saída do Hotel</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="departure_flight_time" render={({ field }) => (
                <FormItem><FormLabel>Horário do Voo</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="departure_airport" render={({ field }) => (
                <FormItem><FormLabel>Aeroporto</FormLabel><FormControl><Input placeholder="GRU" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="recommended_departure" render={({ field }) => (
                <FormItem><FormLabel>Saída Recomendada</FormLabel><FormControl><Input placeholder="4h antes do voo" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="boarding_point" render={({ field }) => (
                <FormItem><FormLabel>Ponto de Embarque</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="lobby">Lobby / Recepção</SelectItem>
                      <SelectItem value="entrada">Entrada Principal</SelectItem>
                      <SelectItem value="estacionamento">Estacionamento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="departure_alert" render={({ field }) => (
              <FormItem><FormLabel>Alerta ao Passageiro</FormLabel><FormControl><Input placeholder="Esteja no lobby com 10 minutos de antecedência" {...field} /></FormControl></FormItem>
            )} />
          </CollapsibleFormSection>
        )}

        <CollapsibleFormSection title="📍 Locais de Embarque e Desembarque">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_address" render={({ field }) => (
            <FormItem><FormLabel>Endereço de Embarque</FormLabel><FormControl><Input placeholder="Endereço completo" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="pickup_maps_url" render={({ field }) => (
            <FormItem><FormLabel>Google Maps (Embarque)</FormLabel><FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="destination_address" render={({ field }) => (
            <FormItem><FormLabel>Endereço de Destino</FormLabel><FormControl><Input placeholder="Endereço completo" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="destination_maps_url" render={({ field }) => (
            <FormItem><FormLabel>Google Maps (Destino)</FormLabel><FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="location_notes" render={({ field }) => (
          <FormItem><FormLabel>Observações Logísticas</FormLabel><FormControl><TextareaWithTemplate placeholder="Ex: acesso restrito, portaria lateral..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👤 Motorista e Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="driver_name" render={({ field }) => (
            <FormItem><FormLabel>Nome do Motorista</FormLabel><FormControl><Input placeholder="Carlos" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="driver_phone" render={({ field }) => (
            <FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input placeholder="+33 6 1234 5678" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="driver_language" render={({ field }) => (
            <FormItem><FormLabel>Idioma do Motorista</FormLabel><FormControl><Input placeholder="Inglês, Espanhol" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="vehicle_plate" render={({ field }) => (
            <FormItem><FormLabel>Placa do Veículo</FormLabel><FormControl><Input placeholder="AB-123-CD" {...field} /></FormControl></FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🚗 Detalhes do Veículo">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="vehicle_type" render={({ field }) => (
            <FormItem><FormLabel>Tipo de Veículo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="minibus">Micro-ônibus</SelectItem>
                  <SelectItem value="onibus">Ônibus</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="vehicle_capacity" render={({ field }) => (
            <FormItem><FormLabel>Capacidade de Passageiros</FormLabel><FormControl><Input placeholder="4" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="luggage_capacity" render={({ field }) => (
            <FormItem><FormLabel>Capacidade de Bagagem</FormLabel><FormControl><Input placeholder="3 malas" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="air_conditioning" render={({ field }) => (
            <FormItem><FormLabel>Ar-condicionado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="accessibility" render={({ field }) => (
            <FormItem><FormLabel>Acessibilidade</FormLabel><FormControl><Input placeholder="Cadeirante, etc." {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="vehicle_notes" render={({ field }) => (
            <FormItem><FormLabel>Observações do Veículo</FormLabel><FormControl><Input placeholder="Wi-Fi, água..." {...field} /></FormControl></FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👨‍👩‍👧 Passageiros">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="adults_count" render={({ field }) => (
            <FormItem><FormLabel>Adultos</FormLabel><FormControl><Input placeholder="2" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="children_count" render={({ field }) => (
            <FormItem><FormLabel>Crianças / Bebês</FormLabel><FormControl><Input placeholder="1" {...field} /></FormControl></FormItem>
          )} />
        </div>
        {passengers.map((p, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Passageiro {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3 mr-1" /> Remover
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input className="mt-1" placeholder="Nome completo" value={p.name} onChange={(e) => { const u = [...passengers]; u[i] = { ...u[i], name: e.target.value }; setPassengers(u); }} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={p.passenger_type} onValueChange={(v: any) => { const u = [...passengers]; u[i] = { ...u[i], passenger_type: v }; setPassengers(u); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adulto">Adulto</SelectItem>
                    <SelectItem value="crianca">Criança</SelectItem>
                    <SelectItem value="bebe">Bebê</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cadeirinha</label>
                <Select value={p.needs_child_seat} onValueChange={(v) => { const u = [...passengers]; u[i] = { ...u[i], needs_child_seat: v }; setPassengers(u); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={() => setPassengers([...passengers, emptyTransferPassenger()])}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Passageiro
        </Button>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⚠️ Orientações Importantes">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="required_documents" render={({ field }) => (
            <FormItem><FormLabel>Documentos Obrigatórios</FormLabel><FormControl><TextareaWithTemplate placeholder="Passaporte, voucher impresso..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="emergency_contact" render={({ field }) => (
            <FormItem><FormLabel>Contato de Emergência</FormLabel><FormControl><Input placeholder="+33 1 234 5678" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="agency_contact" render={({ field }) => (
            <FormItem><FormLabel>Contato da Agência</FormLabel><FormControl><Input placeholder="+55 11 99999-9999" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="plan_b" render={({ field }) => (
            <FormItem><FormLabel>Plano B (atraso de voo, etc.)</FormLabel><FormControl><TextareaWithTemplate placeholder="Em caso de atraso, ligar para..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="agency_notes" render={({ field }) => (
          <FormItem><FormLabel>Observações da Agência</FormLabel><FormControl><TextareaWithTemplate placeholder="Informações adicionais para o passageiro..." rows={3} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações Gerais</FormLabel><FormControl><TextareaWithTemplate placeholder="Notas gerais..." rows={2} {...field} onValueChange={field.onChange} /></FormControl></FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Voucher / Confirmação do Transfer" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Attraction Form - Professional module
const attractionSchema = z.object({
  name: z.string().min(2, "Nome da atração é obrigatório"),
  attraction_type: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
  status: z.string().optional(),
  quantity: z.number().min(1, "Mínimo 1 ingresso"),
  entry_time: z.string().optional(),
  usage_window: z.string().optional(),
  duration: z.string().optional(),
  access_type: z.string().optional(),
  requires_reservation: z.string().optional(),
  usage_instructions: z.string().optional(),
  ticket_code: z.string().optional(),
  confirmation_code: z.string().optional(),
  order_number: z.string().optional(),
  address: z.string().optional(),
  venue_name: z.string().optional(),
  maps_url: z.string().optional(),
  entry_point: z.string().optional(),
  cancellation_policy: z.string().optional(),
  change_policy: z.string().optional(),
  attraction_rules: z.string().optional(),
  prohibited_items: z.string().optional(),
  dress_code: z.string().optional(),
  required_documents: z.string().optional(),
  agency_tips: z.string().optional(),
  attraction_contact: z.string().optional(),
  operator_contact: z.string().optional(),
  agency_contact: z.string().optional(),
  emergency_contact: z.string().optional(),
  agency_notes: z.string().optional(),
});

interface AttractionPassengerInput {
  name: string;
  ticket_type: 'adulto' | 'crianca' | 'senior';
  document: string;
  notes: string;
}

function AttractionForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);
  const [passengers, setPassengers] = useState<AttractionPassengerInput[]>(defaultValues?.passengers || []);
  const [newPax, setNewPax] = useState<AttractionPassengerInput>({ name: '', ticket_type: 'adulto', document: '', notes: '' });
  const [isEditingPax, setIsEditingPax] = useState(false);

  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      attraction_type: defaultValues?.attraction_type || "",
      city: defaultValues?.city || "",
      country: defaultValues?.country || "",
      status: defaultValues?.status || "confirmado",
      quantity: defaultValues?.quantity || 1,
      entry_time: defaultValues?.entry_time || "",
      usage_window: defaultValues?.usage_window || "",
      duration: defaultValues?.duration || "",
      access_type: defaultValues?.access_type || "",
      requires_reservation: defaultValues?.requires_reservation || "",
      usage_instructions: defaultValues?.usage_instructions || "",
      ticket_code: defaultValues?.ticket_code || "",
      confirmation_code: defaultValues?.confirmation_code || "",
      order_number: defaultValues?.order_number || "",
      address: defaultValues?.address || "",
      venue_name: defaultValues?.venue_name || "",
      maps_url: defaultValues?.maps_url || "",
      entry_point: defaultValues?.entry_point || "",
      cancellation_policy: defaultValues?.cancellation_policy || "",
      change_policy: defaultValues?.change_policy || "",
      attraction_rules: defaultValues?.attraction_rules || "",
      prohibited_items: defaultValues?.prohibited_items || "",
      dress_code: defaultValues?.dress_code || "",
      required_documents: defaultValues?.required_documents || "",
      agency_tips: defaultValues?.agency_tips || "",
      attraction_contact: defaultValues?.attraction_contact || "",
      operator_contact: defaultValues?.operator_contact || "",
      agency_contact: defaultValues?.agency_contact || "",
      emergency_contact: defaultValues?.emergency_contact || "",
      agency_notes: defaultValues?.agency_notes || "",
      ...(defaultValues?.date ? { date: parseLocal(defaultValues.date) } : {}),
    },
  });

  const addPassenger = () => {
    if (!newPax.name.trim()) return;
    setPassengers([...passengers, { ...newPax }]);
    setNewPax({ name: '', ticket_type: 'adulto', document: '', notes: '' });
    setIsEditingPax(false);
  };

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    onSubmit(
      {
        name: values.name,
        attraction_type: values.attraction_type || "",
        city: values.city || "",
        country: values.country || "",
        date: format(values.date, "yyyy-MM-dd"),
        status: values.status || "",
        quantity: values.quantity,
        entry_time: values.entry_time || "",
        usage_window: values.usage_window || "",
        duration: values.duration || "",
        access_type: values.access_type || "",
        requires_reservation: values.requires_reservation || "",
        usage_instructions: values.usage_instructions || "",
        ticket_code: values.ticket_code || "",
        confirmation_code: values.confirmation_code || "",
        order_number: values.order_number || "",
        address: values.address || "",
        venue_name: values.venue_name || "",
        maps_url: values.maps_url || "",
        entry_point: values.entry_point || "",
        passengers,
        cancellation_policy: values.cancellation_policy || "",
        change_policy: values.change_policy || "",
        attraction_rules: values.attraction_rules || "",
        prohibited_items: values.prohibited_items || "",
        dress_code: values.dress_code || "",
        required_documents: values.required_documents || "",
        agency_tips: values.agency_tips || "",
        attraction_contact: values.attraction_contact || "",
        operator_contact: values.operator_contact || "",
        agency_contact: values.agency_contact || "",
        emergency_contact: values.emergency_contact || "",
        agency_notes: values.agency_notes || "",
        notes: values.agency_notes || "",
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🎟️ Informações Principais" defaultOpen>

        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Atração / Experiência *</FormLabel>
            <FormControl><Input placeholder="Walt Disney World, Torre Eiffel, Coliseu..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="attraction_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Experiência</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="parque">🎢 Parque</SelectItem>
                  <SelectItem value="show">🎭 Show / Espetáculo</SelectItem>
                  <SelectItem value="passeio">🚤 Passeio</SelectItem>
                  <SelectItem value="museu">🏛️ Museu</SelectItem>
                  <SelectItem value="tour">🗺️ Tour Guiado</SelectItem>
                  <SelectItem value="evento">📅 Evento</SelectItem>
                  <SelectItem value="experiencia">✨ Experiência</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmado">✅ Confirmado</SelectItem>
                  <SelectItem value="reservado">📅 Reservado</SelectItem>
                  <SelectItem value="flexivel">🔄 Flexível</SelectItem>
                  <SelectItem value="utilizado">☑️ Utilizado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input placeholder="Orlando, Paris..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem>
              <FormLabel>País</FormLabel>
              <FormControl><Input placeholder="EUA, França..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
              <FormLabel>Qtd. Ingressos *</FormLabel>
              <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data de Uso *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📅 Detalhes de Uso">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="entry_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Entrada</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="usage_window" render={({ field }) => (
            <FormItem>
              <FormLabel>Janela de Uso</FormLabel>
              <FormControl><Input placeholder="Entre 9h e 18h" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel>Duração Estimada</FormLabel>
              <FormControl><Input placeholder="4 horas, dia inteiro..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="access_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Acesso</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="1_dia">1 Dia</SelectItem>
                  <SelectItem value="multi_day">Multi-Day</SelectItem>
                  <SelectItem value="open_date">Data Aberta</SelectItem>
                  <SelectItem value="horario_marcado">Horário Marcado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="requires_reservation" render={({ field }) => (
            <FormItem>
              <FormLabel>Necessita Reserva?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="recomendado">Recomendado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="usage_instructions" render={({ field }) => (
          <FormItem>
            <FormLabel>Instruções Importantes de Uso</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Como usar o ingresso, onde apresentar, regras de entrada..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📱 Códigos do Ingresso">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="ticket_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Código do Ingresso</FormLabel>
              <FormControl><Input placeholder="ABC-123-XYZ" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmation_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Código de Confirmação</FormLabel>
              <FormControl><Input placeholder="CONF-456" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="order_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Nº do Pedido</FormLabel>
              <FormControl><Input placeholder="#789012" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📍 Localização">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="venue_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Local</FormLabel>
              <FormControl><Input placeholder="Magic Kingdom, Louvre Museum..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="entry_point" render={({ field }) => (
            <FormItem>
              <FormLabel>Ponto de Entrada</FormLabel>
              <FormControl><Input placeholder="Portão principal, Gate B..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço Completo</FormLabel>
            <FormControl><Input placeholder="Endereço da atração" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="maps_url" render={({ field }) => (
          <FormItem>
            <FormLabel>Google Maps</FormLabel>
            <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👨‍👩‍👧 Passageiros">

        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
              <span className="flex-1">
                {p.name} ({p.ticket_type === 'adulto' ? 'Adulto' : p.ticket_type === 'crianca' ? 'Criança' : 'Senior'})
                {p.document ? ` • ${p.document}` : ''}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewPax({ ...p }); setPassengers(passengers.filter((_, idx) => idx !== i)); setIsEditingPax(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Nome *" value={newPax.name} onChange={(e) => setNewPax({ ...newPax, name: e.target.value })} />
            <Select value={newPax.ticket_type} onValueChange={(v: any) => setNewPax({ ...newPax, ticket_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="crianca">Criança</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Documento (se necessário)" value={newPax.document} onChange={(e) => setNewPax({ ...newPax, document: e.target.value })} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
            {isEditingPax ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro</>}
          </Button>
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📌 Regras e Políticas">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="cancellation_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Cancelamento</FormLabel>
              <FormControl><Input placeholder="Cancelamento gratuito até 24h..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="change_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Alteração</FormLabel>
              <FormControl><Input placeholder="Permite reagendamento..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="attraction_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras da Atração</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Regras de uso, altura mínima, restrições..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="prohibited_items" render={({ field }) => (
            <FormItem>
              <FormLabel>Itens Proibidos</FormLabel>
              <FormControl><Input placeholder="Câmeras, alimentos, bagagens..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dress_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Dress Code</FormLabel>
              <FormControl><Input placeholder="Roupas confortáveis, calçado fechado..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="required_documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Documentos Necessários</FormLabel>
            <FormControl><Input placeholder="Passaporte, documento com foto..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧠 Dicas do Agente de Viagem">

        <FormField control={form.control} name="agency_tips" render={({ field }) => (
          <FormItem>
            <FormLabel>Dicas Exclusivas</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Melhor horário para visitar, como evitar filas, dicas de alimentação no local..." rows={4} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📞 Contatos de Suporte">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="attraction_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato da Atração</FormLabel>
              <FormControl><Input placeholder="Telefone / site da atração" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="operator_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato da Operadora</FormLabel>
              <FormControl><Input placeholder="Telefone / e-mail da operadora" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="agency_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato da Agência</FormLabel>
              <FormControl><Input placeholder="WhatsApp da agência" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="emergency_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato de Emergência</FormLabel>
              <FormControl><Input placeholder="Telefone de emergência" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="agency_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações da Agência</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Observações adicionais para o cliente..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Voucher / Ingresso (PDF ou Imagem)" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Insurance Form - Premium
const insuranceSchema = z.object({
  provider: z.string().min(2, "Seguradora é obrigatória"),
  plan_name: z.string().optional(),
  policy_number: z.string().optional(),
  destination_covered: z.string().optional(),
  coverage_type: z.string().optional(),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  status: z.string().optional(),
  medical_assistance: z.string().optional(),
  hospital_expenses: z.string().optional(),
  lost_baggage: z.string().optional(),
  trip_cancellation: z.string().optional(),
  trip_interruption: z.string().optional(),
  dental_assistance: z.string().optional(),
  medical_repatriation: z.string().optional(),
  covid_coverage: z.string().optional(),
  coverage: z.string().optional(),
  emergency_phone: z.string().optional(),
  emergency_whatsapp: z.string().optional(),
  emergency_email: z.string().optional(),
  emergency_24h: z.string().optional(),
  emergency_languages: z.string().optional(),
  insurer_website: z.string().optional(),
  how_to_activate: z.string().optional(),
  required_documents_claim: z.string().optional(),
  hospital_procedure: z.string().optional(),
  reimbursement_info: z.string().optional(),
  trip_purpose: z.string().optional(),
  special_activities: z.string().optional(),
  coverage_observations: z.string().optional(),
  agency_tips: z.string().optional(),
  agency_notes: z.string().optional(),
  agency_contact: z.string().optional(),
  emergency_contact_agency: z.string().optional(),
  notes: z.string().optional(),
});

interface InsuredPersonInput {
  name: string;
  birth_date: string;
  document: string;
  coverage_type: 'individual' | 'familiar' | '';
  notes: string;
}

const emptyInsured = (): InsuredPersonInput => ({ name: '', birth_date: '', document: '', coverage_type: '', notes: '' });

function InsuranceForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);
  const [insuredPersons, setInsuredPersons] = useState<InsuredPersonInput[]>(
    defaultValues?.insured_persons?.length > 0 ? defaultValues.insured_persons : []
  );
  const [newInsured, setNewInsured] = useState<InsuredPersonInput>(emptyInsured());
  const [isEditingInsured, setIsEditingInsured] = useState(false);

  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      provider: defaultValues?.provider || "",
      plan_name: defaultValues?.plan_name || "",
      policy_number: defaultValues?.policy_number || "",
      destination_covered: defaultValues?.destination_covered || "",
      coverage_type: defaultValues?.coverage_type || "",
      status: defaultValues?.status || "ativo",
      medical_assistance: defaultValues?.medical_assistance || "",
      hospital_expenses: defaultValues?.hospital_expenses || "",
      lost_baggage: defaultValues?.lost_baggage || "",
      trip_cancellation: defaultValues?.trip_cancellation || "",
      trip_interruption: defaultValues?.trip_interruption || "",
      dental_assistance: defaultValues?.dental_assistance || "",
      medical_repatriation: defaultValues?.medical_repatriation || "",
      covid_coverage: defaultValues?.covid_coverage || "",
      coverage: defaultValues?.coverage || "",
      emergency_phone: defaultValues?.emergency_phone || "",
      emergency_whatsapp: defaultValues?.emergency_whatsapp || "",
      emergency_email: defaultValues?.emergency_email || "",
      emergency_24h: defaultValues?.emergency_24h || "",
      emergency_languages: defaultValues?.emergency_languages || "",
      insurer_website: defaultValues?.insurer_website || "",
      how_to_activate: defaultValues?.how_to_activate || "",
      required_documents_claim: defaultValues?.required_documents_claim || "",
      hospital_procedure: defaultValues?.hospital_procedure || "",
      reimbursement_info: defaultValues?.reimbursement_info || "",
      trip_purpose: defaultValues?.trip_purpose || "",
      special_activities: defaultValues?.special_activities || "",
      coverage_observations: defaultValues?.coverage_observations || "",
      agency_tips: defaultValues?.agency_tips || "",
      agency_notes: defaultValues?.agency_notes || "",
      agency_contact: defaultValues?.agency_contact || "",
      emergency_contact_agency: defaultValues?.emergency_contact_agency || "",
      notes: defaultValues?.notes || "",
      ...(defaultValues?.start_date ? { start_date: parseLocal(defaultValues.start_date) } : {}),
      ...(defaultValues?.end_date ? { end_date: parseLocal(defaultValues.end_date) } : {}),
    },
  });

  const addInsured = () => {
    if (!newInsured.name.trim()) return;
    setInsuredPersons([...insuredPersons, { ...newInsured }]);
    setNewInsured(emptyInsured());
    setIsEditingInsured(false);
  };

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    onSubmit(
      {
        ...values,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        insured_persons: insuredPersons,
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🛡️ Informações Principais" defaultOpen>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="provider" render={({ field }) => (
            <FormItem>
              <FormLabel>Seguradora *</FormLabel>
              <FormControl><Input placeholder="Assist Card, Travel Ace..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="plan_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Plano</FormLabel>
              <FormControl><Input placeholder="AC 150 Mundo" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="policy_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número da Apólice</FormLabel>
              <FormControl><Input placeholder="POL-2025-123456" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ativo">✅ Ativo</SelectItem>
                  <SelectItem value="futuro">📅 Futuro</SelectItem>
                  <SelectItem value="expirado">❌ Expirado</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="destination_covered" render={({ field }) => (
            <FormItem>
              <FormLabel>Destino Coberto</FormLabel>
              <FormControl><Input placeholder="Europa, Mundo, América do Norte..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="coverage_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cobertura</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="internacional">Internacional</SelectItem>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="schengen">Schengen</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Início da Cobertura *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Término da Cobertura *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🏥 Coberturas do Seguro">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="medical_assistance" render={({ field }) => (
            <FormItem>
              <FormLabel>Assistência Médica</FormLabel>
              <FormControl><Input placeholder="USD 60.000" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="hospital_expenses" render={({ field }) => (
            <FormItem>
              <FormLabel>Despesas Hospitalares</FormLabel>
              <FormControl><Input placeholder="USD 60.000" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="lost_baggage" render={({ field }) => (
            <FormItem>
              <FormLabel>Bagagem Extraviada</FormLabel>
              <FormControl><Input placeholder="USD 1.200" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="trip_cancellation" render={({ field }) => (
            <FormItem>
              <FormLabel>Cancelamento de Viagem</FormLabel>
              <FormControl><Input placeholder="USD 5.000" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="trip_interruption" render={({ field }) => (
            <FormItem>
              <FormLabel>Interrupção de Viagem</FormLabel>
              <FormControl><Input placeholder="USD 5.000" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="dental_assistance" render={({ field }) => (
            <FormItem>
              <FormLabel>Assistência Odontológica</FormLabel>
              <FormControl><Input placeholder="USD 500" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="medical_repatriation" render={({ field }) => (
            <FormItem>
              <FormLabel>Repatriação Sanitária</FormLabel>
              <FormControl><Input placeholder="USD 30.000" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="covid_coverage" render={({ field }) => (
            <FormItem>
              <FormLabel>Cobertura COVID</FormLabel>
              <FormControl><Input placeholder="USD 10.000 ou N/A" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="coverage" render={({ field }) => (
          <FormItem>
            <FormLabel>Cobertura Geral (resumo)</FormLabel>
            <FormControl><Input placeholder="USD 60.000 - Cobertura Mundial" {...field} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📞 Contatos de Emergência">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="emergency_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone de Emergência Internacional</FormLabel>
              <FormControl><Input placeholder="+55 11 99999-9999" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="emergency_whatsapp" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp da Seguradora</FormLabel>
              <FormControl><Input placeholder="+55 11 99999-9999" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="emergency_email" render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail de Assistência</FormLabel>
              <FormControl><Input placeholder="assistencia@seguradora.com" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="emergency_24h" render={({ field }) => (
            <FormItem>
              <FormLabel>Atendimento 24h?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="sim">✅ Sim</SelectItem>
                  <SelectItem value="nao">❌ Não</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="emergency_languages" render={({ field }) => (
            <FormItem>
              <FormLabel>Idiomas de Atendimento</FormLabel>
              <FormControl><Input placeholder="Português, Inglês, Espanhol" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="insurer_website" render={({ field }) => (
            <FormItem>
              <FormLabel>Site da Seguradora</FormLabel>
              <FormControl><Input placeholder="https://www.seguradora.com" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🆘 O que Fazer em Emergência">

        <FormField control={form.control} name="how_to_activate" render={({ field }) => (
          <FormItem>
            <FormLabel>Como Acionar o Seguro</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="1. Ligue para a central 24h&#10;2. Informe o número da apólice&#10;3. Descreva a situação..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="required_documents_claim" render={({ field }) => (
          <FormItem>
            <FormLabel>Documentos Necessários</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Apólice, passaporte, relatório médico..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="hospital_procedure" render={({ field }) => (
          <FormItem>
            <FormLabel>Procedimento Hospitalar</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Em caso de internação, entre em contato com a central antes..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="reimbursement_info" render={({ field }) => (
          <FormItem>
            <FormLabel>Reembolso (se aplicável)</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Guardar todos os comprovantes originais..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👨‍👩‍👧 Segurados">

        {insuredPersons.map((p, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
            <span className="flex-1">{p.name}{p.coverage_type ? ` (${p.coverage_type === 'individual' ? 'Individual' : 'Familiar'})` : ''}{p.birth_date ? ` • ${p.birth_date}` : ''}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewInsured({ ...p }); setInsuredPersons(insuredPersons.filter((_, idx) => idx !== i)); setIsEditingInsured(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInsuredPersons(insuredPersons.filter((_, idx) => idx !== i))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nome completo" value={newInsured.name} onChange={(e) => setNewInsured({ ...newInsured, name: e.target.value })} />
            <Input type="date" placeholder="Data de nascimento" value={newInsured.birth_date} onChange={(e) => setNewInsured({ ...newInsured, birth_date: e.target.value })} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Documento (opcional)" value={newInsured.document} onChange={(e) => setNewInsured({ ...newInsured, document: e.target.value })} />
            <Select value={newInsured.coverage_type} onValueChange={(v: any) => setNewInsured({ ...newInsured, coverage_type: v })}>
              <SelectTrigger><SelectValue placeholder="Tipo de cobertura" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="familiar">Familiar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Observações (opcional)" value={newInsured.notes} onChange={(e) => setNewInsured({ ...newInsured, notes: e.target.value })} />
          <Button type="button" variant="outline" size="sm" onClick={addInsured}>
            {isEditingInsured ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar Segurado</>}
          </Button>
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧳 Dados da Viagem">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="trip_purpose" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Viagem</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="lazer">Lazer</SelectItem>
                  <SelectItem value="negocios">Negócios</SelectItem>
                  <SelectItem value="intercambio">Intercâmbio</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="special_activities" render={({ field }) => (
            <FormItem>
              <FormLabel>Esportes / Atividades Especiais</FormLabel>
              <FormControl><Input placeholder="Ski, Mergulho, Trilhas..." {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="coverage_observations" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações da Cobertura</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Detalhes específicos da cobertura..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🧠 Dicas da Agência">

        <FormField control={form.control} name="agency_tips" render={({ field }) => (
          <FormItem>
            <FormLabel>Orientações do Agente</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Quando acionar o seguro, dicas sobre hospitais no destino, diferença entre reembolso e atendimento direto..." rows={4} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="agency_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato da Agência (WhatsApp)</FormLabel>
              <FormControl><Input placeholder="+55 11 99999-9999" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="emergency_contact_agency" render={({ field }) => (
            <FormItem>
              <FormLabel>Emergência da Agência</FormLabel>
              <FormControl><Input placeholder="+55 11 99999-9999" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="agency_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações adicionais..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Apólice / Voucher do Seguro" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Cruise Form
const cruiseSchema = z.object({
  cruise_company: z.string().min(2, "Companhia marítima é obrigatória"),
  ship_name: z.string().min(2, "Nome do navio é obrigatório"),
  route: z.string().min(2, "Rota é obrigatória"),
  embarkation_port: z.string().min(2, "Porto de embarque é obrigatório"),
  disembarkation_port: z.string().optional(),
  start_date: z.date({ required_error: "Data embarque é obrigatória" }),
  end_date: z.date({ required_error: "Data desembarque é obrigatória" }),
  booking_number: z.string().optional(),
  cabin_type: z.string().optional(),
  cabin_number: z.string().optional(),
  cabin_category: z.string().optional(),
  deck: z.string().optional(),
  occupancy: z.string().optional(),
  meal_plan: z.string().optional(),
  checkin_url: z.string().optional(),
  checkin_status: z.string().optional(),
  checkin_deadline: z.string().optional(),
  boarding_terminal: z.string().optional(),
  port_address: z.string().optional(),
  port_maps_url: z.string().optional(),
  recommended_arrival: z.string().optional(),
  required_documents: z.string().optional(),
  baggage_policy: z.string().optional(),
  dress_code: z.string().optional(),
  company_rules: z.string().optional(),
  boarding_notes: z.string().optional(),
  onboard_currency: z.string().optional(),
  onboard_language: z.string().optional(),
  voltage: z.string().optional(),
  ship_website: z.string().optional(),
});

function CruiseForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);
  const [passengers, setPassengers] = useState<{ name: string; birth_date?: string; document?: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPaxName, setNewPaxName] = useState("");
  const [newPaxBirth, setNewPaxBirth] = useState("");
  const [newPaxDoc, setNewPaxDoc] = useState("");
  const [newPaxNotes, setNewPaxNotes] = useState("");
  const [isEditingPax, setIsEditingPax] = useState(false);

  const [itinerary, setItinerary] = useState<{ date: string; port: string; arrival_time: string; departure_time: string; stop_type: string; notes: string }[]>(
    defaultValues?.itinerary || []
  );
  const [itDate, setItDate] = useState("");
  const [itPort, setItPort] = useState("");
  const [itArrival, setItArrival] = useState("");
  const [itDeparture, setItDeparture] = useState("");
  const [itType, setItType] = useState("parada");
  const [itNotes, setItNotes] = useState("");

  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: {
      cruise_company: defaultValues?.cruise_company || "",
      ship_name: defaultValues?.ship_name || "",
      route: defaultValues?.route || "",
      embarkation_port: defaultValues?.embarkation_port || "",
      disembarkation_port: defaultValues?.disembarkation_port || "",
      booking_number: defaultValues?.booking_number || "",
      cabin_type: defaultValues?.cabin_type || "",
      cabin_number: defaultValues?.cabin_number || "",
      cabin_category: defaultValues?.cabin_category || "",
      deck: defaultValues?.deck || "",
      occupancy: defaultValues?.occupancy || "",
      meal_plan: defaultValues?.meal_plan || "",
      checkin_url: defaultValues?.checkin_url || "",
      checkin_status: defaultValues?.checkin_status || "pendente",
      checkin_deadline: defaultValues?.checkin_deadline || "",
      boarding_terminal: defaultValues?.boarding_terminal || "",
      port_address: defaultValues?.port_address || "",
      port_maps_url: defaultValues?.port_maps_url || "",
      recommended_arrival: defaultValues?.recommended_arrival || "",
      required_documents: defaultValues?.required_documents || "",
      baggage_policy: defaultValues?.baggage_policy || "",
      dress_code: defaultValues?.dress_code || "",
      company_rules: defaultValues?.company_rules || "",
      boarding_notes: defaultValues?.boarding_notes || "",
      onboard_currency: defaultValues?.onboard_currency || "",
      onboard_language: defaultValues?.onboard_language || "",
      voltage: defaultValues?.voltage || "",
      ship_website: defaultValues?.ship_website || "",
      ...(defaultValues?.start_date ? { start_date: parseLocal(defaultValues.start_date) } : {}),
      ...(defaultValues?.end_date ? { end_date: parseLocal(defaultValues.end_date) } : {}),
    },
  });

  const addPassenger = () => {
    if (!newPaxName.trim()) return;
    setPassengers([...passengers, { name: newPaxName.trim(), birth_date: newPaxBirth || undefined, document: newPaxDoc || undefined, notes: newPaxNotes || undefined }]);
    setNewPaxName(""); setNewPaxBirth(""); setNewPaxDoc(""); setNewPaxNotes("");
    setIsEditingPax(false);
  };

  const addItineraryStop = () => {
    if (!itPort.trim()) return;
    setItinerary([...itinerary, { date: itDate, port: itPort.trim(), arrival_time: itArrival, departure_time: itDeparture, stop_type: itType, notes: itNotes }]);
    setItDate(""); setItPort(""); setItArrival(""); setItDeparture(""); setItType("parada"); setItNotes("");
  };

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    onSubmit(
      {
        cruise_company: values.cruise_company,
        ship_name: values.ship_name,
        route: values.route,
        embarkation_port: values.embarkation_port,
        disembarkation_port: values.disembarkation_port || "",
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        booking_number: values.booking_number || "",
        cabin_type: values.cabin_type || "",
        cabin_number: values.cabin_number || "",
        cabin_category: values.cabin_category || "",
        deck: values.deck || "",
        occupancy: values.occupancy || "",
        meal_plan: values.meal_plan || "",
        passengers,
        itinerary,
        checkin_url: values.checkin_url || "",
        checkin_status: values.checkin_status || "pendente",
        checkin_deadline: values.checkin_deadline || "",
        boarding_terminal: values.boarding_terminal || "",
        port_address: values.port_address || "",
        port_maps_url: values.port_maps_url || "",
        recommended_arrival: values.recommended_arrival || "",
        required_documents: values.required_documents || "",
        baggage_policy: values.baggage_policy || "",
        dress_code: values.dress_code || "",
        company_rules: values.company_rules || "",
        boarding_notes: values.boarding_notes || "",
        onboard_currency: values.onboard_currency || "",
        onboard_language: values.onboard_language || "",
        voltage: values.voltage || "",
        ship_website: values.ship_website || "",
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🚢 Informações do Cruzeiro" defaultOpen>

        <FormField control={form.control} name="cruise_company" render={({ field }) => (
          <FormItem>
            <FormLabel>Companhia Marítima *</FormLabel>
            <FormControl><Input placeholder="MSC, Royal Caribbean, Costa..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="ship_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Navio *</FormLabel>
              <FormControl><Input placeholder="MSC Seaview" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="booking_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Código da Reserva</FormLabel>
              <FormControl><Input placeholder="BK-123456" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="route" render={({ field }) => (
          <FormItem>
            <FormLabel>Roteiro *</FormLabel>
            <FormControl><Input placeholder="Caribe, Mediterrâneo, América do Sul..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="embarkation_port" render={({ field }) => (
            <FormItem>
              <FormLabel>Porto de Embarque *</FormLabel>
              <FormControl><Input placeholder="Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="disembarkation_port" render={({ field }) => (
            <FormItem>
              <FormLabel>Porto de Desembarque</FormLabel>
              <FormControl><Input placeholder="Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Embarque *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Desembarque *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🛏 Dados da Cabine">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="cabin_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cabine</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="externa">Externa</SelectItem>
                  <SelectItem value="varanda">Varanda</SelectItem>
                  <SelectItem value="suite">Suíte</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="cabin_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número da Cabine</FormLabel>
              <FormControl><Input placeholder="8042" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="cabin_category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl><Input placeholder="Fantastica, Yacht Club..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deck" render={({ field }) => (
            <FormItem>
              <FormLabel>Deck (Andar)</FormLabel>
              <FormControl><Input placeholder="Deck 9" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="occupancy" render={({ field }) => (
            <FormItem>
              <FormLabel>Ocupação</FormLabel>
              <FormControl><Input placeholder="2 adultos + 1 criança" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="meal_plan" render={({ field }) => (
          <FormItem>
            <FormLabel>Regime de Alimentação</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pensao_completa">Pensão Completa</SelectItem>
                <SelectItem value="all_inclusive">All Inclusive</SelectItem>
                <SelectItem value="meia_pensao">Meia Pensão</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👥 Passageiros">

        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="flex-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.birth_date && <span className="text-muted-foreground"> • {p.birth_date}</span>}
                {p.document && <span className="text-muted-foreground"> • {p.document}</span>}
                {p.notes && <span className="text-muted-foreground italic"> • {p.notes}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewPaxName(p.name); setNewPaxBirth(p.birth_date || ''); setNewPaxDoc(p.document || ''); setNewPaxNotes(p.notes || ''); setPassengers(passengers.filter((_, idx) => idx !== i)); setIsEditingPax(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nome completo *" value={newPaxName} onChange={(e) => setNewPaxName(e.target.value)} />
            <Input placeholder="Data de nascimento" value={newPaxBirth} onChange={(e) => setNewPaxBirth(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Documento" value={newPaxDoc} onChange={(e) => setNewPaxDoc(e.target.value)} />
            <Input placeholder="Observações" value={newPaxNotes} onChange={(e) => setNewPaxNotes(e.target.value)} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
            {isEditingPax ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro</>}
          </Button>
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="🗺 Roteiro do Cruzeiro">

        <div className="space-y-2">
          {itinerary.map((stop, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="flex-1 text-sm">
                <span className="font-medium">{stop.date ? `${stop.date} – ` : ''}{stop.port}</span>
                <span className="text-muted-foreground"> ({stop.stop_type === 'embarque' ? 'Embarque' : stop.stop_type === 'navegacao' ? 'Navegação' : stop.stop_type === 'desembarque' ? 'Desembarque' : 'Parada'})</span>
                {stop.arrival_time && <span className="text-muted-foreground"> {stop.arrival_time}</span>}
                {stop.departure_time && <span className="text-muted-foreground"> – {stop.departure_time}</span>}
                {stop.notes && <span className="text-muted-foreground italic"> • {stop.notes}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItinerary(itinerary.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-4">
            <Input type="date" placeholder="Data" value={itDate} onChange={(e) => setItDate(e.target.value)} />
            <Input placeholder="Porto / Local *" value={itPort} onChange={(e) => setItPort(e.target.value)} />
            <Input type="time" placeholder="Chegada" value={itArrival} onChange={(e) => setItArrival(e.target.value)} />
            <Input type="time" placeholder="Saída" value={itDeparture} onChange={(e) => setItDeparture(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={itType} onValueChange={setItType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="embarque">Embarque</SelectItem>
                <SelectItem value="navegacao">Navegação</SelectItem>
                <SelectItem value="parada">Parada</SelectItem>
                <SelectItem value="desembarque">Desembarque</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Observações da parada" value={itNotes} onChange={(e) => setItNotes(e.target.value)} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItineraryStop}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Parada
          </Button>
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="✅ Check-in Online">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="checkin_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Link do Check-in</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_deadline" render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo Limite</FormLabel>
              <FormControl><Input placeholder="48h antes do embarque" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⚠️ Orientações de Embarque">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="boarding_terminal" render={({ field }) => (
            <FormItem>
              <FormLabel>Terminal de Embarque</FormLabel>
              <FormControl><Input placeholder="Terminal Marítimo de Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="port_address" render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço do Porto</FormLabel>
              <FormControl><Input placeholder="Av. Portuária, 123..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="port_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps do Porto</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="recommended_arrival" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário Recomendado de Chegada</FormLabel>
              <FormControl><Input placeholder="3 horas antes do embarque" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="required_documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Documentos Obrigatórios</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Passaporte válido, visto, certidão de nascimento..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="baggage_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Bagagem</FormLabel>
              <FormControl><Input placeholder="Máximo 2 malas por pessoa..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dress_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Dress Code</FormLabel>
              <FormControl><Input placeholder="Traje social nas noites de gala..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="company_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras Importantes da Companhia</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Regras sobre bebidas, política de cancelamento..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações adicionais para o passageiro..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="⚡ Dados Operacionais do Navio">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="onboard_currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Moeda a Bordo</FormLabel>
              <FormControl><Input placeholder="Dólar americano" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="onboard_language" render={({ field }) => (
            <FormItem>
              <FormLabel>Idioma Principal</FormLabel>
              <FormControl><Input placeholder="Inglês, Português..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="voltage" render={({ field }) => (
            <FormItem>
              <FormLabel>Voltagem</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="110v">110V</SelectItem>
                  <SelectItem value="220v">220V</SelectItem>
                  <SelectItem value="bivolt">Bivolt</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ship_website" render={({ field }) => (
            <FormItem>
              <FormLabel>Site Oficial do Navio</FormLabel>
              <FormControl><Input placeholder="https://www.msccruises.com.br/" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Voucher / Boarding Pass / Confirmação" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Other Form - Concierge Digital
const otherSchema = z.object({
  service_name: z.string().min(2, "Nome do serviço é obrigatório"),
  other_service_type: z.string().optional(),
  custom_type_name: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  date: z.date().optional(),
  time: z.string().optional(),
  duration: z.string().optional(),
  status: z.string().optional(),
  location_name: z.string().optional(),
  address: z.string().optional(),
  maps_url: z.string().optional(),
  meeting_point: z.string().optional(),
  how_to_arrive: z.string().optional(),
  contact_name: z.string().optional(),
  contact_company: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_whatsapp: z.string().optional(),
  contact_email: z.string().optional(),
  contact_language: z.string().optional(),
  reservation_code: z.string().optional(),
  chip_operator: z.string().optional(),
  chip_type: z.string().optional(),
  chip_activation_instructions: z.string().optional(),
  chip_activation_url: z.string().optional(),
  chip_support: z.string().optional(),
  guide_name: z.string().optional(),
  guide_language: z.string().optional(),
  guide_tour_time: z.string().optional(),
  guide_tour_duration: z.string().optional(),
  guide_meeting_point: z.string().optional(),
  agency_tips: z.string().optional(),
  agency_notes: z.string().optional(),
  agency_contact: z.string().optional(),
  emergency_contact: z.string().optional(),
  description: z.string().optional(),
});

const OTHER_SERVICE_TYPES = [
  { value: 'restaurante', label: '🍽️ Restaurante' },
  { value: 'guia_turistico', label: '🧭 Guia Turístico' },
  { value: 'chip_internet', label: '📶 Chip / Internet' },
  { value: 'experiencia', label: '✨ Experiência Exclusiva' },
  { value: 'evento', label: '📅 Evento' },
  { value: 'spa_wellness', label: '🧘 Spa / Bem-estar' },
  { value: 'servico_vip', label: '👑 Serviço VIP' },
  { value: 'concierge', label: '🛎️ Concierge' },
  { value: 'personalizado', label: '⭐ Personalizado' },
];

function OtherForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: {
      service_name: defaultValues?.service_name || "",
      other_service_type: defaultValues?.other_service_type || "",
      custom_type_name: defaultValues?.custom_type_name || "",
      city: defaultValues?.city || "",
      country: defaultValues?.country || "",
      time: defaultValues?.time || "",
      duration: defaultValues?.duration || "",
      status: defaultValues?.status || "confirmado",
      location_name: defaultValues?.location_name || "",
      address: defaultValues?.address || "",
      maps_url: defaultValues?.maps_url || "",
      meeting_point: defaultValues?.meeting_point || "",
      how_to_arrive: defaultValues?.how_to_arrive || "",
      contact_name: defaultValues?.contact_name || "",
      contact_company: defaultValues?.contact_company || "",
      contact_phone: defaultValues?.contact_phone || "",
      contact_whatsapp: defaultValues?.contact_whatsapp || "",
      contact_email: defaultValues?.contact_email || "",
      contact_language: defaultValues?.contact_language || "",
      reservation_code: defaultValues?.reservation_code || "",
      chip_operator: defaultValues?.chip_operator || "",
      chip_type: defaultValues?.chip_type || "",
      chip_activation_instructions: defaultValues?.chip_activation_instructions || "",
      chip_activation_url: defaultValues?.chip_activation_url || "",
      chip_support: defaultValues?.chip_support || "",
      guide_name: defaultValues?.guide_name || "",
      guide_language: defaultValues?.guide_language || "",
      guide_tour_time: defaultValues?.guide_tour_time || "",
      guide_tour_duration: defaultValues?.guide_tour_duration || "",
      guide_meeting_point: defaultValues?.guide_meeting_point || "",
      agency_tips: defaultValues?.agency_tips || "",
      agency_notes: defaultValues?.agency_notes || "",
      agency_contact: defaultValues?.agency_contact || "",
      emergency_contact: defaultValues?.emergency_contact || "",
      description: defaultValues?.description || "",
      ...(defaultValues?.date ? { date: parseLocal(defaultValues.date) } : {}),
    },
  });

  const watchedType = form.watch("other_service_type");
  const isChip = watchedType === 'chip_internet';
  const isGuide = watchedType === 'guia_turistico';

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    onSubmit(
      {
        service_name: values.service_name,
        other_service_type: values.other_service_type || "",
        custom_type_name: values.custom_type_name || "",
        city: values.city || "",
        country: values.country || "",
        date: values.date ? format(values.date, "yyyy-MM-dd") : "",
        time: values.time || "",
        duration: values.duration || "",
        status: values.status || "",
        location_name: values.location_name || "",
        address: values.address || "",
        maps_url: values.maps_url || "",
        meeting_point: values.meeting_point || "",
        how_to_arrive: values.how_to_arrive || "",
        contact_name: values.contact_name || "",
        contact_company: values.contact_company || "",
        contact_phone: values.contact_phone || "",
        contact_whatsapp: values.contact_whatsapp || "",
        contact_email: values.contact_email || "",
        contact_language: values.contact_language || "",
        reservation_code: values.reservation_code || "",
        chip_operator: values.chip_operator || "",
        chip_type: values.chip_type || "",
        chip_activation_instructions: values.chip_activation_instructions || "",
        chip_activation_url: values.chip_activation_url || "",
        chip_support: values.chip_support || "",
        guide_name: values.guide_name || "",
        guide_language: values.guide_language || "",
        guide_tour_time: values.guide_tour_time || "",
        guide_tour_duration: values.guide_tour_duration || "",
        guide_meeting_point: values.guide_meeting_point || "",
        agency_tips: values.agency_tips || "",
        agency_notes: values.agency_notes || "",
        agency_contact: values.agency_contact || "",
        emergency_contact: values.emergency_contact || "",
        description: values.description || "",
        notes: values.description || "",
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CollapsibleFormSection title="🛎️ Informações do Serviço" defaultOpen>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="service_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço *</FormLabel>
              <FormControl><Input placeholder="Restaurante Le Jules Verne, Chip T-Mobile..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="other_service_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo do Serviço</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                <SelectContent>
                  {OTHER_SERVICE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {watchedType === 'personalizado' && (
          <FormField control={form.control} name="custom_type_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Tipo Personalizado</FormLabel>
              <FormControl><Input placeholder="Ex: Fotógrafo, Personal Shopper..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem>
              <FormLabel>País</FormLabel>
              <FormControl><Input placeholder="França" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="confirmado">✅ Confirmado</SelectItem>
                  <SelectItem value="agendado">📅 Agendado</SelectItem>
                  <SelectItem value="opcional">🔄 Opcional</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="reservation_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Código de Reserva</FormLabel>
              <FormControl><Input placeholder="ABC123" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição / Detalhes</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Informações adicionais do serviço..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📅 Agendamento">

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data do Serviço</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel>Duração Estimada</FormLabel>
              <FormControl><Input placeholder="2h, meio dia..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📍 Localização">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="location_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Local</FormLabel>
              <FormControl><Input placeholder="Torre Eiffel, Hotel Lobby..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço Completo</FormLabel>
              <FormControl><Input placeholder="Av. Gustave Eiffel, 5..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Link do Google Maps</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="meeting_point" render={({ field }) => (
            <FormItem>
              <FormLabel>Ponto de Encontro</FormLabel>
              <FormControl><Input placeholder="Recepção, entrada principal..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="how_to_arrive" render={({ field }) => (
          <FormItem>
            <FormLabel>Como Chegar</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Instruções de como chegar ao local..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="👤 Contato do Prestador">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="contact_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Contato</FormLabel>
              <FormControl><Input placeholder="Nome da pessoa responsável" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contact_company" render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa / Estabelecimento</FormLabel>
              <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="contact_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl><Input placeholder="+33 1 4411 2323" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contact_whatsapp" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl><Input placeholder="+5511999999999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contact_email" render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input placeholder="contato@empresa.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="contact_language" render={({ field }) => (
          <FormItem>
            <FormLabel>Idioma de Atendimento</FormLabel>
            <FormControl><Input placeholder="Português, Inglês, Francês..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        {/* === CHIP / INTERNET (CONDICIONAL) === */}
        {isChip && (
          <>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">📶 Chip / Internet</h4>
              <div className="h-px bg-border" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="chip_operator" render={({ field }) => (
                <FormItem>
                  <FormLabel>Operadora</FormLabel>
                  <FormControl><Input placeholder="T-Mobile, Airalo, Holafly..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="chip_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="esim">eSIM (digital)</SelectItem>
                      <SelectItem value="fisico">Chip Físico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="chip_activation_instructions" render={({ field }) => (
              <FormItem>
                <FormLabel>Instruções de Ativação</FormLabel>
                <FormControl><TextareaWithTemplate placeholder="Passo a passo para ativar o chip..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="chip_activation_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de Ativação</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="chip_support" render={({ field }) => (
                <FormItem>
                  <FormLabel>Suporte Técnico</FormLabel>
                  <FormControl><Input placeholder="Telefone ou e-mail do suporte" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </>
        )}

        {/* === GUIA TURÍSTICO (CONDICIONAL) === */}
        {isGuide && (
          <>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🧭 Guia Turístico</h4>
              <div className="h-px bg-border" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="guide_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Guia</FormLabel>
                  <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="guide_language" render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma do Guia</FormLabel>
                  <FormControl><Input placeholder="Português, Espanhol..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="guide_tour_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário do Tour</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="guide_tour_duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração do Passeio</FormLabel>
                  <FormControl><Input placeholder="3h, meio dia..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="guide_meeting_point" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponto de Encontro</FormLabel>
                  <FormControl><Input placeholder="Entrada principal, lobby..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </>
        )}


        <CollapsibleFormSection title="🧠 Orientações da Agência">

        <FormField control={form.control} name="agency_tips" render={({ field }) => (
          <FormItem>
            <FormLabel>Dicas do seu Agente de Viagem</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Dress code, dicas locais, melhor horário..." rows={3} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="agency_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações da Agência</FormLabel>
            <FormControl><TextareaWithTemplate placeholder="Observações internas ou para o cliente..." rows={2} {...field} onValueChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </CollapsibleFormSection>

        <CollapsibleFormSection title="📞 Contatos de Suporte">

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="agency_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp da Agência</FormLabel>
              <FormControl><Input placeholder="+5511999999999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="emergency_contact" render={({ field }) => (
            <FormItem>
              <FormLabel>Contato de Emergência</FormLabel>
              <FormControl><Input placeholder="+5511999999999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </CollapsibleFormSection>

        <MultiFileUpload files={files} setFiles={setFiles} label="Comprovante / Voucher / Documento" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Train Form
const trainSchema = z.object({
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  origin_station: z.string().optional(),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  destination_station: z.string().optional(),
  travel_date: z.date({ required_error: "Data da viagem é obrigatória" }),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  train_company: z.string().optional(),
  train_number: z.string().optional(),
  travel_class: z.string().optional(),
  coach: z.string().optional(),
  seat: z.string().optional(),
  platform: z.string().optional(),
  boarding_notes: z.string().optional(),
  origin_maps_url: z.string().optional(),
  destination_maps_url: z.string().optional(),
});

function TrainForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [files, setFiles] = useState<File[]>([]);
  const [passengers, setPassengers] = useState<{ name: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPassengerName, setNewPassengerName] = useState("");
  const [isEditingPax, setIsEditingPax] = useState(false);

  const form = useForm<z.infer<typeof trainSchema>>({
    resolver: zodResolver(trainSchema),
    defaultValues: {
      origin_city: defaultValues?.origin_city || "",
      origin_station: defaultValues?.origin_station || "",
      destination_city: defaultValues?.destination_city || "",
      destination_station: defaultValues?.destination_station || "",
      departure_time: defaultValues?.departure_time || "",
      arrival_time: defaultValues?.arrival_time || "",
      train_company: defaultValues?.train_company || "",
      train_number: defaultValues?.train_number || "",
      travel_class: defaultValues?.travel_class || "",
      coach: defaultValues?.coach || "",
      seat: defaultValues?.seat || "",
      platform: defaultValues?.platform || "",
      boarding_notes: defaultValues?.boarding_notes || "",
      origin_maps_url: defaultValues?.origin_maps_url || "",
      destination_maps_url: defaultValues?.destination_maps_url || "",
      ...(defaultValues?.travel_date ? { travel_date: parseLocal(defaultValues.travel_date) } : {}),
    },
  });

  const addPassenger = () => {
    if (!newPassengerName.trim()) return;
    setPassengers([...passengers, { name: newPassengerName.trim() }]);
    setNewPassengerName("");
    setIsEditingPax(false);
  };

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handleSubmit = (values: z.infer<typeof trainSchema>) => {
    onSubmit(
      {
        origin_city: values.origin_city,
        origin_station: values.origin_station || "",
        destination_city: values.destination_city,
        destination_station: values.destination_station || "",
        travel_date: format(values.travel_date, "yyyy-MM-dd"),
        departure_time: values.departure_time || "",
        arrival_time: values.arrival_time || "",
        train_company: values.train_company || "",
        train_number: values.train_number || "",
        travel_class: values.travel_class || "",
        coach: values.coach || "",
        seat: values.seat || "",
        platform: values.platform || "",
        passengers,
        boarding_notes: values.boarding_notes || "",
        origin_maps_url: values.origin_maps_url || "",
        destination_maps_url: values.destination_maps_url || "",
      },
      files.length > 0 ? files : undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Origin / Destination */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Origem *</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Destino *</FormLabel>
              <FormControl><Input placeholder="Londres" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_station" render={({ field }) => (
            <FormItem>
              <FormLabel>Estação de Embarque</FormLabel>
              <FormControl><Input placeholder="Gare du Nord" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_station" render={({ field }) => (
            <FormItem>
              <FormLabel>Estação de Desembarque</FormLabel>
              <FormControl><Input placeholder="St Pancras International" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Date & Times */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="travel_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data da Viagem *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="departure_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Partida</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="arrival_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Chegada</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Train Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="train_company" render={({ field }) => (
            <FormItem>
              <FormLabel>Companhia Ferroviária</FormLabel>
              <FormControl><Input placeholder="Eurostar, SNCF, Trenitalia..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="train_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Trem</FormLabel>
              <FormControl><Input placeholder="ES 9024" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <FormField control={form.control} name="travel_class" render={({ field }) => (
            <FormItem>
              <FormLabel>Classe</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first_class">First Class</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="coach" render={({ field }) => (
            <FormItem>
              <FormLabel>Vagão</FormLabel>
              <FormControl><Input placeholder="12" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="seat" render={({ field }) => (
            <FormItem>
              <FormLabel>Assento</FormLabel>
              <FormControl><Input placeholder="45A" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="platform" render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <FormControl><Input placeholder="3" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Passageiros</label>
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span className="text-sm flex-1">{p.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setNewPassengerName(p.name); removePassenger(i); setIsEditingPax(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePassenger(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do passageiro"
              value={newPassengerName}
              onChange={(e) => setNewPassengerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPassenger(); } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
              {isEditingPax ? <><Pencil className="h-3 w-3 mr-1" /> Salvar</> : <><Plus className="h-3 w-3 mr-1" /> Adicionar</>}
            </Button>
          </div>
        </div>

        {/* Boarding Notes */}
        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Orientações de Embarque</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Horário recomendado de chegada, como validar o bilhete, regras de bagagem..." 
                rows={3} 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Maps URLs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps - Estação Embarque</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps - Estação Desembarque</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <MultiFileUpload files={files} setFiles={setFiles} label="Bilhete/Voucher/QR Code" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Service Form component
export function TripServiceForm({ serviceType, onSubmit, onCancel, isLoading, defaultValues, isEditing }: TripServiceFormProps) {
  const props = { onSubmit, onCancel, isLoading, defaultValues, isEditing };
  switch (serviceType) {
    case "flight": return <FlightForm {...props} />;
    case "hotel": return <HotelForm {...props} />;
    case "car_rental": return <CarRentalForm {...props} />;
    case "transfer": return <TransferForm {...props} />;
    case "attraction": return <AttractionForm {...props} />;
    case "insurance": return <InsuranceForm {...props} />;
    case "cruise": return <CruiseForm {...props} />;
    case "train": return <TrainForm {...props} />;
    case "other": return <OtherForm {...props} />;
    default: return null;
  }
}
