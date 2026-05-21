import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Wand2,
  Plane,
  BedDouble,
  Car,
  Bus,
  Ticket,
  Shield,
  Ship,
  TrainFront,
  Package,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parsedAirfareToFlightData, type ParsedAirfare } from "@/components/quote/flight-wizard/AirfareSmartImport";
import { extractPdfText } from "@/lib/pdfText";

export type AIImportServiceType =
  | "flight"
  | "hotel"
  | "car_rental"
  | "transfer"
  | "attraction"
  | "insurance"
  | "cruise"
  | "train"
  | "other";

export interface AIImportResult {
  service_type: AIImportServiceType;
  service_data: Record<string, any>;
}

interface AIImportServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedTypes?: AIImportServiceType[];
  onImport: (result: AIImportResult) => Promise<void> | void;
}

const TYPE_META: Record<AIImportServiceType, { label: string; icon: any }> = {
  flight: { label: "Passagem aérea", icon: Plane },
  hotel: { label: "Hospedagem", icon: BedDouble },
  car_rental: { label: "Locação de veículo", icon: Car },
  transfer: { label: "Transfer", icon: Bus },
  attraction: { label: "Ingressos / Atrações", icon: Ticket },
  insurance: { label: "Seguro viagem", icon: Shield },
  cruise: { label: "Cruzeiro", icon: Ship },
  train: { label: "Trem", icon: TrainFront },
  other: { label: "Outros", icon: Package },
};

