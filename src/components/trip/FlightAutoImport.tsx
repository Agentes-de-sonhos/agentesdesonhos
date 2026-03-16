import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, FileText, CheckCircle2, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FlightImportResult {
  airline?: string;
  flight_number?: string;
  origin_airport?: string;
  origin_city?: string;
  destination_airport?: string;
  destination_city?: string;
  departure_time?: string;
  arrival_time?: string;
  flight_status?: string;
}

interface FlightAutoImportProps {
  onImport: (data: FlightImportResult) => void;
}

export function FlightAutoImport({ onImport }: FlightAutoImportProps) {
  const { toast } = useToast();
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<FlightImportResult | null>(null);

  const handleFlightLookup = async () => {
    if (!flightNumber.trim()) {
      toast({ title: "Informe o número do voo", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ flight_number: flightNumber.trim() });
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
          description: json.error || "Verifique o número do voo ou insira os dados manualmente.",
          variant: "destructive",
        });
        return;
      }

      setResult(json);
      toast({ title: "✈️ Voo detectado!", description: `${json.origin_airport} → ${json.destination_airport}` });
    } catch (err) {
      toast({ title: "Erro ao buscar voo", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) {
      toast({ title: "Cole o texto da confirmação", variant: "destructive" });
      return;
    }
    setIsParsing(true);
    setResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-flight-text`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: pasteText }),
        }
      );
      const parsed = await resp.json();

      if (!resp.ok) {
        toast({ title: "Erro ao analisar texto", description: parsed.error, variant: "destructive" });
        return;
      }

      // If we found a flight number, enrich via lookup
      if (parsed.flight_number) {
        const params = new URLSearchParams({ flight_number: parsed.flight_number });
        const lookupResp = await fetch(
          `https://${projectId}.supabase.co/functions/v1/flight-lookup?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        if (lookupResp.ok) {
          const enriched = await lookupResp.json();
          // Merge: prefer enriched data, but keep parsed times if enriched doesn't have them
          const merged = {
            ...parsed,
            ...enriched,
            departure_time: enriched.departure_time || parsed.departure_time || '',
            arrival_time: enriched.arrival_time || parsed.arrival_time || '',
          };
          setResult(merged);
          toast({ title: "✈️ Voo detectado e enriquecido!", description: `${merged.origin_airport} → ${merged.destination_airport}` });
          return;
        } else {
          await lookupResp.text(); // consume body
        }
      }

      setResult(parsed);
      toast({
        title: parsed.flight_number ? "✈️ Dados extraídos" : "Dados parciais extraídos",
        description: parsed.flight_number
          ? `${parsed.origin_airport} → ${parsed.destination_airport}`
          : "Não foi possível enriquecer automaticamente. Revise os campos.",
      });
    } catch (err) {
      toast({ title: "Erro ao analisar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onImport(result);
      setResult(null);
      setFlightNumber("");
      setFlightDate("");
      setPasteText("");
    }
  };

  const formatTime = (dt: string) => {
    if (!dt) return "";
    if (dt.includes("T")) {
      try { return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
      catch { return dt; }
    }
    return dt;
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-primary">Importação Automática de Voo</h4>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3 w-3 mr-1" /> Buscar Voo
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs">
              <FileText className="h-3 w-3 mr-1" /> Colar Confirmação
            </TabsTrigger>
          </TabsList>

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
              <label className="text-xs font-medium text-muted-foreground">Cole o e-mail ou texto de confirmação do voo</label>
              <Textarea
                className="mt-1 min-h-[100px]"
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
              Detectar Voo
            </Button>
          </TabsContent>
        </Tabs>

        {/* Result preview */}
        {result && (
          <div className="rounded-lg border border-primary/30 bg-background p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Voo detectado
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">{result.airline || ''}</span>
              {result.flight_number && (
                <span className="text-muted-foreground">{result.flight_number}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <span>{result.origin_airport || '???'}</span>
              <span className="text-muted-foreground">→</span>
              <span>{result.destination_airport || '???'}</span>
            </div>
            {(result.departure_time || result.arrival_time) && (
              <div className="text-sm text-muted-foreground">
                {formatTime(result.departure_time)} → {formatTime(result.arrival_time)}
              </div>
            )}
            {result.flight_status && (
              <FlightStatusBadge status={result.flight_status} />
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
