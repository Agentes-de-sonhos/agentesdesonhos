import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Upload, X, Pencil } from "lucide-react";
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
  onSubmit: (data: any, file?: File) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: any;
  isEditing?: boolean;
}

interface VoucherUploadProps {
  file: File | null;
  setFile: (file: File | null) => void;
  label?: string;
}

function VoucherUpload({ file, setFile, label = "Voucher/Documento" }: VoucherUploadProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {file ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm truncate flex-1">{file.name}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Clique para enviar</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      )}
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
  const [file, setFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<FlightSegmentInput[]>(
    defaultValues?.segments?.length > 0 ? defaultValues.segments : [emptySegment()]
  );
  const [passengers, setPassengers] = useState<FlightPassengerInput[]>(
    defaultValues?.passengers?.length > 0 ? defaultValues.passengers : []
  );
  const [newPax, setNewPax] = useState<FlightPassengerInput>(emptyPassenger());

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
      file || undefined
    );
  };

  const tripTypeLabels: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
  const segmentTypeLabels: Record<string, string> = { ida: 'Ida', conexao: 'Conexão', volta: 'Volta' };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* === RESUMO DO VOO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">✈️ Informações Principais</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === TRECHOS DE VOO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🛫 Trechos de Voo</h4>
          <div className="h-px bg-border" />
        </div>

        {segments.map((seg, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Trecho {i + 1}</span>
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
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full" onClick={() => setSegments([...segments, emptySegment()])}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Trecho de Voo
        </Button>

        {/* === PASSAGEIROS === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">👤 Passageiros</h4>
          <div className="h-px bg-border" />
        </div>

        {passengers.map((p, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
            <span className="flex-1">{p.name} ({p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'}){p.seat ? ` • ${p.seat}` : ''}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Nome completo" value={newPax.name} onChange={(e) => setNewPax({ ...newPax, name: e.target.value })} />
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
            <Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro
          </Button>
        </div>

        {/* === BAGAGEM === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🧳 Bagagem</h4>
          <div className="h-px bg-border" />
        </div>

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
            <FormControl><Textarea placeholder="Peso máximo, dimensões, itens proibidos..." rows={2} {...field} /></FormControl>
          </FormItem>
        )} />

        {/* === CHECK-IN === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">✅ Check-in Online</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === ORIENTAÇÕES === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚠️ Orientações de Embarque</h4>
          <div className="h-px bg-border" />
        </div>

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
            <FormControl><Textarea placeholder="Passaporte válido, visto, certificado de vacinação..." rows={2} {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="immigration_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras de Imigração</FormLabel>
            <FormControl><Textarea placeholder="Informações sobre alfândega, declarações..." rows={2} {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><Textarea placeholder="Informações adicionais para o passageiro..." rows={3} {...field} /></FormControl>
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="E-ticket / Cartão de Embarque" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Adicionar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Hotel Form
const hotelSchema = z.object({
  hotel_name: z.string().min(2, "Nome do hotel é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  check_in: z.date({ required_error: "Check-in é obrigatório" }),
  check_out: z.date({ required_error: "Check-out é obrigatório" }),
  notes: z.string().optional(),
});

function HotelForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      hotel_name: defaultValues?.hotel_name || "",
      city: defaultValues?.city || "",
      notes: defaultValues?.notes || "",
      ...(defaultValues?.check_in ? { check_in: parseLocal(defaultValues.check_in) } : {}),
      ...(defaultValues?.check_out ? { check_out: parseLocal(defaultValues.check_out) } : {}),
    },
  });

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    onSubmit(
      {
        hotel_name: values.hotel_name,
        city: values.city,
        check_in: format(values.check_in, "yyyy-MM-dd"),
        check_out: format(values.check_out, "yyyy-MM-dd"),
        notes: values.notes || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Hotel</FormLabel>
              <FormControl><Input placeholder="Hotel Marriott" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="check_in" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-in</FormLabel>
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
          <FormField control={form.control} name="check_out" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-out</FormLabel>
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

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea placeholder="Tipo de quarto, regime..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Voucher do Hotel" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
  const [file, setFile] = useState<File | null>(null);
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
    onSubmit({ ...values, drivers }, file || undefined);
  };

  const statusLabels: Record<string, string> = { confirmada: 'Confirmada', emitida: 'Emitida', a_retirar: 'A Retirar' };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* === RESUMO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🚗 Informações Principais</h4>
          <div className="h-px bg-border" />
        </div>
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

        {/* === RETIRADA === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">📍 Dados de Retirada</h4>
          <div className="h-px bg-border" />
        </div>
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
          <FormItem><FormLabel>Instruções de Retirada</FormLabel><FormControl><Textarea placeholder="Siga as placas para 'Car Rental'..." rows={2} {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="pickup_maps_url" render={({ field }) => (
          <FormItem><FormLabel>Link Google Maps (Retirada)</FormLabel><FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl></FormItem>
        )} />

        {/* === DEVOLUÇÃO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🔁 Dados de Devolução</h4>
          <div className="h-px bg-border" />
        </div>
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
          <FormItem><FormLabel>Instruções de Devolução</FormLabel><FormControl><Textarea placeholder="Estacionar na área indicada..." rows={2} {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="dropoff_late_policy" render={({ field }) => (
          <FormItem><FormLabel>Política de Atraso</FormLabel><FormControl><Input placeholder="Cobrança por hora adicional..." {...field} /></FormControl></FormItem>
        )} />

        {/* === VEÍCULO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🚘 Detalhes do Veículo</h4>
          <div className="h-px bg-border" />
        </div>
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

        {/* === SEGUROS === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🛡️ Seguros da Locação</h4>
          <div className="h-px bg-border" />
        </div>
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
          <FormItem><FormLabel>Observações do Seguro</FormLabel><FormControl><Textarea placeholder="Informações importantes sobre o seguro..." rows={2} {...field} /></FormControl></FormItem>
        )} />

        {/* === CAUÇÃO E PAGAMENTO === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">💳 Caução e Pagamento</h4>
          <div className="h-px bg-border" />
        </div>
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

        {/* === CONDUTORES === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">👤 Condutores</h4>
          <div className="h-px bg-border" />
        </div>
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
                <Input className="mt-1" placeholder="João Silva" value={d.name} onChange={(e) => { const u = [...drivers]; u[i] = { ...u[i], name: e.target.value }; setDrivers(u); }} />
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

        {/* === COMBUSTÍVEL === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⛽ Política de Combustível</h4>
          <div className="h-px bg-border" />
        </div>
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
          <FormItem><FormLabel>Observações de Combustível</FormLabel><FormControl><Textarea placeholder="Posto mais próximo, tipo de combustível..." rows={2} {...field} /></FormControl></FormItem>
        )} />

        {/* === ORIENTAÇÕES === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚠️ Orientações Importantes</h4>
          <div className="h-px bg-border" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="required_documents" render={({ field }) => (
            <FormItem><FormLabel>Documentos Obrigatórios</FormLabel><FormControl><Textarea placeholder="CNH válida, passaporte..." rows={2} {...field} /></FormControl></FormItem>
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
          <FormItem><FormLabel>Regras de Trânsito</FormLabel><FormControl><Textarea placeholder="Velocidade máxima, pedágios, estacionamento..." rows={2} {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações Gerais</FormLabel><FormControl><Textarea placeholder="Informações adicionais..." rows={3} {...field} /></FormControl></FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Voucher / Contrato da Locação" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Adicionar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Transfer Form
const transferSchema = z.object({
  transfer_type: z.enum(["arrival", "departure"]),
  location: z.string().min(2, "Local é obrigatório"),
  date: z.date({ required_error: "Data é obrigatória" }),
});

function TransferForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { transfer_type: "arrival", location: "" },
  });

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    onSubmit(
      {
        transfer_type: values.transfer_type,
        location: values.location,
        date: format(values.date, "yyyy-MM-dd"),
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="transfer_type" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Transfer</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="arrival">Chegada (Aeroporto → Hotel)</SelectItem>
                <SelectItem value="departure">Saída (Hotel → Aeroporto)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Local</FormLabel>
            <FormControl><Input placeholder="Aeroporto CDG → Hotel Marriott" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data</FormLabel>
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

        <VoucherUpload file={file} setFile={setFile} />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Attraction Form
const attractionSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  date: z.date({ required_error: "Data é obrigatória" }),
  quantity: z.number().min(1, "Mínimo 1 ingresso"),
});

function AttractionForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: { name: "", quantity: 1 },
  });

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    onSubmit(
      {
        name: values.name,
        date: format(values.date, "yyyy-MM-dd"),
        quantity: values.quantity,
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Atração/Ingresso</FormLabel>
            <FormControl><Input placeholder="Torre Eiffel, Museu do Louvre..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
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
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <VoucherUpload file={file} setFile={setFile} label="Voucher/Ingresso" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Insurance Form
const insuranceSchema = z.object({
  provider: z.string().min(2, "Seguradora é obrigatória"),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  coverage: z.string().min(2, "Cobertura é obrigatória"),
});

function InsuranceForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { provider: "", coverage: "" },
  });

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    onSubmit(
      {
        provider: values.provider,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        coverage: values.coverage,
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="provider" render={({ field }) => (
          <FormItem>
            <FormLabel>Seguradora</FormLabel>
            <FormControl><Input placeholder="Assist Card, Travel Ace..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Início</FormLabel>
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
              <FormLabel>Data Fim</FormLabel>
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

        <FormField control={form.control} name="coverage" render={({ field }) => (
          <FormItem>
            <FormLabel>Cobertura</FormLabel>
            <FormControl><Input placeholder="USD 60.000, USD 100.000..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Apólice" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
  const [file, setFile] = useState<File | null>(null);
  const [passengers, setPassengers] = useState<{ name: string; birth_date?: string; document?: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPaxName, setNewPaxName] = useState("");
  const [newPaxBirth, setNewPaxBirth] = useState("");
  const [newPaxDoc, setNewPaxDoc] = useState("");
  const [newPaxNotes, setNewPaxNotes] = useState("");

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
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* === INFORMAÇÕES PRINCIPAIS === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🚢 Informações do Cruzeiro</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === CABINE === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🛏 Dados da Cabine</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === PASSAGEIROS === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">👥 Passageiros</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="flex-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.birth_date && <span className="text-muted-foreground"> • {p.birth_date}</span>}
                {p.document && <span className="text-muted-foreground"> • {p.document}</span>}
                {p.notes && <span className="text-muted-foreground italic"> • {p.notes}</span>}
              </div>
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
            <Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro
          </Button>
        </div>

        {/* === ITINERÁRIO === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🗺 Roteiro do Cruzeiro</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === CHECK-IN === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">✅ Check-in Online</h4>
          <div className="h-px bg-border" />
        </div>

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

        {/* === ORIENTAÇÕES DE EMBARQUE === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚠️ Orientações de Embarque</h4>
          <div className="h-px bg-border" />
        </div>

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
            <FormControl><Textarea placeholder="Passaporte válido, visto, certidão de nascimento..." rows={2} {...field} /></FormControl>
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
            <FormControl><Textarea placeholder="Regras sobre bebidas, política de cancelamento..." rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><Textarea placeholder="Informações adicionais para o passageiro..." rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* === DADOS OPERACIONAIS === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚡ Dados Operacionais do Navio</h4>
          <div className="h-px bg-border" />
        </div>

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

        <VoucherUpload file={file} setFile={setFile} label="Voucher / Boarding Pass / Confirmação" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Adicionar</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Other Form
const otherSchema = z.object({
  description: z.string().min(5, "Descrição é obrigatória"),
});

function OtherForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: { description: "" },
  });

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    onSubmit({ description: values.description }, file || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição do Serviço</FormLabel>
            <FormControl><Textarea placeholder="Descreva o serviço..." rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Documento" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
  const [file, setFile] = useState<File | null>(null);
  const [passengers, setPassengers] = useState<{ name: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPassengerName, setNewPassengerName] = useState("");

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
      file || undefined
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
              <Plus className="h-3 w-3 mr-1" /> Adicionar
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

        <VoucherUpload file={file} setFile={setFile} label="Bilhete/Voucher/QR Code" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Adicionar</>}
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