const DEFAULT_TYPES: AIImportServiceType[] = [
  "flight",
  "hotel",
  "car_rental",
  "transfer",
  "attraction",
  "insurance",
  "cruise",
  "train",
  "other",
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

type Step = "form" | "processing" | "review";

export function AIImportServiceModal({
  open,
  onOpenChange,
  allowedTypes = DEFAULT_TYPES,
  onImport,
}: AIImportServiceModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [serviceType, setServiceType] = useState<AIImportServiceType>(allowedTypes[0]);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [extracted, setExtracted] = useState<Record<string, any>>({});
  const [suggested, setSuggested] = useState<Record<string, any>>({});
  const [confidenceNotes, setConfidenceNotes] = useState("");
  const [edited, setEdited] = useState<Record<string, any>>({});
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("form");
    setFile(null);
    setText("");
    setProgressMsg("");
    setExtracted({});
    setSuggested({});
    setConfidenceNotes("");
    setEdited({});
    setAcceptedSuggestions({});
    setSaving(false);
    setIsDragging(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const fileToBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = r.result as string;
        resolve(result.split(",")[1] || result);
      };
      r.onerror = () => reject(new Error("Falha ao ler arquivo"));
      r.readAsDataURL(f);
    });

  const validateFile = (f: File): boolean => {
    if (f.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Limite de 8MB.", variant: "destructive" });
      return false;
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      toast({ title: "Formato não suportado", description: "Use PDF, PNG, JPG ou WEBP.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (inputMode === "file" && !file) {
      toast({ title: "Anexe um arquivo", description: "Envie PDF, PNG, JPG ou WEBP.", variant: "destructive" });
      return;
    }
    if (inputMode === "text" && text.trim().length < 20) {
      toast({
        title: "Texto muito curto",
        description: "Cole o texto completo do voucher/confirmação.",
        variant: "destructive",
      });
      return;
    }
    if (file && !validateFile(file)) return;

    setStep("processing");
    setProgressMsg("Lendo documento com IA...");

    try {
      // ─── Passagem aérea: usa o extrator TABULAR dedicado (import-airfare-document) ───
      if (serviceType === "flight") {
        const airfarePayload: Record<string, unknown> = {};
        if (inputMode === "file" && file) {
          const b64 = await fileToBase64(file);
          airfarePayload.fileBase64 = b64;
          airfarePayload.fileMimeType = file.type;
          airfarePayload.fileName = file.name;
          if (file.type === "application/pdf") {
            try { airfarePayload.text = await extractPdfText(file); } catch { /* noop */ }
          }
        } else {
          airfarePayload.text = text;
        }

        setProgressMsg("Extraindo voos, datas, bagagens e tarifas...");
        const { data, error } = await supabase.functions.invoke("import-airfare-document", {
          body: airfarePayload,
        });

        let body: any = data;
        if (error) {
          try {
            const ctx = (error as any)?.context;
            if (ctx && typeof ctx.json === "function") body = await ctx.json();
          } catch { /* noop */ }
        }

        const parsed: ParsedAirfare | null =
          (body?.success && (body?.data || body)) ||
          (body?.partial_data && Object.keys(body.partial_data || {}).length > 0 ? body.partial_data : null);
        const voos = Array.isArray(parsed?.voos) ? parsed!.voos : [];

        if (!parsed || (voos.length === 0 && !parsed?.resumo?.trecho_geral)) {
          const msg = body?.error_message || body?.error ||
            "Não foi possível identificar voos no documento. Tente uma imagem mais nítida.";
          toast({ title: "Não foi possível importar", description: msg, variant: "destructive" });
          setStep("form");
          return;
        }

        const flightData = parsedAirfareToFlightData(parsed) as Record<string, any>;
        await onImport({ service_type: "flight", service_data: flightData });
        toast({
          title: `Passagem aérea importada — ${voos.length} voo(s)`,
          description: "Abra o serviço para revisar os segmentos.",
        });
        handleClose(false);
        return;
      }

      const payload: Record<string, unknown> = { service_type: serviceType };
      if (inputMode === "file" && file) {
        const b64 = await fileToBase64(file);
        payload.file_base64 = b64;
        payload.file_mime = file.type;
      } else {
        payload.text = text;
      }

      setProgressMsg("Interpretando dados do serviço...");
      const { data, error } = await supabase.functions.invoke("ai-import-service", { body: payload });

      if (error || !data || (data as any).error) {
        const message = (data as any)?.error || error?.message || "Erro ao processar.";
        toast({ title: "Não foi possível importar", description: message, variant: "destructive" });
        setStep("form");
        return;
      }

      setProgressMsg("Preparando preview...");
      setExtracted((data as any).extracted || {});
      setSuggested((data as any).suggested || {});
      setConfidenceNotes((data as any).confidence_notes || "");
      setEdited({ ...((data as any).extracted || {}) });
      const accepted: Record<string, boolean> = {};
      Object.entries((data as any).suggested || {}).forEach(([k, v]) => {
        if (v && typeof v === "string" && v.trim().length > 0) accepted[k] = true;
      });
      setAcceptedSuggestions(accepted);
      setStep("review");
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Tente novamente.", variant: "destructive" });
      setStep("form");
    }
  };

  const handleSave = async () => {
    const finalData: Record<string, any> = { ...edited };
    Object.entries(suggested).forEach(([k, v]) => {
      if (acceptedSuggestions[k] && v && (!finalData[k] || finalData[k] === "")) {
        finalData[k] = v;
      }
    });

    setSaving(true);
    try {
      await onImport({ service_type: serviceType, service_data: finalData });
      toast({ title: "Serviço importado", description: "Revise e ajuste o que precisar." });
      handleClose(false);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const reviewFields = Object.entries(edited).filter(([_, v]) => typeof v === "string");
  const arrayFields = Object.entries(edited).filter(([_, v]) => Array.isArray(v) && v.length > 0);
  const filledCount = reviewFields.filter(([_, v]) => (v as string).trim().length > 0).length;

  const TypeIcon = TYPE_META[serviceType].icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Importar serviço com IA
          </DialogTitle>
          <DialogDescription>
            Envie um voucher, confirmação, PDF, imagem, print ou cole o texto. A IA identifica e
            preenche os campos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-5">
            {/* Type selector */}
            <div className="space-y-2">
              <Label htmlFor="ai-import-type-select">Tipo de serviço</Label>
              <Select
                value={serviceType}
                onValueChange={(v) => setServiceType(v as AIImportServiceType)}
              >
                <SelectTrigger id="ai-import-type-select" className="h-11">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-primary" />
                      <span>{TYPE_META[serviceType].label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.map((t) => {
                    const Icon = TYPE_META[t].icon;
                    return (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{TYPE_META[t].label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A IA adapta a leitura conforme o tipo de serviço selecionado.
              </p>
            </div>

            {/* Input mode */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-1.5" /> Arquivo / Imagem
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-1.5" /> Colar texto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="pt-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && validateFile(f)) setFile(f);
                  }}
                  className={cn(
                    "relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : file
                      ? "border-primary/50 bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && validateFile(f)) setFile(f);
                    }}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-3">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB · clique para trocar
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-1 h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted p-3">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">
                        Clique para enviar ou arraste o arquivo aqui
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, PNG, JPG ou WEBP · até 8MB
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-2 pt-3">
                <Label htmlFor="ai-import-text" className="sr-only">
                  Cole o texto
                </Label>
                <Textarea
                  id="ai-import-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cole aqui o e-mail, voucher, confirmação, mensagem do WhatsApp ou qualquer texto contendo os dados do serviço..."
                  className="min-h-[200px]"
                  maxLength={30000}
                />
                <p className="text-xs text-muted-foreground">
                  {text.length}/30.000 caracteres
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze} className="gap-1.5">
                <Wand2 className="h-4 w-4" />
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative rounded-full bg-primary/10 p-4">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{progressMsg || "Processando..."}</p>
              <p className="text-xs text-muted-foreground">
                Lendo, fazendo OCR e interpretando o conteúdo
              </p>
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TypeIcon className="h-4 w-4 text-primary" />
                {TYPE_META[serviceType].label}
              </div>
              <span className="text-xs text-muted-foreground">
                {filledCount} campo(s) identificado(s)
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                Revise os dados antes de salvar. A IA pode errar — confirme os campos críticos.
              </span>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Dados encontrados</h3>
              {reviewFields.length === 0 && arrayFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum campo extraído. Você pode preencher manualmente após salvar.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {reviewFields.map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{humanizeKey(key)}</Label>
                      <Input
                        value={(value as string) || ""}
                        onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Não encontrado"
                        className={cn(
                          "text-sm",
                          !value && "border-dashed text-muted-foreground placeholder:text-muted-foreground/60",
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
              {arrayFields.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
                  {arrayFields.map(([key, value]) => (
                    <div key={key}>
                      <strong>{humanizeKey(key)}:</strong> {(value as any[]).length} item(s)
                      detectado(s) — serão criados automaticamente.
                    </div>
                  ))}
                </div>
              )}
            </section>

            {Object.keys(suggested).length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Sugestões da IA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sugestões baseadas em dados públicos. Revise antes de aceitar.
                </p>
                <div className="space-y-2">
                  {Object.entries(suggested).map(([key, value]) => {
                    if (!value || typeof value !== "string" || !value.trim()) return null;
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={!!acceptedSuggestions[key]}
                          onChange={(e) =>
                            setAcceptedSuggestions((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="mt-1"
                        />
                        <div className="text-xs flex-1 min-w-0">
                          <div className="font-medium">{humanizeKey(key)}</div>
                          <div className="text-muted-foreground break-all">{value as string}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            {confidenceNotes && (
              <section className="rounded-md border border-muted bg-muted/20 p-3">
                <div className="text-xs font-semibold mb-1">Observações da IA</div>
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {confidenceNotes}
                </p>
              </section>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("form")} disabled={saving}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Salvar serviço
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUrl\b/g, "URL");
}