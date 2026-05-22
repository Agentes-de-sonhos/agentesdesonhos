import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Sparkles, CheckCircle2, AlertTriangle, X, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractPdfText } from "@/lib/pdfText";
import { useUserRole } from "@/hooks/useUserRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type GenericServiceKey = "transfer" | "attraction" | "insurance" | "cruise" | "circuit" | "other";

export interface SmartImportField {
  /** Key returned by the edge function (Portuguese) */
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "textarea" | "list";
  placeholder?: string;
  full?: boolean;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

const PROGRESS_STEPS = [
  "Analisando o documento...",
  "Identificando dados do serviço...",
  "Extraindo valores e detalhes...",
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

interface Props {
  serviceType: GenericServiceKey;
  /** Friendly label e.g. "transfer", "ingressos", "seguro viagem" */
  serviceLabel: string;
  /** Fields displayed in the review screen */
  fields: SmartImportField[];
  /** Map parsed data → form initialData (service_data + amount). */
  mapToInitialData: (parsed: Record<string, any>) => { service_data: Record<string, any>; amount: number };
  onCancel: () => void;
  onConfirm: (initialData: { service_data: Record<string, any>; amount: number }, raw: Record<string, any>) => void;
}

export function GenericServiceSmartImport({
  serviceType, serviceLabel, fields, mapToInitialData, onCancel, onConfirm,
}: Props) {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [parsed, setParsed] = useState<Record<string, any> | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [hardError, setHardError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUploading) return;
    setProgressStep(0);
    const id = setInterval(() => setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), 1800);
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
        storagePath = `${userId}/${serviceType}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("service-imports").upload(storagePath, uploadFile, {
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

      const { data, error } = await supabase.functions.invoke("import-generic-service-document", {
        body: {
          serviceType,
          fileBase64,
          fileMimeType: uploadFile?.type,
          fileName: uploadFile?.name,
          fileUrl: storagePath,
          text: extractedText || undefined,
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

      const candidate: Record<string, any> | null =
        (body?.success && (body?.data || body)) ||
        (body?.partial_data && Object.keys(body.partial_data || {}).length > 0 ? body.partial_data : null);

      // Useful = has any non-empty value besides metadata
      const hasUseful = !!candidate && Object.entries(candidate).some(([k, v]) => {
        if (k === "confianca_extracao" || k === "campos_nao_identificados") return false;
        if (v == null || v === "") return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });

      if (!hasUseful) {
        const msg = body?.error_message || body?.error || `Não foi possível identificar dados do(a) ${serviceLabel}. Tente uma imagem mais nítida.`;
        setHardError(msg);
        toast({ title: "Erro na importação", description: msg, variant: "destructive" });
        return;
      }

      setParsed(candidate!);

      const conf = (candidate as any)!.confianca_extracao?.geral ?? 0;
      const confPct = Math.round(conf * 100);
      if (conf < 0.5) toast({ title: "Dados parciais identificados", description: `Confiança ${confPct}%. Revise os campos antes de aplicar.` });
      else if (conf < 0.8) toast({ title: "Importação concluída com ressalvas", description: `Confiança ${confPct}%. Confira os campos.` });
      else toast({ title: "Importação concluída", description: "Confira os dados antes de aplicar ao orçamento." });
    } catch (e: any) {
      const msg = e?.message || "Não foi possível identificar os dados da reserva com precisão.";
      setHardError(msg);
      toast({ title: "Erro na importação", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (parsed) {
    return (
      <>
        <ReviewScreen
          data={parsed}
          onChange={setParsed}
          fields={fields}
          serviceLabel={serviceLabel}
          onCancel={() => {
            setParsed(null);
            setUploadFile(null);
            setDebugInfo(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          onConfirm={() => {
            const mapped = mapToInitialData(parsed);
            onConfirm(mapped, parsed);
          }}
          isAdmin={isAdmin}
          onShowDebug={debugInfo ? () => setShowDebug(true) : undefined}
        />
        <DebugDialog open={showDebug} onOpenChange={setShowDebug} info={debugInfo} />
      </>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Importação inteligente de {serviceLabel}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Envie um PDF, imagem ou cole o texto da reserva/confirmação de {serviceLabel}. A IA extrai os dados principais
          e abre uma tela de revisão antes de aplicar no formulário.
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
                placeholder={`Cole aqui o texto da reserva/confirmação de ${serviceLabel}...`}
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowDebug(true)} className="w-full">
                    <Bug className="h-3 w-3 mr-1" /> Ver detalhes técnicos da importação
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Voltar</Button>
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
                <span key={i} className={`h-1.5 w-6 rounded-full ${i <= progressStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        )}
        <DebugDialog open={showDebug} onOpenChange={setShowDebug} info={debugInfo} />
      </CardContent>
    </Card>
  );
}

