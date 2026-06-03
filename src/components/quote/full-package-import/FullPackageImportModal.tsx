import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Upload, Sparkles, PackageOpen, AlertTriangle, CheckCircle2, X,
  Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Map, Package,
  ArrowRight, ArrowLeft, SkipForward, Bug,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractPdfText } from "@/lib/pdfText";
import type { ServiceType } from "@/types/quote";
import { parsedAirfareToFlightData, type ParsedAirfare } from "@/components/quote/flight-wizard/AirfareSmartImport";
import { parsedHotelToHotelData, type ParsedHotel } from "@/components/quote/hotel-import/HotelSmartImport";
import { parsedCarToCarData, type ParsedCarRental } from "@/components/quote/car-rental-import/CarRentalSmartImport";
import { SERVICE_IMPORT_CONFIGS } from "@/components/quote/service-import/serviceImportConfigs";
import type { GenericServiceKey } from "@/components/quote/service-import/GenericServiceSmartImport";

/* ─────────────── Types ─────────────── */

interface AiBlock {
  id: string;
  type: ServiceType;
  confidence: number;
  label: string;
  raw_excerpt: string;
  missing_fields: string[];
  unexpected: boolean;
  data: Record<string, any>;
}

interface AiResponse {
  success: boolean;
  import_id: string | null;
  source_kind: "pdf" | "image" | "text";
  expected_types: ServiceType[];
  expected_missing: ServiceType[];
  unexpected_extra: ServiceType[];
  blocks: AiBlock[];
  trip_meta: Record<string, any>;
  warnings: string[];
  error_message?: string;
  error?: string;
}

export interface FullPackageImportResult {
  service_type: ServiceType;
  service_data: Record<string, any>;
  amount: number;
  option_label?: string | null;
  description?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId?: string;
  /** Called once per service confirmed by the agency. */
  onConfirmService: (svc: FullPackageImportResult) => Promise<void> | void;
  /** Optional trip-level summary callback (destination, dates, total...). */
  onTripMeta?: (meta: Record<string, any>) => void;
}

const ALL_TYPES: { type: ServiceType; label: string; icon: typeof Plane }[] = [
  { type: "flight",     label: "Passagem aérea",                 icon: Plane },
  { type: "hotel",      label: "Hospedagem",                     icon: Hotel },
  { type: "car_rental", label: "Locação de veículo",             icon: Car },
  { type: "transfer",   label: "Transfer / Traslado",            icon: ArrowRightLeft },
  { type: "attraction", label: "Ingressos / Atrações / Passeios", icon: Ticket },
  { type: "insurance",  label: "Seguro viagem",                  icon: Shield },
  { type: "cruise",     label: "Cruzeiros",                      icon: Ship },
  { type: "circuit",    label: "Circuitos",                      icon: Map },
  { type: "other",      label: "Outros",                         icon: Package },
];

const TYPE_LABEL: Record<ServiceType, string> = ALL_TYPES.reduce((acc, t) => {
  acc[t.type] = t.label; return acc;
}, {} as Record<ServiceType, string>);

const TYPE_ICON: Record<ServiceType, typeof Plane> = ALL_TYPES.reduce((acc, t) => {
  acc[t.type] = t.icon; return acc;
}, {} as Record<ServiceType, typeof Plane>);

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

