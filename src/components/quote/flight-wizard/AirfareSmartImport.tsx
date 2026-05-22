import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Plane, CheckCircle2, AlertTriangle, ArrowRight, X, Trash2, Plus, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractPdfText } from "@/lib/pdfText";
import { useUserRole } from "@/hooks/useUserRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FlightData, FlightLegDetail } from "@/types/quote";
import type { SegmentType } from "@/types/quote";
import { classifySegments, SEGMENT_TYPE_OPTIONS } from "@/lib/flightSegments";

/** ─────────── Types matching the new edge function ─────────── */
export interface ParsedAirfareFlight {
  ordem: number;
  companhia_aerea: string;
  numero_voo: string;
  data_saida: string;
  hora_saida: string;
  data_chegada: string;
  hora_chegada: string;
  duracao: string;
  origem_codigo: string;
  origem_nome: string;
  destino_codigo: string;
  destino_nome: string;
  numero_escalas: number;
  equipamento: string;
  cabine: string;
  base_tarifaria: string;
  bagagem_texto: string;
  bagagem_mochila_bolsa: boolean | null;
  bagagem_mao: boolean | null;
  bagagem_despachada: boolean | null;
  quantidade_bagagem_despachada: number | null;
  alerta: string;
  /** Optional segment classification (filled by AI or auto-classifier). */
  segment_type?: SegmentType;
}

export interface ParsedAirfare {
  resumo: {
    trecho_geral?: string;
    origem_inicial?: string;
    destino_final?: string;
    data_ida?: string;
    data_retorno?: string;
    quantidade_passageiros?: string;
    tipo_passageiro?: string;
    tipo_tarifa?: string;
    moeda_original?: string;
    valor_total_original?: number | null;
    valor_total_brl?: number | null;
    cambio?: number | null;
    data_cambio?: string;
  };
  voos: ParsedAirfareFlight[];
  valores: {
    tipo?: string;
    taxa_combustivel?: string;
    total_moeda_original?: number | null;
    total_brl?: number | null;
  };
  observacoes: string[];
  campos_nao_identificados: string[];
  confianca_extracao: {
    geral?: number;
    voos?: number;
    valores?: number;
    bagagem?: number;
    observacoes?: number;
  };
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

const PROGRESS_STEPS = [
  "Analisando o orçamento aéreo...",
  "Identificando voos, datas e aeroportos...",
  "Extraindo bagagens, tarifas e valores...",
  "Preparando os dados para revisão...",
];

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

/** ─────────── Mapping helpers ─────────── */

/** Convert HH:mm string safely */
const cleanTime = (t?: string) => (t ? t.trim().slice(0, 5) : "");

/** Portuguese / English short month names → 1-12 */
const MONTH_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12,
  feb: 2, apr: 4, may: 5, aug: 8,
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Normalize an AI-extracted date string into "YYYY-MM-DD".
 *  Accepts: "YYYY-MM-DD", "DD/MM/YYYY", "DD/MM", "DD MMM", "DD-MMM-YYYY".
 *  If year is missing, uses `yearHint` (or current year). */
function normalizeFlightDate(raw: string | undefined, yearHint: number): string {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s) return "";

  // ISO YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // DD/MM/YYYY or DD-MM-YYYY
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return `${y}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  }

  // DD/MM (no year)
  m = /^(\d{1,2})[\/\-.](\d{1,2})$/.exec(s);
  if (m) return `${yearHint}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;

  // DD MMM [YYYY]  (e.g. "25 Set", "25 Set 2026", "25-Set-2026")
  m = /^(\d{1,2})[\s\-\/]+([A-Za-zçÇ]{3,})\.?(?:[\s\-\/]+(\d{2,4}))?$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const monKey = m[2].toLowerCase().slice(0, 3).replace("ç", "c");
    const mo = MONTH_MAP[monKey];
    if (mo) {
      let y = m[3] ? Number(m[3]) : yearHint;
      if (y < 100) y += 2000;
      return `${y}-${pad2(mo)}-${pad2(day)}`;
    }
  }

  return "";
}

