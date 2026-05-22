import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Hotel, CheckCircle2, AlertTriangle, X, Trash2, Plus, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractPdfText } from "@/lib/pdfText";
import { useUserRole } from "@/hooks/useUserRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HotelData } from "@/types/quote";

/** ─────────── Types matching the edge function ─────────── */
export interface ParsedHotelTaxa {
  nome?: string;
  valor?: number | null;
  moeda?: string;
}

export interface ParsedHotel {
  nome_hotel?: string;
  cidade?: string;
  pais?: string;
  endereco?: string;
  check_in?: string;
  check_out?: string;
  horario_check_in?: string;
  horario_check_out?: string;
  noites?: number | null;
  tipo_acomodacao?: string;
  categoria_quarto?: string;
  regime_alimentacao?: string;
  hospedes_adultos?: number | null;
  hospedes_criancas?: number | null;
  hospedes_total?: number | null;
  quantidade_quartos?: number | null;
  moeda?: string;
  valor_total?: number | null;
  valor_total_brl?: number | null;
  valor_diaria?: number | null;
  cambio?: number | null;
  data_cambio?: string;
  taxas?: ParsedHotelTaxa[];
  politica_cancelamento?: string;
  inclusos?: string[];
  nao_inclusos?: string[];
  observacoes?: string[];
  codigo_reserva?: string;
  localizador?: string;
  link_reserva?: string;
  fornecedor?: string;
  campos_nao_identificados?: string[];
  confianca_extracao?: {
    geral?: number;
    dados_principais?: number;
    valores?: number;
    politicas?: number;
  };
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

const PROGRESS_STEPS = [
  "Analisando a reserva de hospedagem...",
  "Identificando hotel, cidade e datas...",
  "Extraindo valores, taxas e políticas...",
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

/** Portuguese / English short month names → 1-12 */
const MONTH_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12,
  feb: 2, apr: 4, may: 5, aug: 8,
};
const pad2 = (n: number) => String(n).padStart(2, "0");

function normalizeDate(raw: string | undefined, yearHint: number): string {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim();
  if (!s) return "";
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return `${y}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  }
  m = /^(\d{1,2})[\/\-.](\d{1,2})$/.exec(s);
  if (m) return `${yearHint}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
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

const MEAL_PLAN_MAP: Array<[RegExp, string]> = [
  [/all\s*inclusive|tudo\s*incluso/i, "all_inclusive"],
  [/pens(ã|a)o\s*completa|full\s*board/i, "pensao_completa"],
  [/meia\s*pens(ã|a)o|half\s*board/i, "meia_pensao"],
  [/caf(é|e)\s*da\s*manh(ã|a)|breakfast|bed\s*&?\s*breakfast|b&b/i, "cafe"],
  [/sem\s*refei(ç|c)(ã|a)o|room\s*only|sem\s*caf(é|e)/i, "sem_refeicao"],
];
function mapMealPlan(raw?: string): string {
  if (!raw) return "";
  for (const [re, val] of MEAL_PLAN_MAP) if (re.test(raw)) return val;
  return "";
}

const ROOM_TYPE_MAP: Array<[RegExp, string]> = [
  [/su(í|i)te\s*j(ú|u)nior|junior\s*suite/i, "suite_junior"],
  [/su(í|i)te|suite/i, "suite"],
  [/deluxe/i, "deluxe"],
  [/superior/i, "superior"],
  [/standard|standart|cl(á|a)ssico|classic/i, "standard"],
];
function mapRoomType(raw?: string): string {
  if (!raw) return "";
  for (const [re, val] of ROOM_TYPE_MAP) if (re.test(raw)) return val;
  return "";
}

/** Map ParsedHotel → HotelData for prefilling the existing quote hotel form. */
export function parsedHotelToHotelData(p: ParsedHotel): Partial<HotelData> {
  const yearHint = new Date().getFullYear();
  const check_in = normalizeDate(p.check_in, yearHint);
  const check_out = normalizeDate(p.check_out, yearHint);
  const total = typeof p.valor_total_brl === "number"
    ? p.valor_total_brl
    : typeof p.valor_total === "number" ? p.valor_total : 0;

  const notes: string[] = [];
  if (p.fornecedor) notes.push(`Fornecedor: ${p.fornecedor}`);
  if (p.codigo_reserva) notes.push(`Reserva: ${p.codigo_reserva}`);
  if (p.localizador && p.localizador !== p.codigo_reserva) notes.push(`Localizador: ${p.localizador}`);
  if (p.link_reserva) notes.push(`Link: ${p.link_reserva}`);
  if (p.endereco) notes.push(`Endereço: ${p.endereco}`);
  if (p.horario_check_in) notes.push(`Check-in a partir de ${p.horario_check_in}`);
  if (p.horario_check_out) notes.push(`Check-out até ${p.horario_check_out}`);
  if (typeof p.noites === "number") notes.push(`Noites: ${p.noites}`);
  if (p.hospedes_adultos || p.hospedes_criancas || p.hospedes_total) {
    const parts: string[] = [];
    if (p.hospedes_adultos) parts.push(`${p.hospedes_adultos} adulto(s)`);
    if (p.hospedes_criancas) parts.push(`${p.hospedes_criancas} criança(s)`);
    if (!parts.length && p.hospedes_total) parts.push(`${p.hospedes_total} hóspede(s)`);
    if (parts.length) notes.push(`Hóspedes: ${parts.join(", ")}`);
  }
  if (p.quantidade_quartos) notes.push(`Quartos: ${p.quantidade_quartos}`);
  if (p.tipo_acomodacao || p.categoria_quarto) {
    notes.push(`Acomodação: ${[p.categoria_quarto, p.tipo_acomodacao].filter(Boolean).join(" — ")}`);
  }
  if (p.regime_alimentacao) notes.push(`Regime: ${p.regime_alimentacao}`);
  if (typeof p.valor_diaria === "number") {
    notes.push(`Diária: ${p.moeda || "R$"} ${p.valor_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (typeof p.valor_total === "number" && p.moeda && p.moeda.toUpperCase() !== "BRL") {
    notes.push(`Total em ${p.moeda}: ${p.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (typeof p.valor_total_brl === "number") {
    notes.push(`Total em R$: ${p.valor_total_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (typeof p.cambio === "number" && p.moeda) {
    const dt = p.data_cambio ? ` (${p.data_cambio})` : "";
    notes.push(`Câmbio: ${p.moeda} 1,00 = R$ ${p.cambio.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}${dt}`);
  }
  if (p.taxas && p.taxas.length) {
    notes.push("");
    notes.push("Taxas:");
    p.taxas.forEach((t) => {
      const v = typeof t.valor === "number" ? ` ${t.moeda || ""} ${t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`.trim() : "";
      notes.push(`• ${t.nome || "Taxa"}${v ? ` — ${v}` : ""}`);
    });
  }
  if (p.inclusos && p.inclusos.length) {
    notes.push("");
    notes.push("Inclusos:");
    p.inclusos.forEach((i) => notes.push(`• ${i}`));
  }
  if (p.nao_inclusos && p.nao_inclusos.length) {
    notes.push("");
    notes.push("Não inclusos:");
    p.nao_inclusos.forEach((i) => notes.push(`• ${i}`));
  }
  if (p.politica_cancelamento) {
    notes.push("");
    notes.push("Política de cancelamento:");
    notes.push(p.politica_cancelamento);
  }
  if (p.observacoes && p.observacoes.length) {
    notes.push("");
    notes.push("Observações:");
    p.observacoes.forEach((o) => notes.push(`• ${o}`));
  }

  return {
    hotel_name: p.nome_hotel || "",
    city: [p.cidade, p.pais].filter(Boolean).join(", "),
    check_in,
    check_out,
    room_type: mapRoomType(p.categoria_quarto || p.tipo_acomodacao),
    meal_plan: mapMealPlan(p.regime_alimentacao),
    price: total,
    notes: notes.join("\n"),
  };
}

/** ─────────── Component ─────────── */
interface Props {
  quoteId?: string;
  onCancel: () => void;
  onConfirm: (data: Partial<HotelData>, raw: ParsedHotel) => void;
}

export function HotelSmartImport({ quoteId, onCancel, onConfirm }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [parsed, setParsed] = useState<ParsedHotel | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [hardError, setHardError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUploading) return;
    setProgressStep(0);
    const id = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(id);
  }, [isUploading]);

  const handleFileSelected = (file: File | null) => {
    if (!file) { setUploadFile(null); return; }
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
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (userId && uploadFile) {
        const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "bin";
        storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("hotel-imports").upload(storagePath, uploadFile, {
          contentType: uploadFile.type,
          upsert: false,
        });
        if (up.error) {
          console.warn("Upload do arquivo original falhou:", up.error.message);
          storagePath = null;
        }
      }

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

      const { data, error } = await supabase.functions.invoke("import-hotel-document", {
        body: {
          fileBase64,
          fileMimeType: uploadFile?.type,
          fileName: uploadFile?.name,
          fileUrl: storagePath,
          text: extractedText || undefined,
          quoteId,
        },
      });

      let body: any = data;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") body = await ctx.json();
        } catch { /* noop */ }
      }

      setDebugInfo({
        stage: body?.stage,
        error_type: body?.error_type,
        error_message: body?.error_message || body?.error,
        raw_ai_response: body?.raw_ai_response,
        partial_data: body?.partial_data,
        confidence_score: body?.confidence_score,
        success: body?.success,
      });

      const candidate: ParsedHotel | null =
        (body?.success && (body?.data || body)) ||
        (body?.partial_data && Object.keys(body.partial_data || {}).length > 0 ? body.partial_data : null);

      const hasUseful = !!(
        candidate?.nome_hotel ||
        candidate?.cidade ||
        candidate?.check_in ||
        candidate?.check_out ||
        candidate?.codigo_reserva ||
        candidate?.localizador ||
        typeof candidate?.valor_total === "number" ||
        typeof candidate?.valor_total_brl === "number"
      );

      if (!hasUseful) {
        const msg = body?.error_message || body?.error ||
          "Não foi possível identificar dados da hospedagem. Tente uma imagem mais nítida.";
        setHardError(msg);
        toast({ title: "Erro na importação", description: msg, variant: "destructive" });
        return;
      }

      setParsed(candidate!);

      const conf = candidate!.confianca_extracao?.geral ?? 0;
      const confPct = Math.round(conf * 100);
      if (conf < 0.5) {
        toast({ title: "Dados parciais identificados", description: `Confiança ${confPct}%. Revise os campos antes de aplicar.` });
      } else if (conf < 0.8) {
        toast({ title: "Importação concluída com ressalvas", description: `Confiança ${confPct}%. Confira os campos.` });
      } else {
        toast({ title: "Importação concluída", description: "Confira os dados antes de aplicar ao orçamento." });
      }
    } catch (e: any) {
      const msg = e?.message || "Não foi possível identificar os dados da reserva com precisão.";
      setHardError(msg);
      toast({ title: "Erro na importação", description: msg, variant: "destructive" });
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
            const mapped = parsedHotelToHotelData(parsed);
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
          <Hotel className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Importação inteligente de hospedagem</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Envie um PDF, imagem ou cole o texto da reserva/orçamento de hospedagem (e-mail de confirmação,
          voucher, WhatsApp, Booking, Hotelbeds, operadora...). A IA lê nome do hotel, cidade, datas,
          regime, valores e taxas, e abre uma tela de revisão antes de aplicar no formulário.
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
                Colar texto (e-mail, WhatsApp, voucher, confirmação)
              </Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui o texto da reserva, confirmação ou voucher de hospedagem..."
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

/* ─────────── DEBUG DIALOG ─────────── */
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

/* ─────────── REVIEW SCREEN ─────────── */
function ReviewScreen({
  data, onChange, onCancel, onConfirm, isAdmin, onShowDebug,
}: {
  data: ParsedHotel;
  onChange: (d: ParsedHotel) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isAdmin?: boolean;
  onShowDebug?: () => void;
}) {
  const conf = data.confianca_extracao?.geral ?? 0;
  const lowConf = conf > 0 && conf < 0.8;
  const veryLowConf = conf > 0 && conf < 0.5;

  const update = (field: keyof ParsedHotel, value: any) => onChange({ ...data, [field]: value });
  const updateTax = (i: number, field: keyof ParsedHotelTaxa, value: any) =>
    onChange({ ...data, taxas: (data.taxas || []).map((t, idx) => idx === i ? { ...t, [field]: value } : t) });
  const removeTax = (i: number) =>
    onChange({ ...data, taxas: (data.taxas || []).filter((_, idx) => idx !== i) });
  const addTax = () =>
    onChange({ ...data, taxas: [...(data.taxas || []), { nome: "", valor: null, moeda: data.moeda || "BRL" }] });

  const updateListItem = (key: "inclusos" | "nao_inclusos" | "observacoes", i: number, value: string) =>
    onChange({ ...data, [key]: (data[key] || []).map((o, idx) => idx === i ? value : o) });
  const removeListItem = (key: "inclusos" | "nao_inclusos" | "observacoes", i: number) =>
    onChange({ ...data, [key]: (data[key] || []).filter((_, idx) => idx !== i) });
  const addListItem = (key: "inclusos" | "nao_inclusos" | "observacoes") =>
    onChange({ ...data, [key]: [...(data[key] || []), ""] });

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
              ? "Alguns dados foram identificados com baixa confiança. Revise os campos antes de aplicar."
              : "Alguns dados não foram identificados com segurança. Revise os campos antes de continuar."}
          </span>
        </div>
      )}

      {/* HOTEL & LOCATION */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Hotel e localização</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome do hotel" value={data.nome_hotel || ""} onChange={(v) => update("nome_hotel", v)} />
            <Field label="Fornecedor / Operadora" value={data.fornecedor || ""} onChange={(v) => update("fornecedor", v)} />
            <Field label="Cidade" value={data.cidade || ""} onChange={(v) => update("cidade", v)} />
            <Field label="País" value={data.pais || ""} onChange={(v) => update("pais", v)} />
            <Field label="Endereço" value={data.endereco || ""} onChange={(v) => update("endereco", v)} className="sm:col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* STAY */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Estada</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Check-in" value={data.check_in || ""} onChange={(v) => update("check_in", v)} placeholder="AAAA-MM-DD" />
            <Field label="Check-out" value={data.check_out || ""} onChange={(v) => update("check_out", v)} placeholder="AAAA-MM-DD" />
            <Field label="Horário check-in" value={data.horario_check_in || ""} onChange={(v) => update("horario_check_in", v)} placeholder="HH:mm" />
            <Field label="Horário check-out" value={data.horario_check_out || ""} onChange={(v) => update("horario_check_out", v)} placeholder="HH:mm" />
            <Field label="Noites" value={data.noites != null ? String(data.noites) : ""} onChange={(v) => update("noites", v ? Number(v) : null)} />
            <Field label="Quartos" value={data.quantidade_quartos != null ? String(data.quantidade_quartos) : ""} onChange={(v) => update("quantidade_quartos", v ? Number(v) : null)} />
            <Field label="Hóspedes (adultos)" value={data.hospedes_adultos != null ? String(data.hospedes_adultos) : ""} onChange={(v) => update("hospedes_adultos", v ? Number(v) : null)} />
            <Field label="Hóspedes (crianças)" value={data.hospedes_criancas != null ? String(data.hospedes_criancas) : ""} onChange={(v) => update("hospedes_criancas", v ? Number(v) : null)} />
            <Field label="Tipo de acomodação" value={data.tipo_acomodacao || ""} onChange={(v) => update("tipo_acomodacao", v)} placeholder="Ex.: Suíte, Quarto Duplo..." />
            <Field label="Categoria do quarto" value={data.categoria_quarto || ""} onChange={(v) => update("categoria_quarto", v)} placeholder="Ex.: Deluxe, Standard..." />
            <Field label="Regime de alimentação" value={data.regime_alimentacao || ""} onChange={(v) => update("regime_alimentacao", v)} placeholder="Ex.: Café da manhã, All Inclusive..." className="sm:col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* VALORES */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Valores</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Moeda" value={data.moeda || ""} onChange={(v) => update("moeda", v.toUpperCase())} placeholder="BRL / USD / EUR" />
            <Field label="Valor total" value={data.valor_total != null ? String(data.valor_total) : ""} onChange={(v) => update("valor_total", v ? Number(v) : null)} />
            <Field label="Valor total em R$" value={data.valor_total_brl != null ? String(data.valor_total_brl) : ""} onChange={(v) => update("valor_total_brl", v ? Number(v) : null)} />
            <Field label="Valor diária" value={data.valor_diaria != null ? String(data.valor_diaria) : ""} onChange={(v) => update("valor_diaria", v ? Number(v) : null)} />
            <Field label="Câmbio" value={data.cambio != null ? String(data.cambio) : ""} onChange={(v) => update("cambio", v ? Number(v) : null)} />
            <Field label="Data câmbio" value={data.data_cambio || ""} onChange={(v) => update("data_cambio", v)} placeholder="AAAA-MM-DD" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Taxas adicionais</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTax}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar taxa
              </Button>
            </div>
            {(data.taxas || []).map((t, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_auto] gap-2 items-end">
                <Field label="Nome" value={t.nome || ""} onChange={(v) => updateTax(i, "nome", v)} />
                <Field label="Valor" value={t.valor != null ? String(t.valor) : ""} onChange={(v) => updateTax(i, "valor", v ? Number(v) : null)} />
                <Field label="Moeda" value={t.moeda || ""} onChange={(v) => updateTax(i, "moeda", v.toUpperCase())} />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTax(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RESERVA */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Identificação da reserva</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Código da reserva" value={data.codigo_reserva || ""} onChange={(v) => update("codigo_reserva", v)} />
            <Field label="Localizador" value={data.localizador || ""} onChange={(v) => update("localizador", v)} />
            <Field label="Link da reserva" value={data.link_reserva || ""} onChange={(v) => update("link_reserva", v)} className="sm:col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* POLÍTICAS / OBS */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">Políticas e observações</h4>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Política de cancelamento</Label>
            <Textarea
              value={data.politica_cancelamento || ""}
              onChange={(e) => update("politica_cancelamento", e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>

          {(["inclusos", "nao_inclusos", "observacoes"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  {key === "inclusos" ? "Inclusos" : key === "nao_inclusos" ? "Não inclusos" : "Observações"}
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addListItem(key)}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {(data[key] || []).map((o, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Textarea
                    value={o}
                    onChange={(e) => updateListItem(key, i, e.target.value)}
                    className="min-h-[44px] text-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeListItem(key, i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-end">
        {isAdmin && onShowDebug && (
          <Button type="button" variant="ghost" size="sm" onClick={onShowDebug}>
            <Bug className="h-3 w-3 mr-1" /> Debug
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancelar
        </Button>
        <Button type="button" onClick={onConfirm}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Aplicar ao formulário
        </Button>
      </div>
    </div>
  );
}

/* ─────────── Small helpers ─────────── */
function Field({
  label, value, onChange, placeholder, className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}