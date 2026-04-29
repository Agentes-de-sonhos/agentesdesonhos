import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Upload, FileText, Loader2, AlertCircle, Plane, BedDouble, ArrowLeft, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type AIImportServiceType = "flight" | "hotel";

export interface AIImportResult {
  service_type: AIImportServiceType;
  /** Merged service_data ready to be saved (extracted + accepted suggestions). */
  service_data: Record<string, any>;
}

interface AIImportServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Restrict the picker to a subset (defaults to flight + hotel). */
  allowedTypes?: AIImportServiceType[];
  onImport: (result: AIImportResult) => Promise<void> | void;
}

const TYPE_LABELS: Record<AIImportServiceType, string> = {
  flight: "Passagem aérea",
  hotel: "Hospedagem",
};

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

type Step = "form" | "processing" | "review";

export function AIImportServiceModal({
  open,
  onOpenChange,
  allowedTypes = ["flight", "hotel"],
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

  const handleAnalyze = async () => {
    if (inputMode === "file" && !file) {
      toast({ title: "Anexe um arquivo", description: "Envie PDF, PNG, JPG ou WEBP.", variant: "destructive" });
      return;
    }
    if (inputMode === "text" && text.trim().length < 20) {
      toast({ title: "Texto muito curto", description: "Cole o texto completo do voucher/confirmação.", variant: "destructive" });
      return;
    }
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: "Arquivo muito grande", description: "Limite de 8MB.", variant: "destructive" });
        return;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        toast({ title: "Formato não suportado", description: "Use PDF, PNG, JPG ou WEBP.", variant: "destructive" });
        return;
      }
    }

    setStep("processing");
    setProgressMsg("Lendo documento com IA...");

    try {
      const payload: Record<string, unknown> = { service_type: serviceType };
      if (inputMode === "file" && file) {
        const b64 = await fileToBase64(file);
        payload.file_base64 = b64;
        payload.file_mime = file.type;
      } else {
        payload.text = text;
      }

      setProgressMsg("Analisando dados...");
      const { data, error } = await supabase.functions.invoke("ai-import-service", { body: payload });

      if (error || !data || (data as any).error) {
        const message = (data as any)?.error || error?.message || "Erro ao processar.";
        toast({ title: "Não foi possível importar", description: message, variant: "destructive" });
        setStep("form");
        return;
      }

      setProgressMsg("Preparando sugestões...");
      setExtracted((data as any).extracted || {});
      setSuggested((data as any).suggested || {});
      setConfidenceNotes((data as any).confidence_notes || "");
      setEdited({ ...((data as any).extracted || {}) });
      // Pre-accept all non-empty suggestions but the user can untoggle
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
    // Merge edited (user-confirmed extracted) + accepted suggestions
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
      toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // List of simple string fields to render in the review step.
  // Arrays (segments, passengers, guests) are presented as a summary count.
  const reviewFields = (() => {
    const data: Record<string, any> = edited;
    return Object.entries(data).filter(([_, v]) => typeof v === "string");
  })();

  const arrayFields = (() => {
    const data: Record<string, any> = edited;
    return Object.entries(data).filter(([_, v]) => Array.isArray(v) && v.length > 0);
  })();

  const TypeIcon = serviceType === "flight" ? Plane : BedDouble;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar serviço com IA
          </DialogTitle>
          <DialogDescription>
            Envie um voucher, confirmação, PDF, imagem ou texto para a IA preencher os dados do serviço automaticamente.
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-5">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Tipo de serviço</Label>
              <RadioGroup
                value={serviceType}
                onValueChange={(v) => setServiceType(v as AIImportServiceType)}
                className="grid grid-cols-2 gap-2"
              >
                {allowedTypes.map((t) => (
                  <label
                    key={t}
                    htmlFor={`ai-import-type-${t}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors",
                      serviceType === t ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40",
                    )}
                  >
                    <RadioGroupItem value={t} id={`ai-import-type-${t}`} />
                    {t === "flight" ? <Plane className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                    <span className="text-sm font-medium">{TYPE_LABELS[t]}</span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Nesta primeira fase, suportamos {allowedTypes.map((t) => TYPE_LABELS[t]).join(" e ")}. Outros tipos chegarão em breve.
              </p>
            </div>

            {/* Input mode */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-1" /> Arquivo (PDF/Imagem)
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-1" /> Colar texto
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="space-y-2 pt-3">
                <Label htmlFor="ai-import-file">Anexar arquivo</Label>
                <Input
                  id="ai-import-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Aceitamos PDF, PNG, JPG, JPEG e WEBP (até 8MB).
                </p>
                {file && (
                  <p className="text-xs text-muted-foreground truncate">
                    Selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </TabsContent>
              <TabsContent value="text" className="space-y-2 pt-3">
                <Label htmlFor="ai-import-text">Cole o texto do voucher/confirmação</Label>
                <Textarea
                  id="ai-import-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cole aqui o e-mail, voucher ou confirmação do serviço..."
                  className="min-h-[180px]"
                  maxLength={30000}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze}>
                <Wand2 className="h-4 w-4 mr-1" />
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">{progressMsg || "Processando..."}</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-amber-900 dark:text-amber-200">
                Revise os dados encontrados antes de salvar. A IA pode errar — confirme antes de criar o serviço.
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium">
              <TypeIcon className="h-4 w-4 text-primary" />
              {TYPE_LABELS[serviceType]}
            </div>

            {/* Extracted fields */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Dados encontrados no documento</h3>
              {reviewFields.length === 0 && arrayFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum campo extraído. Você pode preencher manualmente após salvar.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {reviewFields.map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs capitalize">{humanizeKey(key)}</Label>
                      <Input
                        value={(value as string) || ""}
                        onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Não encontrado — preencha se desejar"
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
                      <strong>{humanizeKey(key)}:</strong> {(value as any[]).length} item(s) detectado(s) — serão criados automaticamente.
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Suggestions */}
            {Object.keys(suggested).length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Sugestões da IA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sugestão baseada em dados públicos, revise antes de salvar.
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
                            setAcceptedSuggestions((prev) => ({ ...prev, [key]: e.target.checked }))
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
                <p className="text-xs text-muted-foreground whitespace-pre-line">{confidenceNotes}</p>
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