import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, FileText, CheckCircle2, Plane, ArrowRight, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FlightSegment {
  airline?: string;
  flight_number?: string;
  origin_airport?: string;
  origin_city?: string;
  destination_airport?: string;
  destination_city?: string;
  departure_time?: string;
  arrival_time?: string;
  flight_status?: string;
  flight_date?: string;
}

interface FlightImportResult extends FlightSegment {
  segments?: FlightSegment[];
  // Rich fields extracted by AI parser
  airlines?: string;
  trip_type?: "ida" | "ida_volta" | "multi_trechos";
  origin_city?: string;
  destination_city?: string;
  additional_cities?: string[];
  checked_baggage?: boolean;
  carry_on?: boolean;
  baggage_notes?: string;
  total_price?: number;
  currency?: string;
  exchange_rate?: number;
  boarding_tax?: number;
  fare_notes?: string;
  auto_summary?: string;
  confidence?: number;
  missing_fields?: string[];
}

interface FlightAutoImportProps {
  onImport: (data: FlightImportResult) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export function FlightAutoImport({ onImport }: FlightAutoImportProps) {
  const { toast } = useToast();
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<FlightImportResult | null>(null);

  const handleFlightLookup = async () => {
    if (!flightNumber.trim()) {
      toast({ title: "Informe o número do voo", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    setResult(null);
    try {
      const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();
      const params = new URLSearchParams({ flight_number: normalized });
      if (flightDate) params.set("flight_date", flightDate);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/flight-lookup?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const json = await resp.json();

      if (!resp.ok) {
        toast({
          title: "Voo não encontrado",
          description: json.error || "Não foi possível encontrar os dados deste voo. Preencha manualmente.",
          variant: "destructive",
        });
        return;
      }

      setResult(json);
      const segments = json.segments || [json];
      const segCount = segments.length;
      toast({
        title: "✈️ Voo detectado!",
        description: segCount > 1
          ? `${segCount} trechos: ${segments[0].origin_airport} → ${segments[segCount - 1].destination_airport}`
          : `${json.origin_airport} → ${json.destination_airport}`,
      });
    } catch (err) {
      toast({ title: "Erro ao buscar voo", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const callItineraryParser = async (payload: { text?: string; fileBase64?: string; fileMimeType?: string }) => {
    const { data, error } = await supabase.functions.invoke("parse-flight-itinerary", { body: payload });
    if (error) {
      // Surface the structured error from the function body if present
      let msg = "Não foi possível analisar a passagem. Tente novamente.";
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch { /* noop */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data as any;
  };

  const normalizeRich = (raw: any): FlightImportResult => {
    const segments: FlightSegment[] = Array.isArray(raw?.segments)
      ? raw.segments.map((s: any) => ({
          airline: s.airline || raw.airlines || "",
          flight_number: s.flightNumber || "",
          origin_airport: s.originAirport || "",
          origin_city: s.originCity || "",
          destination_airport: s.destinationAirport || "",
          destination_city: s.destinationCity || "",
          departure_time: s.departureTime || "",
          arrival_time: s.arrivalTime || "",
          flight_date: s.date || "",
        }))
      : [];
    const first = segments[0];
    const last = segments[segments.length - 1];
    return {
      // Top-level legacy fields (compat)
      airline: raw.airlines || first?.airline || "",
      flight_number: first?.flight_number,
      origin_airport: first?.origin_airport,
      origin_city: raw.originCity || first?.origin_city,
      destination_airport: last?.destination_airport,
      destination_city: raw.destinationCity || last?.destination_city,
      departure_time: first?.departure_time,
      arrival_time: last?.arrival_time,
      segments,
      // Rich
      airlines: raw.airlines || "",
      trip_type: raw.tripType,
      additional_cities: raw.additionalCities || [],
      checked_baggage: raw.checkedBaggage,
      carry_on: raw.carryOn,
      baggage_notes: raw.baggageNotes || "",
      total_price: raw.totalPrice,
      currency: raw.currency,
      exchange_rate: raw.exchangeRate,
      boarding_tax: raw.boardingTax,
      fare_notes: raw.fareNotes || "",
      auto_summary: raw.autoSummary || "",
      confidence: raw.confidence,
      missing_fields: raw.missingFields || [],
    };
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) {
      toast({ title: "Cole o texto da confirmação", variant: "destructive" });
      return;
    }
    setIsParsing(true);
    setResult(null);
    try {
      const raw = await callItineraryParser({ text: pasteText });
      const normalized = normalizeRich(raw);
      setResult(normalized);
      toast({
        title: "✈️ Itinerário extraído!",
        description: `${normalized.segments?.length || 0} trecho(s) detectado(s).`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao analisar", description: e?.message, variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Envie PDF, PNG, JPG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 5MB.", variant: "destructive" });
      return;
    }
    setUploadFile(file);
  };

  const handleParseFile = async () => {
    if (!uploadFile) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setResult(null);
    try {
      const fileBase64 = await fileToBase64(uploadFile);
      const raw = await callItineraryParser({ fileBase64, fileMimeType: uploadFile.type });
      const normalized = normalizeRich(raw);
      setResult(normalized);
      toast({
        title: "✈️ Itinerário extraído!",
        description: `${normalized.segments?.length || 0} trecho(s) detectado(s).`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao processar arquivo", description: e?.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onImport(result);
      setResult(null);
      setFlightNumber("");
      setFlightDate("");
      setPasteText("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatDateTime = (dt: string) => {
    if (!dt) return "";
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return dt;
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
        " " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dt;
    }
  };

  const formatTime = (dt: string) => {
    if (!dt) return "";
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return dt;
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dt;
    }
  };

  const segments = result?.segments || (result ? [result] : []);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-primary">Importação Automática de Voo</h4>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="h-3 w-3 mr-1" /> PDF / Imagem
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3 w-3 mr-1" /> Nº do Voo
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs">
              <FileText className="h-3 w-3 mr-1" /> Colar Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Anexe o voucher, e-ticket, cotação ou print da passagem (PDF, PNG, JPG • máx 5MB)
              </label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="mt-1"
                onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {uploadFile.name} • {(uploadFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <Button type="button" onClick={handleParseFile} disabled={isUploading || !uploadFile} className="w-full" size="sm">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Extrair com IA
            </Button>
          </TabsContent>

          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nº do Voo *</label>
                <Input
                  className="mt-1"
                  placeholder="LA3001"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data do Voo</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleFlightLookup}
                  disabled={isSearching}
                  className="w-full"
                  size="sm"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  Buscar Dados
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Cole o e-mail, voucher ou cotação GDS completa do voo
              </label>
              <Textarea
                className="mt-1 min-h-[140px]"
                placeholder={"LATAM Airlines\nFlight LA3001\n\nDeparture\nSão Paulo (GRU)\n27 Mar 22:45\n\nArrival\nLas Vegas (LAS)\n28 Mar 06:30"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={handleParseText}
              disabled={isParsing}
              className="w-full"
              size="sm"
            >
              {isParsing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              Extrair Itinerário com IA
            </Button>
          </TabsContent>
        </Tabs>

        {/* Result preview */}
        {result && (
          <div className="rounded-lg border border-primary/30 bg-background p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {segments.length > 1 ? `${segments.length} trechos detectados` : 'Voo detectado'}
              {typeof result.confidence === "number" && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Confiança: {Math.round(result.confidence * 100)}%
                </span>
              )}
            </div>

            {/* Resumo */}
            {(result.airlines || result.trip_type || result.total_price || result.auto_summary) && (
              <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                {result.airlines && (
                  <div><span className="font-medium">Cias:</span> {result.airlines}</div>
                )}
                {result.trip_type && (
                  <div><span className="font-medium">Tipo:</span> {result.trip_type === "ida_volta" ? "Ida e Volta" : result.trip_type === "multi_trechos" ? "Multi-trechos" : "Somente Ida"}</div>
                )}
                {(result.checked_baggage !== undefined || result.carry_on !== undefined) && (
                  <div>
                    <span className="font-medium">Bagagem:</span>{" "}
                    {result.checked_baggage ? "✅ despachada" : "❌ sem despachada"} •{" "}
                    {result.carry_on ? "✅ mão" : "—"}
                  </div>
                )}
                {typeof result.total_price === "number" && (
                  <div>
                    <span className="font-medium">Total:</span>{" "}
                    {result.currency || ""} {result.total_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                )}
                {result.auto_summary && (
                  <div className="text-muted-foreground italic">{result.auto_summary}</div>
                )}
              </div>
            )}

            {segments.map((seg, idx) => (
              <SegmentCard key={idx} segment={seg} index={idx} total={segments.length} formatDateTime={formatDateTime} formatTime={formatTime} />
            ))}

            {result.missing_fields && result.missing_fields.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Campos não detectados:</div>
                  <div>{result.missing_fields.join(", ")}</div>
                </div>
              </div>
            )}

            <Button type="button" size="sm" onClick={handleApply} className="w-full mt-2">
              Preencher Campos Automaticamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentCard({
  segment,
  index,
  total,
  formatDateTime,
  formatTime,
}: {
  segment: FlightSegment;
  index: number;
  total: number;
  formatDateTime: (dt: string) => string;
  formatTime: (dt: string) => string;
}) {
  return (
    <div className={cn(
      "rounded-md border p-3 space-y-1.5",
      total > 1 ? "border-muted bg-muted/30" : "border-transparent"
    )}>
      {total > 1 && (
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Trecho {index + 1} de {total}
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold">{segment.airline || ''}</span>
        {segment.flight_number && (
          <span className="text-muted-foreground">{segment.flight_number}</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-lg font-bold">
        <span>{segment.origin_airport || '???'}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span>{segment.destination_airport || '???'}</span>
      </div>
      {(segment.origin_city || segment.destination_city) && (
        <div className="text-xs text-muted-foreground">
          {segment.origin_city} → {segment.destination_city}
        </div>
      )}
      {(segment.departure_time || segment.arrival_time) && (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(segment.departure_time || '')} → {formatDateTime(segment.arrival_time || '')}
        </div>
      )}
      {segment.flight_status && (
        <FlightStatusBadge status={segment.flight_status} />
      )}
    </div>
  );
}

export function FlightStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: { label: "No Horário", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    active: { label: "Em Voo", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    landed: { label: "Pousou", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    delayed: { label: "Atrasado", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    diverted: { label: "Desviado", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  };

  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