/** Map a single ParsedAirfareFlight → FlightLegDetail preserving ALL extracted fields */
function voo2leg(v: ParsedAirfareFlight, yearHint: number): FlightLegDetail {
  return {
    leg_date: normalizeFlightDate(v.data_saida, yearHint) || v.data_saida || "",
    airport_origin: v.origem_codigo || "",
    airport_destination: v.destino_codigo || "",
    departure_time: cleanTime(v.hora_saida),
    arrival_time: cleanTime(v.hora_chegada),
    flight_number: v.numero_voo || "",
    airline: v.companhia_aerea || "",
    origin_city: v.origem_nome || "",
    destination_city: v.destino_nome || "",
    duration: v.duracao || "",
    stops: typeof v.numero_escalas === "number" ? v.numero_escalas : undefined,
    equipment: v.equipamento || "",
    cabin: v.cabine || "",
    fare_basis: v.base_tarifaria || "",
    baggage_text: v.bagagem_texto || "",
    baggage_carry_on: v.bagagem_mochila_bolsa ?? null,
    baggage_hand: v.bagagem_mao ?? null,
    baggage_checked: v.bagagem_despachada ?? null,
    baggage_checked_count: v.quantidade_bagagem_despachada ?? null,
    alert: v.alerta || "",
    segment_type: v.segment_type,
  };
}