/* ─────────── REVIEW SCREEN ─────────── */
function ReviewScreen({
  data, onChange, fields, serviceLabel, onCancel, onConfirm, isAdmin, onShowDebug,
}: {
  data: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
  fields: SmartImportField[];
  serviceLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isAdmin?: boolean;
  onShowDebug?: () => void;
}) {
  const conf = data.confianca_extracao?.geral ?? 0;
  const lowConf = conf > 0 && conf < 0.8;
  const veryLowConf = conf > 0 && conf < 0.5;

  const update = (key: string, value: any) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Revise os dados de {serviceLabel} antes de aplicar</h3>
        </div>
        {conf > 0 && (
          <Badge variant={lowConf ? "destructive" : "default"}>
            Confiança: {Math.round(conf * 100)}%
          </Badge>
        )}
      </div>

      {lowConf && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {veryLowConf
              ? "Alguns dados foram identificados com baixa confiança. Revise antes de aplicar."
              : "Alguns dados não foram identificados com segurança. Revise antes de continuar."}
          </span>
        </div>
      )}

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => {
              const raw = data[f.key];
              const value = raw == null ? "" : Array.isArray(raw) ? raw.join("\n") : String(raw);
              const setValue = (v: string) => {
                if (f.type === "number") update(f.key, v === "" ? null : Number(v.replace(",", ".")));
                else if (f.type === "list") update(f.key, v.split(/\n+/).map((s) => s.trim()).filter(Boolean));
                else update(f.key, v);
              };
              if (f.type === "textarea" || f.type === "list") {
                return (
                  <div key={f.key} className={f.full ? "sm:col-span-2" : "sm:col-span-2"}>
                    <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                    <Textarea
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={f.placeholder}
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                );
              }
              return (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={f.placeholder}
                    className="mt-1"
                    type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : "text"}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {Array.isArray(data.observacoes) && data.observacoes.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Observações</Label>
            <Textarea
              value={(data.observacoes || []).join("\n")}
              onChange={(e) => update("observacoes", e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean))}
              className="min-h-[80px] text-xs"
            />
          </CardContent>
        </Card>
      )}

      {data.politica_cancelamento && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Política de cancelamento</Label>
            <Textarea
              value={data.politica_cancelamento || ""}
              onChange={(e) => update("politica_cancelamento", e.target.value)}
              className="min-h-[60px] text-xs"
            />
          </CardContent>
        </Card>
      )}

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

/* ─────────── DEBUG DIALOG ─────────── */
function DebugDialog({ open, onOpenChange, info }: { open: boolean; onOpenChange: (v: boolean) => void; info: any }) {
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
            <Row label="Etapa" value={info.stage || "—"} />
            <Row label="Tipo de erro" value={info.error_type || "—"} />
            <Row label="Mensagem" value={info.error_message || "—"} />
            <Row label="Confiança" value={info.confidence_score != null ? `${Math.round((info.confidence_score || 0) * 100)}%` : "—"} />
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
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[110px]">{label}:</span>
      <span className="break-all">{value}</span>
    </div>
  );
}