const PROGRESS_STEPS = [
  "Analisando o pacote completo...",
  "Separando serviços (aéreo, hotel, transfer, passeios)...",
  "Extraindo datas, valores e detalhes de cada bloco...",
  "Preparando a tela de revisão...",
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

type Step = "select-types" | "source" | "processing" | "summary" | "review";
type ReviewStatus = "pending" | "confirmed" | "skipped";

/* ─────────────── Component ─────────────── */

export function FullPackageImportModal({ open, onOpenChange, quoteId, onConfirmService, onTripMeta }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("select-types");
  const [expected, setExpected] = useState<Set<ServiceType>>(new Set());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
  const [blocks, setBlocks] = useState<AiBlock[]>([]);
  const [statusByBlock, setStatusByBlock] = useState<Record<string, ReviewStatus>>({});
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [hardError, setHardError] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  /* progress animation */
  useEffect(() => {
    if (step !== "processing") return;
    setProgressStep(0);
    const id = setInterval(() => setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, [step]);

  /* reset when closed */
  useEffect(() => {
    if (!open) {
      setStep("select-types");
      setExpected(new Set());
      setUploadFile(null);
      setPastedText("");
      setAiResponse(null);
      setBlocks([]);
      setStatusByBlock({});
      setActiveBlockIdx(0);
      setHardError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const toggleType = (t: ServiceType) => {
    setExpected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

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

  const startImport = async () => {
    const hasText = pastedText.trim().length > 0;
    if (!uploadFile && !hasText) {
      toast({ title: "Envie um arquivo ou cole o texto do pacote", variant: "destructive" });
      return;
    }
    if (hasText && pastedText.length > 60000) {
      toast({ title: "Texto muito longo", description: "Máximo 60.000 caracteres.", variant: "destructive" });
      return;
    }
    setStep("processing");
    setHardError(null);
    let storagePath: string | null = null;
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (userId && uploadFile) {
        const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "bin";
        storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("full-package-imports").upload(storagePath, uploadFile, {
          contentType: uploadFile.type,
          upsert: false,
        });
        if (up.error) {
          console.warn("Upload do arquivo original falhou:", up.error.message);
          storagePath = null;
        }
      }

      const fileBase64 = uploadFile ? await fileToBase64(uploadFile) : undefined;
      let text = hasText ? pastedText.trim() : "";
      if (uploadFile && uploadFile.type === "application/pdf") {
        try {
          const pdfText = await extractPdfText(uploadFile);
          text = text ? `${text}\n\n${pdfText}` : pdfText;
        } catch (e) {
          console.warn("PDF text extraction failed:", e);
        }
      }

      const { data, error } = await supabase.functions.invoke("import-full-package", {
        body: {
          fileBase64,
          fileMimeType: uploadFile?.type,
          fileName: uploadFile?.name,
          text: text || undefined,
          quoteId,
          storagePath,
          expectedTypes: Array.from(expected),
        },
      });

      let body: any = data;
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") body = await ctx.json();
        } catch { /* noop */ }
      }

      if (!body || body.success === false || !Array.isArray(body.blocks)) {
        const msg = body?.error_message || body?.error || "Não foi possível analisar o pacote. Tente novamente.";
        setHardError(msg);
        toast({ title: "Erro na importação", description: msg, variant: "destructive" });
        setStep("source");
        return;
      }

      const resp: AiResponse = body;
      setAiResponse(resp);
      setBlocks(resp.blocks);
      setStatusByBlock(Object.fromEntries(resp.blocks.map((b) => [b.id, "pending" as ReviewStatus])));
      if (onTripMeta && resp.trip_meta && Object.keys(resp.trip_meta).length) onTripMeta(resp.trip_meta);

      if (resp.blocks.length === 0) {
        toast({ title: "Nenhum serviço identificado", description: "A IA não encontrou serviços neste material.", variant: "destructive" });
        setStep("summary");
        return;
      }

      setStep("summary");
    } catch (e: any) {
      const msg = e?.message || "Falha ao processar o pacote.";
      setHardError(msg);
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setStep("source");
    }
  };

  const goToReview = () => {
    setActiveBlockIdx(0);
    setStep("review");
  };

  const handleConfirmBlock = async (idx: number, updated: AiBlock) => {
    const mapped = mapBlockToService(updated);
    if (!mapped) {
      toast({ title: "Não foi possível mapear este serviço", variant: "destructive" });
      return;
    }
    try {
      await onConfirmService(mapped);
      setStatusByBlock((s) => ({ ...s, [updated.id]: "confirmed" }));
      setBlocks((bs) => bs.map((b, i) => (i === idx ? updated : b)));
      // Advance to next pending
      const nextIdx = findNextPending(idx, blocks, { ...statusByBlock, [updated.id]: "confirmed" });
      if (nextIdx === -1) setStep("summary");
      else setActiveBlockIdx(nextIdx);
    } catch (e: any) {
      toast({ title: "Falha ao adicionar ao orçamento", description: e?.message || "", variant: "destructive" });
    }
  };

  const handleSkipBlock = (idx: number) => {
    const b = blocks[idx];
    setStatusByBlock((s) => ({ ...s, [b.id]: "skipped" }));
    const nextIdx = findNextPending(idx, blocks, { ...statusByBlock, [b.id]: "skipped" });
    if (nextIdx === -1) setStep("summary");
    else setActiveBlockIdx(nextIdx);
  };

  const handleImportAllPending = async () => {
    const pendingBlocks = blocks.filter((b) => (statusByBlock[b.id] || "pending") === "pending");
    if (pendingBlocks.length === 0) {
      onOpenChange(false);
      return;
    }
    setBulkImporting(true);
    const newStatus = { ...statusByBlock };
    let added = 0;
    let failed = 0;
    for (const b of pendingBlocks) {
      const mapped = mapBlockToService(b);
      if (!mapped) { failed++; continue; }
      try {
        await onConfirmService(mapped);
        newStatus[b.id] = "confirmed";
        added++;
      } catch (e: any) {
        failed++;
        console.error("Bulk import failed for block", b.id, e);
      }
    }
    setStatusByBlock(newStatus);
    setBulkImporting(false);
    setStep("summary");
    toast({
      title: failed === 0 ? "Pacote importado com sucesso" : "Importação parcial",
      description: `${added} serviço(s) adicionado(s)${failed ? ` · ${failed} falhou(aram)` : ""}.`,
      variant: failed === 0 ? "default" : "destructive",
    });
    if (failed === 0) onOpenChange(false);
  };

  const handleClose = () => onOpenChange(false);

  /* ─────────────── Render ─────────────── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="h-5 w-5 text-primary" />
            Importar Pacote Completo
            <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wide"><Sparkles className="h-3 w-3 mr-0.5" /> IA</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie um único PDF, imagem ou texto contendo vários serviços de uma viagem.
            A IA identifica cada bloco e você revisa um por um antes de adicionar ao orçamento.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {step === "select-types" && (
            <SelectTypesStep expected={expected} toggleType={toggleType} />
          )}
          {step === "source" && (
            <SourceStep
              uploadFile={uploadFile}
              pastedText={pastedText}
              onFile={handleFileSelected}
              onText={setPastedText}
              fileInputRef={fileInputRef}
              hardError={hardError}
            />
          )}
          {step === "processing" && (
            <ProcessingStep step={progressStep} />
          )}
          {step === "summary" && aiResponse && (
            <SummaryStep
              response={aiResponse}
              blocks={blocks}
              statusByBlock={statusByBlock}
              onGoToReview={goToReview}
              onJumpTo={(idx) => { setActiveBlockIdx(idx); setStep("review"); }}
            />
          )}
          {step === "review" && blocks[activeBlockIdx] && (
            <ReviewStep
              key={blocks[activeBlockIdx].id}
              block={blocks[activeBlockIdx]}
              indexLabel={`${activeBlockIdx + 1} / ${blocks.length}`}
              onConfirm={(updated) => handleConfirmBlock(activeBlockIdx, updated)}
              onSkip={() => handleSkipBlock(activeBlockIdx)}
            />
          )}
        </ScrollArea>

        <div className="border-t px-6 py-3 flex flex-wrap gap-2 justify-between items-center bg-muted/30">
          <StepIndicator step={step} />
          <StepActions
            step={step}
            expected={expected}
            uploadFile={uploadFile}
            pastedText={pastedText}
            blocks={blocks}
            statusByBlock={statusByBlock}
            activeBlockIdx={activeBlockIdx}
            bulkImporting={bulkImporting}
            onImportAll={handleImportAllPending}
            onBack={() => {
              if (step === "source") setStep("select-types");
              else if (step === "summary") setStep("source");
              else if (step === "review") setStep("summary");
            }}
            onNext={() => {
              if (step === "select-types") setStep("source");
              else if (step === "source") startImport();
              else if (step === "summary") goToReview();
            }}
            onClose={handleClose}
            onPrevBlock={() => {
              const prev = findPrev(activeBlockIdx, blocks);
              if (prev !== -1) setActiveBlockIdx(prev);
            }}
            onNextBlock={() => {
              const next = findNext(activeBlockIdx, blocks);
              if (next !== -1) setActiveBlockIdx(next);
              else setStep("summary");
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Steps ─────────────── */

function SelectTypesStep({ expected, toggleType }: { expected: Set<ServiceType>; toggleType: (t: ServiceType) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">1. O que está incluído neste pacote?</h3>
        <p className="text-xs text-muted-foreground">
          Marque os serviços que você sabe que estão no documento. Isso orienta a IA e reduz erros.
          Não se preocupe se sobrar algo: a IA também sinaliza serviços extras.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_TYPES.map((t) => {
          const Icon = t.icon;
          const active = expected.has(t.type);
          return (
            <label
              key={t.type}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox checked={active} onCheckedChange={() => toggleType(t.type)} />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SourceStep({
  uploadFile, pastedText, onFile, onText, fileInputRef, hardError,
}: {
  uploadFile: File | null;
  pastedText: string;
  onFile: (f: File | null) => void;
  onText: (s: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  hardError: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">2. Envie o material do pacote</h3>
        <p className="text-xs text-muted-foreground">
          PDF ou imagem (até 10 MB) — ou cole o texto do orçamento/voucher.
        </p>
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Arquivo (PDF, PNG, JPG, JPEG)</Label>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          className="mt-1 cursor-pointer"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
        {uploadFile && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {uploadFile.name} • {(uploadFile.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 my-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Colar texto do pacote</Label>
        <Textarea
          value={pastedText}
          onChange={(e) => onText(e.target.value)}
          placeholder="Cole aqui o conteúdo do orçamento (e-mail, WhatsApp, voucher consolidado, proposta da operadora...)"
          className="mt-1 min-h-[160px] font-mono text-xs"
          maxLength={60000}
        />
        {pastedText.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">{pastedText.length.toLocaleString("pt-BR")} caracteres</p>
        )}
      </div>
      {hardError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{hardError}</span>
        </div>
      )}
    </div>
  );
}

function ProcessingStep({ step }: { step: number }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-8 text-center space-y-3">
      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
      <p className="text-sm font-medium">{PROGRESS_STEPS[step]}</p>
      <div className="flex justify-center gap-1">
        {PROGRESS_STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">A análise multimodal de um pacote completo pode levar até 60 segundos.</p>
    </div>
  );
}

function SummaryStep({
  response, blocks, statusByBlock, onGoToReview, onJumpTo,
}: {
  response: AiResponse;
  blocks: AiBlock[];
  statusByBlock: Record<string, ReviewStatus>;
  onGoToReview: () => void;
  onJumpTo: (idx: number) => void;
}) {
  const trip = response.trip_meta || {};
  const counts = useMemo(() => {
    const c: Partial<Record<ServiceType, number>> = {};
    blocks.forEach((b) => { c[b.type] = (c[b.type] || 0) + 1; });
    return c;
  }, [blocks]);

  const pendingCount = blocks.filter((b) => statusByBlock[b.id] === "pending").length;
  const confirmedCount = blocks.filter((b) => statusByBlock[b.id] === "confirmed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Resumo da importação
        </h3>
      </div>

      {/* Trip meta */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Meta label="Destino" value={trip.destination} />
          <Meta label="Período" value={[trip.start_date, trip.end_date].filter(Boolean).join(" → ")} />
          <Meta label="Adultos" value={trip.adults != null ? String(trip.adults) : ""} />
          <Meta label="Crianças" value={trip.children != null ? String(trip.children) : ""} />
          <Meta label="Moeda" value={trip.currency} />
          <Meta label="Total do pacote" value={fmtMoney(trip.total_amount_brl ?? trip.total_amount, trip.currency)} />
        </CardContent>
      </Card>

      {/* Counts */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Serviços identificados</h4>
          {Object.keys(counts).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço identificado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(counts) as ServiceType[]).map((t) => {
                const Icon = TYPE_ICON[t];
                return (
                  <Badge key={t} variant="secondary" className="gap-1">
                    <Icon className="h-3 w-3" /> {counts[t]}× {TYPE_LABEL[t]}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings + expected vs found */}
      {(response.expected_missing.length > 0 || response.unexpected_extra.length > 0 || response.warnings.length > 0) && (
        <Card>
          <CardContent className="pt-4 space-y-2 text-xs">
            {response.expected_missing.length > 0 && (
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Esperados mas não encontrados:</strong>{" "}
                  {response.expected_missing.map((t) => TYPE_LABEL[t]).join(", ")}.
                </span>
              </div>
            )}
            {response.unexpected_extra.length > 0 && (
              <div className="flex items-start gap-2 text-sky-700 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Possivelmente encontrados (fora do esperado):</strong>{" "}
                  {response.unexpected_extra.map((t) => TYPE_LABEL[t]).join(", ")}. Revise e adicione se fizer sentido.
                </span>
              </div>
            )}
            {response.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Blocks list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Conferir serviço por serviço</h4>
        {blocks.map((b, idx) => {
          const Icon = TYPE_ICON[b.type];
          const status = statusByBlock[b.id] || "pending";
          const lowConf = b.confidence > 0 && b.confidence < 0.6;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onJumpTo(idx)}
              className="w-full text-left rounded-lg border bg-background hover:bg-muted/40 transition-colors p-3 flex items-center gap-3"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {b.label || TYPE_LABEL[b.type]}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{TYPE_LABEL[b.type]}</span>
                  <span>•</span>
                  <span>Confiança: {Math.round(b.confidence * 100)}%</span>
                  {lowConf && <Badge variant="destructive" className="text-[9px] h-4">baixa confiança</Badge>}
                  {b.unexpected && <Badge variant="outline" className="text-[9px] h-4">não esperado</Badge>}
                  {b.missing_fields.length > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      • {b.missing_fields.length} campo(s) para revisar
                    </span>
                  )}
                </div>
              </div>
              {status === "confirmed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {status === "skipped" && <SkipForward className="h-4 w-4 text-muted-foreground" />}
              {status === "pending" && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>

      {blocks.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {confirmedCount} adicionados · {pendingCount} pendentes
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  block, indexLabel, onConfirm, onSkip,
}: {
  block: AiBlock;
  indexLabel: string;
  onConfirm: (updated: AiBlock) => void;
  onSkip: () => void;
}) {
  const [local, setLocal] = useState<AiBlock>(block);
  useEffect(() => setLocal(block), [block]);

  const Icon = TYPE_ICON[local.type];
  const lowConf = local.confidence > 0 && local.confidence < 0.6;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Conferir {TYPE_LABEL[local.type]}</h3>
        </div>
        <Badge variant="outline">{indexLabel}</Badge>
      </div>

      {(lowConf || local.missing_fields.length > 0 || local.unexpected) && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1 text-amber-900 dark:text-amber-200">
          {lowConf && <div className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Confiança baixa ({Math.round(local.confidence * 100)}%). Revise com atenção.</div>}
          {local.unexpected && <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Este serviço não estava nos tipos selecionados.</div>}
          {local.missing_fields.length > 0 && (
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
              <span>Campos a confirmar: {local.missing_fields.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <BlockEditor block={local} onChange={setLocal} />

      {local.raw_excerpt && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver trecho original identificado</summary>
          <pre className="mt-2 rounded border bg-muted/30 p-2 whitespace-pre-wrap break-words text-[11px] max-h-40 overflow-auto">{local.raw_excerpt}</pre>
        </details>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-1" /> Pular este
        </Button>
        <Button type="button" onClick={() => onConfirm(local)} className="flex-1 min-w-[180px]">
          <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar e adicionar ao orçamento
        </Button>
      </div>
    </div>
  );
}

/* ─────────────── Block editor (per type) ─────────────── */

function BlockEditor({ block, onChange }: { block: AiBlock; onChange: (b: AiBlock) => void }) {
  const update = (path: string, value: any) => {
    onChange({ ...block, data: setByPath(block.data, path, value) });
  };

  if (block.type === "flight") {
    const d = block.data as ParsedAirfare;
    const resumo = d.resumo || {};
    const voos = Array.isArray(d.voos) ? d.voos : [];
    return (
      <div className="space-y-3">
        <Card><CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Trecho" value={resumo.trecho_geral || ""} onChange={(v) => update("resumo.trecho_geral", v)} />
          <Field label="Companhia (resumo)" value={voos[0]?.companhia_aerea || ""} onChange={(v) => update("voos.0.companhia_aerea", v)} />
          <Field label="Origem" value={resumo.origem_inicial || ""} onChange={(v) => update("resumo.origem_inicial", v)} />
          <Field label="Destino" value={resumo.destino_final || ""} onChange={(v) => update("resumo.destino_final", v)} />
          <Field label="Data ida" value={resumo.data_ida || ""} onChange={(v) => update("resumo.data_ida", v)} placeholder="AAAA-MM-DD" />
          <Field label="Data retorno" value={resumo.data_retorno || ""} onChange={(v) => update("resumo.data_retorno", v)} placeholder="AAAA-MM-DD" />
          <Field label="Passageiros" value={resumo.quantidade_passageiros || ""} onChange={(v) => update("resumo.quantidade_passageiros", v)} />
          <Field label="Moeda" value={resumo.moeda_original || ""} onChange={(v) => update("resumo.moeda_original", v.toUpperCase())} />
          <NumField label="Total (moeda)" value={resumo.valor_total_original ?? null} onChange={(v) => update("resumo.valor_total_original", v)} />
          <NumField label="Total em R$" value={resumo.valor_total_brl ?? null} onChange={(v) => update("resumo.valor_total_brl", v)} />
        </CardContent></Card>
        <Card><CardContent className="pt-4 space-y-2 text-xs">
          <h4 className="text-xs font-semibold">Voos identificados ({voos.length})</h4>
          {voos.map((v, i) => (
            <div key={i} className="rounded border p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Voo" value={v.numero_voo || ""} onChange={(x) => update(`voos.${i}.numero_voo`, x)} />
              <Field label="Origem" value={v.origem_codigo || ""} onChange={(x) => update(`voos.${i}.origem_codigo`, x.toUpperCase())} />
              <Field label="Destino" value={v.destino_codigo || ""} onChange={(x) => update(`voos.${i}.destino_codigo`, x.toUpperCase())} />
              <Field label="Saída" value={v.data_saida || ""} onChange={(x) => update(`voos.${i}.data_saida`, x)} placeholder="AAAA-MM-DD" />
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  if (block.type === "hotel") {
    const d = block.data as ParsedHotel;
    return (
      <Card><CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Hotel" value={d.nome_hotel || ""} onChange={(v) => update("nome_hotel", v)} />
        <Field label="Fornecedor" value={d.fornecedor || ""} onChange={(v) => update("fornecedor", v)} />
        <Field label="Cidade" value={d.cidade || ""} onChange={(v) => update("cidade", v)} />
        <Field label="País" value={d.pais || ""} onChange={(v) => update("pais", v)} />
        <Field label="Check-in" value={d.check_in || ""} onChange={(v) => update("check_in", v)} placeholder="AAAA-MM-DD" />
        <Field label="Check-out" value={d.check_out || ""} onChange={(v) => update("check_out", v)} placeholder="AAAA-MM-DD" />
        <Field label="Noites" value={d.noites != null ? String(d.noites) : ""} onChange={(v) => update("noites", v ? Number(v) : null)} />
        <Field label="Regime" value={d.regime_alimentacao || ""} onChange={(v) => update("regime_alimentacao", v)} />
        <Field label="Categoria" value={d.categoria_quarto || ""} onChange={(v) => update("categoria_quarto", v)} />
        <Field label="Moeda" value={d.moeda || ""} onChange={(v) => update("moeda", v.toUpperCase())} />
        <NumField label="Total (moeda)" value={d.valor_total ?? null} onChange={(v) => update("valor_total", v)} />
        <NumField label="Total em R$" value={d.valor_total_brl ?? null} onChange={(v) => update("valor_total_brl", v)} />
      </CardContent></Card>
    );
  }

  if (block.type === "car_rental") {
    const d = block.data as ParsedCarRental;
    return (
      <Card><CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Locadora" value={d.locadora || ""} onChange={(v) => update("locadora", v)} />
        <Field label="Categoria" value={d.categoria_veiculo || ""} onChange={(v) => update("categoria_veiculo", v)} />
        <Field label="Modelo" value={d.modelo_veiculo || ""} onChange={(v) => update("modelo_veiculo", v)} />
        <Field label="Diárias" value={d.diarias != null ? String(d.diarias) : ""} onChange={(v) => update("diarias", v ? Number(v) : null)} />
        <Field label="Retirada" value={d.local_retirada || ""} onChange={(v) => update("local_retirada", v)} />
        <Field label="Devolução" value={d.local_devolucao || ""} onChange={(v) => update("local_devolucao", v)} />
        <Field label="Data retirada" value={d.data_retirada || ""} onChange={(v) => update("data_retirada", v)} placeholder="AAAA-MM-DD" />
        <Field label="Data devolução" value={d.data_devolucao || ""} onChange={(v) => update("data_devolucao", v)} placeholder="AAAA-MM-DD" />
        <Field label="Moeda" value={d.moeda || ""} onChange={(v) => update("moeda", v.toUpperCase())} />
        <NumField label="Total (moeda)" value={d.valor_total ?? null} onChange={(v) => update("valor_total", v)} />
        <NumField label="Total em R$" value={d.valor_total_brl ?? null} onChange={(v) => update("valor_total_brl", v)} />
      </CardContent></Card>
    );
  }

  // Generic types
  const genericKey = block.type as GenericServiceKey;
  const cfg = SERVICE_IMPORT_CONFIGS[genericKey];
  if (!cfg) return <pre className="text-xs">{JSON.stringify(block.data, null, 2)}</pre>;

  return (
    <Card><CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      {cfg.fields.map((f) => {
        const value = (block.data as any)[f.key];
        const className = f.full ? "sm:col-span-2" : undefined;
        if (f.type === "textarea") {
          return (
            <div key={f.key} className={className}>
              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
              <Textarea value={value || ""} onChange={(e) => update(f.key, e.target.value)} className="mt-1 min-h-[80px]" placeholder={f.placeholder} />
            </div>
          );
        }
        if (f.type === "list") {
          const arr = Array.isArray(value) ? value : [];
          return (
            <div key={f.key} className={className}>
              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
              <Textarea
                value={arr.join("\n")}
                onChange={(e) => update(f.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                className="mt-1 min-h-[60px]"
                placeholder={f.placeholder || "Um item por linha"}
              />
            </div>
          );
        }
        if (f.type === "number") {
          return (
            <div key={f.key} className={className}>
              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                value={value != null && value !== "" ? String(value) : ""}
                onChange={(e) => update(f.key, e.target.value ? Number(e.target.value) : null)}
                placeholder={f.placeholder}
                className="mt-1"
              />
            </div>
          );
        }
        return (
          <div key={f.key} className={className}>
            <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
            <Input
              type={f.type || "text"}
              value={value || ""}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="mt-1"
            />
          </div>
        );
      })}
    </CardContent></Card>
  );
}

/* ─────────────── Footer ─────────────── */

function StepIndicator({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    "select-types": "Etapa 1 de 4 · Tipos esperados",
    "source": "Etapa 2 de 4 · Material do pacote",
    "processing": "Processando…",
    "summary": "Etapa 3 de 4 · Resumo da análise",
    "review": "Etapa 4 de 4 · Conferência por serviço",
  };
  return <span className="text-xs text-muted-foreground">{labels[step]}</span>;
}

function StepActions(props: {
  step: Step;
  expected: Set<ServiceType>;
  uploadFile: File | null;
  pastedText: string;
  blocks: AiBlock[];
  statusByBlock: Record<string, ReviewStatus>;
  activeBlockIdx: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onPrevBlock: () => void;
  onNextBlock: () => void;
}) {
  const { step, expected, uploadFile, pastedText, blocks, statusByBlock, onBack, onNext, onClose, onPrevBlock, onNextBlock } = props;

  if (step === "select-types") {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={onNext} disabled={expected.size === 0}>
          Avançar <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }
  if (step === "source") {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <Button onClick={onNext} disabled={!uploadFile && !pastedText.trim()}>
          <Upload className="h-4 w-4 mr-1" /> Analisar com IA
        </Button>
      </div>
    );
  }
  if (step === "processing") {
    return <Button variant="ghost" disabled><Loader2 className="h-4 w-4 animate-spin mr-1" /> Aguarde…</Button>;
  }
  if (step === "summary") {
    const pending = blocks.filter((b) => statusByBlock[b.id] === "pending").length;
    return (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        {pending > 0 && (
          <Button onClick={onNext}>
            Conferir {pending} pendente(s) <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        {pending === 0 && blocks.length > 0 && (
          <Button onClick={onClose}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluir</Button>
        )}
      </div>
    );
  }
  // review
  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Resumo</Button>
      <Button variant="ghost" onClick={onPrevBlock}>Anterior</Button>
      <Button variant="ghost" onClick={onNextBlock}>Próximo</Button>
    </div>
  );
}

/* ─────────────── Helpers ─────────────── */

function Field({
  label, value, onChange, placeholder, className,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}

function NumField({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1"
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value || "—"}</div>
    </div>
  );
}

function fmtMoney(v: any, currency?: string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: (currency || "BRL").toUpperCase() });
  } catch {
    return `${currency || "R$"} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
}

function setByPath(obj: any, path: string, value: any): any {
  const parts = path.split(".");
  const clone = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const idx = /^\d+$/.test(k) ? Number(k) : k;
    const next = cur[idx as any];
    cur[idx as any] = Array.isArray(next) ? [...next] : { ...(next || {}) };
    cur = cur[idx as any];
  }
  const lastKey = parts[parts.length - 1];
  const lastIdx = /^\d+$/.test(lastKey) ? Number(lastKey) : lastKey;
  cur[lastIdx as any] = value;
  return clone;
}

function findNextPending(fromIdx: number, blocks: AiBlock[], status: Record<string, ReviewStatus>): number {
  for (let i = fromIdx + 1; i < blocks.length; i++) if (status[blocks[i].id] === "pending") return i;
  for (let i = 0; i < fromIdx; i++) if (status[blocks[i].id] === "pending") return i;
  return -1;
}
function findNext(idx: number, blocks: AiBlock[]): number {
  return idx + 1 < blocks.length ? idx + 1 : -1;
}
function findPrev(idx: number, blocks: AiBlock[]): number {
  return idx - 1 >= 0 ? idx - 1 : -1;
}

/* ─────────────── Block → service mapping ─────────────── */

function mapBlockToService(block: AiBlock): FullPackageImportResult | null {
  const label = block.label || undefined;
  try {
    if (block.type === "flight") {
      const mapped = parsedAirfareToFlightData(block.data as ParsedAirfare);
      const amount =
        (mapped as any)?.adult_price * 1 || 0; // legacy fallback
      const total =
        Number((block.data as any)?.resumo?.valor_total_brl) ||
        Number((block.data as any)?.resumo?.valor_total_original) ||
        amount;
      return {
        service_type: "flight",
        service_data: mapped as any,
        amount: total || 0,
        option_label: label || null,
      };
    }
    if (block.type === "hotel") {
      const mapped = parsedHotelToHotelData(block.data as ParsedHotel);
      return {
        service_type: "hotel",
        service_data: mapped as any,
        amount: Number((mapped as any)?.price) || 0,
        option_label: label || null,
      };
    }
    if (block.type === "car_rental") {
      const mapped = parsedCarToCarData(block.data as ParsedCarRental);
      return {
        service_type: "car_rental",
        service_data: mapped as any,
        amount: Number((mapped as any)?.price) || 0,
        option_label: label || null,
      };
    }
    const cfg = SERVICE_IMPORT_CONFIGS[block.type as GenericServiceKey];
    if (cfg) {
      const out = cfg.mapToInitialData(block.data);
      return {
        service_type: block.type,
        service_data: out.service_data,
        amount: out.amount || 0,
        option_label: label || null,
      };
    }
    return null;
  } catch (e) {
    console.error("mapBlockToService failed:", e);
    return null;
  }
}