/** Map ParsedAirfare → FlightData (for prefilling the existing quote flight form) */
export function parsedAirfareToFlightData(p: ParsedAirfare): Partial<FlightData> & { __extras?: any } {
  const voos = p.voos || [];
  if (voos.length === 0) return {};

  // Infer year hint from resumo.data_ida (YYYY-MM-DD) or current year
  const isoIda = /^(\d{4})-\d{2}-\d{2}$/.exec(p.resumo?.data_ida || "");
  let yearHint = isoIda ? Number(isoIda[1]) : new Date().getFullYear();

  // Walk voos chronologically; bump year when month goes backwards (Dec → Jan)
  let lastMonth = 0;
  const allLegs: FlightLegDetail[] = voos.map((v) => {
    const leg = voo2leg(v, yearHint);
    const m = /^\d{4}-(\d{2})-\d{2}$/.exec(leg.leg_date || "");
    if (m) {
      const mo = Number(m[1]);
      if (lastMonth && mo < lastMonth) {
        yearHint += 1;
        // re-stamp this leg with the bumped year
        leg.leg_date = `${yearHint}-${String(mo).padStart(2, "0")}-${leg.leg_date!.slice(8, 10)}`;
      }
      lastMonth = mo;
    }
    return leg;
  });
  // Auto-classify segment types using the full chronological list, then re-split.
  const classified = classifySegments(allLegs);
  allLegs.forEach((leg, i) => {
    if (!leg.segment_type) leg.segment_type = classified[i];
  });

  // Distribute by segment_type so internal flights land in their own bucket.
  const outboundLegs: FlightLegDetail[] = [];
  const internalLegs: FlightLegDetail[] = [];
  const returnLegs: FlightLegDetail[] = [];
  let phase: "outbound" | "internal" | "return" = "outbound";
  for (const leg of allLegs) {
    const t = leg.segment_type;
    if (t === "return" || t === "return_connection") {
      phase = "return";
      returnLegs.push(leg);
    } else if (t === "internal") {
      if (phase === "outbound") phase = "internal";
      internalLegs.push(leg);
    } else if (t === "outbound" || t === "outbound_connection") {
      outboundLegs.push(leg);
    } else {
      if (phase === "return") returnLegs.push(leg);
      else if (phase === "internal") internalLegs.push(leg);
      else outboundLegs.push(leg);
    }
  }

  const first = voos[0];
  const mainDestinationLeg = [...outboundLegs].reverse().find((leg) => leg.segment_type === "outbound_connection") || outboundLegs[0] || allLegs[0];

  // Aggregated airlines display (e.g. "LATAM / Lufthansa")
  const airlinesSet = Array.from(new Set(voos.map((v) => v.companhia_aerea).filter(Boolean)));
  const airlines = airlinesSet.join(" / ");

  const anyChecked = voos.some(
    (v) => v.bagagem_despachada === true || (typeof v.quantidade_bagagem_despachada === "number" && v.quantidade_bagagem_despachada > 0),
  );

  const totalAdult = typeof p.resumo?.valor_total_brl === "number"
    ? p.resumo.valor_total_brl
    : typeof p.valores?.total_brl === "number"
      ? p.valores.total_brl
      : typeof p.resumo?.valor_total_original === "number"
        ? p.resumo.valor_total_original
        : typeof p.valores?.total_moeda_original === "number"
          ? p.valores.total_moeda_original
          : 0;

  // Notas: observações + alertas + base tarifária por voo + câmbio
  const noteLines: string[] = [];
  if (p.resumo?.trecho_geral) noteLines.push(`Trecho: ${p.resumo.trecho_geral}`);
  if (p.resumo?.tipo_tarifa) noteLines.push(`Tipo de tarifa: ${p.resumo.tipo_tarifa}`);
  voos.forEach((v) => {
    const parts: string[] = [];
    if (v.numero_voo) parts.push(`${v.companhia_aerea || ""} ${v.numero_voo}`.trim());
    if (v.cabine) parts.push(`cabine ${v.cabine}`);
    if (v.equipamento) parts.push(`equip. ${v.equipamento}`);
    if (v.base_tarifaria) parts.push(`base ${v.base_tarifaria}`);
    if (v.bagagem_texto) parts.push(`bagagem ${v.bagagem_texto}`);
    if (v.alerta) parts.push(`⚠ ${v.alerta}`);
    if (parts.length) noteLines.push(`• ${parts.join(" — ")}`);
  });
  if (typeof p.resumo?.cambio === "number" && p.resumo?.moeda_original) {
    const dt = p.resumo?.data_cambio ? ` (${p.resumo.data_cambio})` : "";
    noteLines.push(`Câmbio: ${p.resumo.moeda_original} 1,00 = R$ ${p.resumo.cambio.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}${dt}`);
  }
  if (typeof p.resumo?.valor_total_original === "number" && p.resumo?.moeda_original) {
    noteLines.push(`Total em ${p.resumo.moeda_original}: ${p.resumo.valor_total_original.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (typeof p.resumo?.valor_total_brl === "number") {
    noteLines.push(`Total em R$: ${p.resumo.valor_total_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (p.observacoes?.length) {
    noteLines.push("");
    noteLines.push("Observações tarifárias:");
    p.observacoes.forEach((o) => noteLines.push(`• ${o}`));
  }

  return {
    airline: airlines,
    origin_city: first.origem_nome || p.resumo?.origem_inicial || "",
    destination_city: mainDestinationLeg?.destination_city || p.resumo?.destino_final || "",
    departure_date: outboundLegs[0]?.leg_date || p.resumo?.data_ida || "",
    return_date: returnLegs.length
      ? (returnLegs[returnLegs.length - 1]?.leg_date || p.resumo?.data_retorno || "")
      : "",
    includes_baggage: anyChecked,
    includes_boarding_fee: false,
    adult_price: totalAdult,
    child_price: 0,
    notes: noteLines.join("\n"),
    outbound_legs: outboundLegs,
    return_legs: returnLegs,
    internal_legs: internalLegs,
    imported_summary: {
      fare_type: p.resumo?.tipo_tarifa || p.valores?.tipo || "",
      passengers: p.resumo?.quantidade_passageiros || "",
      passenger_type: p.resumo?.tipo_passageiro || "",
      currency: p.resumo?.moeda_original || "",
      total_original: p.resumo?.valor_total_original ?? p.valores?.total_moeda_original ?? null,
      total_brl: p.resumo?.valor_total_brl ?? p.valores?.total_brl ?? null,
      exchange_rate: p.resumo?.cambio ?? null,
      exchange_date: p.resumo?.data_cambio || "",
      fuel_tax: p.valores?.taxa_combustivel || "",
      observations: Array.isArray(p.observacoes) ? p.observacoes : [],
      unidentified_fields: Array.isArray(p.campos_nao_identificados) ? p.campos_nao_identificados : [],
      confidence: p.confianca_extracao?.geral ?? undefined,
    },
  };
}

/** ─────────── Component ─────────── */
interface Props {
  quoteId?: string;
  onCancel: () => void;
  onConfirm: (data: Partial<FlightData>, raw: ParsedAirfare) => void;
}

export function AirfareSmartImport({ quoteId, onCancel, onConfirm }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [parsed, setParsed] = useState<ParsedAirfare | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [hardError, setHardError] = useState<string | null>(null);

  // Rotate progress messages while uploading
  useEffect(() => {
    if (!isUploading) return;
    setProgressStep(0);
    const id = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(id);
  }, [isUploading]);

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Envie PDF, PNG, JPG ou JPEG.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 10MB.", variant: "destructive" });
      return;
    }
    setUploadFile(file);
  };

  const handleParse = async () => {
    const hasText = pastedText.trim().length > 0;
    if (!uploadFile && !hasText) {
      toast({ title: "Envie um arquivo ou cole um texto", variant: "destructive" });
      return;
    }
    if (hasText && pastedText.length > 40000) {
      toast({ title: "Texto muito longo", description: "Máximo de 40.000 caracteres.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setParsed(null);
    setDebugInfo(null);
    setHardError(null);
    let storagePath: string | null = null;

    try {
      // 1) Upload do arquivo original para storage privado
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (userId && uploadFile) {
        const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "bin";
        storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("airfare-imports").upload(storagePath, uploadFile, {
          contentType: uploadFile.type,
          upsert: false,
        });
        if (up.error) {
          console.warn("Upload do arquivo original falhou:", up.error.message);
          storagePath = null;
        }
      }

      // 2) Base64 + texto auxiliar (PDF)
      const fileBase64 = uploadFile ? await fileToBase64(uploadFile) : undefined;
      let extractedText = hasText ? pastedText.trim() : "";
      if (uploadFile && uploadFile.type === "application/pdf") {
        try {
          const pdfText = await extractPdfText(uploadFile);
          extractedText = extractedText ? `${extractedText}\n\n${pdfText}` : pdfText;
        } catch (e) {
          console.warn("PDF text extraction failed:", e);
        }
      }

      // 3) Chama Edge Function
      const { data, error } = await supabase.functions.invoke("import-airfare-document", {
        body: {
          fileBase64,
          fileMimeType: uploadFile?.type,
          fileName: uploadFile?.name,
          fileUrl: storagePath,
          text: extractedText || undefined,
          quoteId,
        },
      });

      // Em caso de erro HTTP, tenta extrair o body estruturado de debug
      let body: any = data;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") body = await ctx.json();
        } catch { /* noop */ }
      }

      // Captura debug info
      setDebugInfo({
        stage: body?.stage,
        error_type: body?.error_type,
        error_message: body?.error_message || body?.error,
        raw_ai_response: body?.raw_ai_response,
        partial_data: body?.partial_data,
        confidence_score: body?.confidence_score,
        success: body?.success,
      });

      // Extrai dados (ParsedAirfare) — tanto de success quanto de partial_data
      const candidate: ParsedAirfare | null =
        (body?.success && (body?.data || body)) ||
        (body?.partial_data && Object.keys(body.partial_data || {}).length > 0 ? body.partial_data : null);

      const voos = Array.isArray(candidate?.voos) ? candidate!.voos : [];
      const resumo = candidate?.resumo || {};
      const hasUseful =
        voos.length > 0 ||
        !!resumo?.trecho_geral ||
        !!resumo?.origem_inicial ||
        !!resumo?.destino_final;

      if (!hasUseful) {
        const msg = body?.error_message || body?.error ||
          "Não foi possível identificar voos ou trechos no documento. Tente uma imagem mais nítida.";
        setHardError(msg);
        toast({ title: "Erro na importação", description: msg, variant: "destructive" });
        return;
      }

      // Abre a tela de revisão mesmo com confiança baixa / dados parciais
      const result: ParsedAirfare = {
        resumo: candidate!.resumo || {},
        voos,
        valores: candidate!.valores || {},
        observacoes: Array.isArray(candidate!.observacoes) ? candidate!.observacoes : [],
        campos_nao_identificados: Array.isArray(candidate!.campos_nao_identificados) ? candidate!.campos_nao_identificados : [],
        confianca_extracao: candidate!.confianca_extracao || {},
      };
      // Auto-classify segment types for any voo that didn't come pre-classified from the AI.
      try {
        const legs = result.voos.map(v => ({
          airport_origin: v.origem_codigo,
          airport_destination: v.destino_codigo,
          leg_date: v.data_saida,
          departure_time: v.hora_saida,
          arrival_time: v.hora_chegada,
        }));
        const types = classifySegments(legs);
        result.voos = result.voos.map((v, i) => ({ ...v, segment_type: v.segment_type || types[i] }));
      } catch { /* noop */ }
      setParsed(result);

      const conf = result.confianca_extracao?.geral ?? 0;
      const confPct = Math.round(conf * 100);
      if (conf < 0.5) {
        toast({
          title: "Dados parciais identificados",
          description: `Confiança ${confPct}%. Revise os campos destacados antes de aplicar.`,
        });
      } else if (conf < 0.8) {
        toast({
          title: "Importação concluída com ressalvas",
          description: `Confiança ${confPct}%. Confira os campos destacados.`,
        });
      } else {
        toast({
          title: "Importação concluída",
          description: "Confira os dados antes de aplicar ao orçamento.",
        });
      }
    } catch (e: any) {
      const msg = e?.message || "Não foi possível identificar os dados do orçamento com precisão.";
      setHardError(msg);
      toast({
        title: "Erro na importação",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  /* ─────────── REVIEW SCREEN ─────────── */
  if (parsed) {
    return (
      <>
        <ReviewScreen
          data={parsed}
          onChange={setParsed}
          onCancel={() => {
            setParsed(null);
            setUploadFile(null);
            setDebugInfo(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onConfirm={() => {
            const mapped = parsedAirfareToFlightData(parsed);
            onConfirm(mapped, parsed);
          }}
          isAdmin={isAdmin}
          onShowDebug={debugInfo ? () => setShowDebug(true) : undefined}
        />
        <DebugDialog open={showDebug} onOpenChange={setShowDebug} info={debugInfo} />
      </>
    );
  }

  /* ─────────── UPLOAD SCREEN ─────────── */
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Importação inteligente de orçamento aéreo</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Envie um PDF, imagem ou cole o texto do orçamento (e-mail, WhatsApp, GDS, itinerário).
          A IA lê voos, datas, bagagens, tarifas e abre uma tela de revisão antes de aplicar
          no formulário.
        </p>

        {!isUploading && (
          <>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Arquivo (PDF, PNG, JPG, JPEG — máx 10MB)
              </Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                className="mt-1 cursor-pointer"
                onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {uploadFile.name} • {(uploadFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 my-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Label className="text-xs font-medium text-muted-foreground">
                Colar texto (e-mail, WhatsApp, GDS, itinerário)
              </Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui o texto do orçamento, confirmação ou itinerário da passagem aérea..."
                className="mt-1 min-h-[140px] font-mono text-xs"
                maxLength={40000}
              />
              {pastedText.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {pastedText.length.toLocaleString("pt-BR")} caracteres
                </p>
              )}
            </div>

            {hardError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-2">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{hardError}</span>
                </div>
                {isAdmin && debugInfo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(true)}
                    className="w-full"
                  >
                    <Bug className="h-3 w-3 mr-1" /> Ver detalhes técnicos da importação
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Voltar
              </Button>
              <Button type="button" onClick={handleParse} disabled={!uploadFile && !pastedText.trim()} className="flex-1">
                <Upload className="h-4 w-4 mr-2" /> Importar com IA
              </Button>
            </div>
          </>
        )}

        {isUploading && (
          <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{PROGRESS_STEPS[progressStep]}</p>
            <div className="flex justify-center gap-1">
              {PROGRESS_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${i <= progressStep ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        )}
        <DebugDialog open={showDebug} onOpenChange={setShowDebug} info={debugInfo} />
      </CardContent>
    </Card>
  );
}

/* ──────────────────────── DEBUG DIALOG (admin only) ──────────────────────── */
function DebugDialog({
  open, onOpenChange, info,
}: { open: boolean; onOpenChange: (v: boolean) => void; info: any }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4" /> Detalhes técnicos da importação
          </DialogTitle>
        </DialogHeader>
        {!info ? (
          <p className="text-sm text-muted-foreground">Sem informações.</p>
        ) : (
          <div className="space-y-3 text-xs">
            <DebugRow label="Etapa" value={info.stage || "—"} />
            <DebugRow label="Tipo de erro" value={info.error_type || "—"} />
            <DebugRow label="Mensagem" value={info.error_message || "—"} />
            <DebugRow label="Confiança" value={info.confidence_score != null ? `${Math.round((info.confidence_score || 0) * 100)}%` : "—"} />
            {info.raw_ai_response && (
              <div>
                <div className="font-medium mb-1">Resposta bruta da IA</div>
                <pre className="rounded border bg-muted/30 p-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                  {String(info.raw_ai_response).slice(0, 4000)}
                </pre>
              </div>
            )}
            {info.partial_data && Object.keys(info.partial_data).length > 0 && (
              <div>
                <div className="font-medium mb-1">Dados parciais extraídos</div>
                <pre className="rounded border bg-muted/30 p-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(info.partial_data, null, 2).slice(0, 4000)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[110px]">{label}:</span>
      <span className="break-all">{value}</span>
    </div>
  );
}

/* ──────────────────────── REVIEW SCREEN ──────────────────────── */
function ReviewScreen({
  data,
  onChange,
  onCancel,
  onConfirm,
  isAdmin,
  onShowDebug,
}: {
  data: ParsedAirfare;
  onChange: (d: ParsedAirfare) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isAdmin?: boolean;
  onShowDebug?: () => void;
}) {
  const conf = data.confianca_extracao?.geral ?? 0;
  const lowConf = conf > 0 && conf < 0.8;
  const veryLowConf = conf > 0 && conf < 0.5;

  const updateResumo = (field: string, value: any) =>
    onChange({ ...data, resumo: { ...data.resumo, [field]: value } });
  const updateValores = (field: string, value: any) =>
    onChange({ ...data, valores: { ...data.valores, [field]: value } });
  const updateVoo = (idx: number, field: keyof ParsedAirfareFlight, value: any) =>
    onChange({ ...data, voos: data.voos.map((v, i) => (i === idx ? { ...v, [field]: value } : v)) });
  const reclassifySegments = () => {
    const legs = data.voos.map(v => ({
      airport_origin: v.origem_codigo,
      airport_destination: v.destino_codigo,
      leg_date: v.data_saida,
      departure_time: v.hora_saida,
      arrival_time: v.hora_chegada,
    }));
    const types = classifySegments(legs);
    onChange({ ...data, voos: data.voos.map((v, i) => ({ ...v, segment_type: types[i] })) });
  };
  const removeVoo = (idx: number) =>
    onChange({ ...data, voos: data.voos.filter((_, i) => i !== idx).map((v, i) => ({ ...v, ordem: i + 1 })) });
  const addVoo = () =>
    onChange({
      ...data,
      voos: [
        ...data.voos,
        {
          ordem: data.voos.length + 1,
          companhia_aerea: "", numero_voo: "",
          data_saida: "", hora_saida: "", data_chegada: "", hora_chegada: "",
          duracao: "", origem_codigo: "", origem_nome: "",
          destino_codigo: "", destino_nome: "", numero_escalas: 0,
          equipamento: "", cabine: "", base_tarifaria: "",
          bagagem_texto: "", bagagem_mochila_bolsa: null, bagagem_mao: null,
          bagagem_despachada: null, quantidade_bagagem_despachada: null, alerta: "",
        },
      ],
    });
  const updateObs = (idx: number, value: string) =>
    onChange({ ...data, observacoes: data.observacoes.map((o, i) => (i === idx ? value : o)) });
  const removeObs = (idx: number) =>
    onChange({ ...data, observacoes: data.observacoes.filter((_, i) => i !== idx) });
  const addObs = () => onChange({ ...data, observacoes: [...(data.observacoes || []), ""] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Revise os dados antes de aplicar</h3>
        </div>
        <Badge variant={lowConf ? "destructive" : "default"}>
          Confiança: {Math.round(conf * 100)}%
        </Badge>
      </div>

      {lowConf && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {veryLowConf
              ? "Alguns dados foram identificados com baixa confiança. Revise os campos destacados antes de aplicar ao orçamento."
              : "Alguns dados não foram identificados com segurança. Revise os campos destacados antes de continuar."}
          </span>
        </div>
      )}

      {/* RESUMO */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Resumo da viagem</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Trecho geral" value={data.resumo?.trecho_geral || ""} onChange={(v) => updateResumo("trecho_geral", v)} />
            <Field label="Tipo de tarifa" value={data.resumo?.tipo_tarifa || ""} onChange={(v) => updateResumo("tipo_tarifa", v)} placeholder="RT / OW / MT" />
            <Field label="Origem inicial" value={data.resumo?.origem_inicial || ""} onChange={(v) => updateResumo("origem_inicial", v)} />
            <Field label="Destino final" value={data.resumo?.destino_final || ""} onChange={(v) => updateResumo("destino_final", v)} />
            <Field label="Data ida" value={data.resumo?.data_ida || ""} onChange={(v) => updateResumo("data_ida", v)} placeholder="AAAA-MM-DD" />
            <Field label="Data retorno" value={data.resumo?.data_retorno || ""} onChange={(v) => updateResumo("data_retorno", v)} placeholder="AAAA-MM-DD" />
            <Field label="Passageiros" value={data.resumo?.quantidade_passageiros || ""} onChange={(v) => updateResumo("quantidade_passageiros", v)} />
            <Field label="Tipo passageiro" value={data.resumo?.tipo_passageiro || ""} onChange={(v) => updateResumo("tipo_passageiro", v)} placeholder="ADT / CHD / INF" />
          </div>
        </CardContent>
      </Card>

      {/* VOOS */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Voos identificados ({data.voos.length})</h4>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={reclassifySegments}>
                Reclassificar trechos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addVoo}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar voo
              </Button>
            </div>
          </div>

          {data.voos.map((v, idx) => (
            <div key={idx} className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Plane className="h-4 w-4 text-primary" />
                  Trecho {idx + 1}
                  {v.alerta && (
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Alerta
                    </Badge>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVoo(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Field label="Companhia" value={v.companhia_aerea} onChange={(val) => updateVoo(idx, "companhia_aerea", val)} />
                <Field label="Nº voo" value={v.numero_voo} onChange={(val) => updateVoo(idx, "numero_voo", val)} />
                <Field label="Cabine" value={v.cabine} onChange={(val) => updateVoo(idx, "cabine", val)} />
                <Field label="Equipamento" value={v.equipamento} onChange={(val) => updateVoo(idx, "equipamento", val)} />
                <Field label="Origem (IATA)" value={v.origem_codigo} onChange={(val) => updateVoo(idx, "origem_codigo", val.toUpperCase())} />
                <Field label="Origem (cidade)" value={v.origem_nome} onChange={(val) => updateVoo(idx, "origem_nome", val)} />
                <Field label="Destino (IATA)" value={v.destino_codigo} onChange={(val) => updateVoo(idx, "destino_codigo", val.toUpperCase())} />
                <Field label="Destino (cidade)" value={v.destino_nome} onChange={(val) => updateVoo(idx, "destino_nome", val)} />
                <Field label="Data saída" value={v.data_saida} onChange={(val) => updateVoo(idx, "data_saida", val)} placeholder="AAAA-MM-DD" />
                <Field label="Hora saída" value={v.hora_saida} onChange={(val) => updateVoo(idx, "hora_saida", val)} placeholder="HH:mm" />
                <Field label="Data chegada" value={v.data_chegada} onChange={(val) => updateVoo(idx, "data_chegada", val)} placeholder="AAAA-MM-DD" />
                <Field label="Hora chegada" value={v.hora_chegada} onChange={(val) => updateVoo(idx, "hora_chegada", val)} placeholder="HH:mm" />
                <Field label="Duração" value={v.duracao} onChange={(val) => updateVoo(idx, "duracao", val)} placeholder="HH:mm" />
                <Field label="Escalas" value={String(v.numero_escalas ?? 0)} onChange={(val) => updateVoo(idx, "numero_escalas", parseInt(val) || 0)} />
                <Field label="Base tarifária" value={v.base_tarifaria} onChange={(val) => updateVoo(idx, "base_tarifaria", val)} />
                <Field label="Bagagem (texto)" value={v.bagagem_texto} onChange={(val) => updateVoo(idx, "bagagem_texto", val)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo do trecho</Label>
                  <select
                    value={v.segment_type || ""}
                    onChange={(e) => updateVoo(idx, "segment_type", (e.target.value || undefined) as any)}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Não classificado</option>
                    {SEGMENT_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {v.alerta && (
                <Field label="Alerta" value={v.alerta} onChange={(val) => updateVoo(idx, "alerta", val)} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VALORES */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Valores</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Tipo" value={data.valores?.tipo || ""} onChange={(v) => updateValores("tipo", v)} />
            <Field label="Taxa combustível" value={data.valores?.taxa_combustivel || ""} onChange={(v) => updateValores("taxa_combustivel", v)} />
            <Field label="Moeda original" value={data.resumo?.moeda_original || ""} onChange={(v) => updateResumo("moeda_original", v)} placeholder="USD, EUR, BRL..." />
            <Field label="Total moeda original" type="number" value={data.resumo?.valor_total_original ?? ""} onChange={(v) => updateResumo("valor_total_original", v === "" ? null : parseFloat(v))} />
            <Field label="Total em R$" type="number" value={data.resumo?.valor_total_brl ?? ""} onChange={(v) => updateResumo("valor_total_brl", v === "" ? null : parseFloat(v))} />
            <Field label="Câmbio" type="number" value={data.resumo?.cambio ?? ""} onChange={(v) => updateResumo("cambio", v === "" ? null : parseFloat(v))} />
            <Field label="Data do câmbio" value={data.resumo?.data_cambio || ""} onChange={(v) => updateResumo("data_cambio", v)} placeholder="AAAA-MM-DD" />
          </div>
        </CardContent>
      </Card>

      {/* OBSERVAÇÕES */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Observações tarifárias</h4>
            <Button type="button" variant="outline" size="sm" onClick={addObs}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
          {(data.observacoes || []).map((o, idx) => (
            <div key={idx} className="flex gap-2">
              <Textarea
                value={o}
                onChange={(e) => updateObs(idx, e.target.value)}
                className="text-sm"
                rows={2}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeObs(idx)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {(!data.observacoes || data.observacoes.length === 0) && (
            <p className="text-xs text-muted-foreground italic">Nenhuma observação identificada.</p>
          )}
        </CardContent>
      </Card>

      {/* CAMPOS NÃO IDENTIFICADOS */}
      {data.campos_nao_identificados?.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Campos não identificados:</div>
            <div className="text-xs">{data.campos_nao_identificados.join(", ")}</div>
          </div>
        </div>
      )}

      {/* AÇÕES */}
      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 pb-1 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        {isAdmin && onShowDebug && (
          <Button type="button" variant="outline" onClick={onShowDebug}>
            <Bug className="h-3 w-3 mr-1" /> Detalhes técnicos
          </Button>
        )}
        <Button type="button" onClick={onConfirm} className="flex-1">
          <ArrowRight className="h-4 w-4 mr-1" /> Aplicar ao orçamento
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value as any}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-9 text-sm"
      />
    </div>
  );
}