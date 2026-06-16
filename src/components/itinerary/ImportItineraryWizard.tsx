import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Upload, FileText, X, Loader2, Sparkles, Trash2, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useItineraries } from "@/hooks/useItineraries";
import { parseLocalDate } from "@/lib/dateParsing";
import {
  buildConsolidatedText,
  extractFileText,
  type ExtractedDoc,
} from "@/lib/extractDocText";
import type {
  AIGeneratedItinerary,
  ItineraryFormData,
} from "@/types/itinerary";
import { useNavigate } from "react-router-dom";

type Period = "manha" | "tarde" | "noite";

interface ParsedActivity {
  period: Period;
  title: string;
  description: string | null;
  location: string | null;
  time: string | null;
  estimated_duration: string | null;
  estimated_cost: string | null;
  source_excerpt: string;
  confidence: "high" | "medium" | "low";
  _removed?: boolean;
}

interface ParsedDay {
  day_number: number;
  date: string | null;
  confidence: "high" | "medium" | "low";
  activities: ParsedActivity[];
}

interface ParsedItinerary {
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travelers_count: number | null;
  summary?: string;
  days: ParsedDay[];
  truncated?: boolean;
}

type Step = "upload" | "processing" | "review";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED = ".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILES = 5;

const confidenceBadge = (c: "high" | "medium" | "low") => {
  if (c === "high") return { label: "Alta", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  if (c === "medium") return { label: "Média", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  return { label: "Baixa", className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" };
};

export function ImportItineraryWizard({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { createItinerary, saveGeneratedItinerary } = useItineraries();

  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [destinationHint, setDestinationHint] = useState("");
  const [startHint, setStartHint] = useState("");
  const [endHint, setEndHint] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItinerary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setTimeout(() => {
        setStep("upload");
        setFiles([]);
        setPastedText("");
        setDestinationHint("");
        setStartHint("");
        setEndHint("");
        setParsed(null);
        setParsing(false);
        setSubmitting(false);
      }, 200);
    }
  }, [open]);

  const totalActivities = useMemo(
    () =>
      parsed?.days.reduce(
        (sum, d) => sum + d.activities.filter((a) => !a._removed).length,
        0
      ) ?? 0,
    [parsed]
  );

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    const next = [...files];
    for (const f of arr) {
      if (next.length >= MAX_FILES) {
        toast.warning(`Máximo de ${MAX_FILES} arquivos por importação.`);
        break;
      }
      const dup = next.find((x) => x.name === f.name && x.size === f.size);
      if (dup) continue;
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const canProcess =
    files.length > 0 || pastedText.trim().length > 50;

  const handleProcess = async () => {
    if (!canProcess) return;
    setParsing(true);
    setStep("processing");
    try {
      const extracted: ExtractedDoc[] = [];
      for (const file of files) {
        try {
          const doc = await extractFileText(file);
          if (!doc.text || doc.text.length < 20) {
            toast.warning(
              `"${doc.filename}" não retornou texto legível (pode ser um PDF escaneado).`
            );
            continue;
          }
          extracted.push(doc);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Erro em "${file.name}".`);
        }
      }

      const text = buildConsolidatedText(extracted, pastedText);
      if (text.trim().length < 30) {
        toast.error("Não há texto suficiente para analisar. Adicione mais arquivos ou cole o roteiro.");
        setStep("upload");
        return;
      }

      const { data, error } = await supabase.functions.invoke("parse-itinerary-ai", {
        body: {
          text,
          destinationHint: destinationHint.trim() || undefined,
          startDateHint: startHint || undefined,
          endDateHint: endHint || undefined,
        },
      });

      if (error) {
        let msg = "Não foi possível analisar o roteiro.";
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const b = await ctx.json();
            if (b?.error) msg = b.error;
          }
        } catch {}
        toast.error(msg);
        setStep("upload");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setStep("upload");
        return;
      }

      const result: ParsedItinerary = {
        destination: data.destination || destinationHint || "Destino a definir",
        start_date: data.start_date || startHint || null,
        end_date: data.end_date || endHint || null,
        travelers_count: data.travelers_count ?? null,
        summary: data.summary,
        days: (data.days || []).map((d: any, i: number) => ({
          day_number: d.day_number ?? i + 1,
          date: d.date ?? null,
          confidence: d.confidence ?? "medium",
          activities: (d.activities || []).map((a: any) => ({
            period: (["manha", "tarde", "noite"].includes(a.period) ? a.period : "manha") as Period,
            title: String(a.title || "").trim() || "Atividade",
            description: a.description ?? null,
            location: a.location ?? null,
            time: a.time ?? null,
            estimated_duration: a.estimated_duration ?? null,
            estimated_cost: a.estimated_cost ?? null,
            source_excerpt: String(a.source_excerpt || "").slice(0, 300),
            confidence: (["high", "medium", "low"].includes(a.confidence) ? a.confidence : "medium") as ParsedActivity["confidence"],
          })),
        })),
        truncated: !!data.truncated,
      };

      if (result.days.length === 0) {
        toast.error("A IA não identificou dias de viagem nos documentos.");
        setStep("upload");
        return;
      }

      setParsed(result);
      setStep("review");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao processar o roteiro.");
      setStep("upload");
    } finally {
      setParsing(false);
    }
  };

  const updateActivity = (dayIdx: number, actIdx: number, patch: Partial<ParsedActivity>) => {
    if (!parsed) return;
    const days = parsed.days.map((d, di) => {
      if (di !== dayIdx) return d;
      return {
        ...d,
        activities: d.activities.map((a, ai) => (ai !== actIdx ? a : { ...a, ...patch })),
      };
    });
    setParsed({ ...parsed, days });
  };

  const removeActivity = (dayIdx: number, actIdx: number) => {
    updateActivity(dayIdx, actIdx, { _removed: true });
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    if (!parsed.start_date) {
      toast.error("Defina a data de início do roteiro para confirmar.");
      return;
    }
    if (totalActivities === 0) {
      toast.error("Mantenha ao menos uma atividade para criar o roteiro.");
      return;
    }

    setSubmitting(true);
    try {
      const startDate = parseLocalDate(parsed.start_date);
      const endDate = parsed.end_date
        ? parseLocalDate(parsed.end_date)
        : new Date(startDate.getTime() + (parsed.days.length - 1) * 86400000);

      const formData: ItineraryFormData = {
        destination: parsed.destination,
        startDate,
        endDate,
        travelersCount: parsed.travelers_count ?? 2,
        tripType: "familia",
        budgetLevel: "conforto",
        interests: [],
        travelPace: "moderado",
        additionalPreferences: {},
      };

      const itinerary = await createItinerary.mutateAsync(formData);

      const generated: AIGeneratedItinerary = {
        days: parsed.days.map((d, i) => ({
          dayNumber: d.day_number || i + 1,
          date: d.date || "",
          activities: d.activities
            .filter((a) => !a._removed)
            .map((a) => ({
              period: a.period,
              title: a.title,
              description:
                (a.time ? `${a.time} — ` : "") + (a.description ?? ""),
              location: a.location ?? "",
              estimatedDuration: a.estimated_duration ?? "",
              estimatedCost: a.estimated_cost ?? "",
            })),
        })),
      };

      await saveGeneratedItinerary(itinerary.id, generated, startDate);

      toast.success("Roteiro importado! As imagens estão sendo buscadas em segundo plano.");
      onOpenChange(false);
      navigate(`/ferramentas-ia/criar-roteiro/${itinerary.id}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao criar o roteiro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar roteiro existente
          </DialogTitle>
          <DialogDescription>
            Envie PDFs, DOCs ou cole o texto da programação. A IA estrutura o roteiro para você revisar.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-5">
            {/* Dropzone */}
            <label
              htmlFor="import-files"
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Clique para enviar ou arraste arquivos aqui</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX ou TXT — até {MAX_FILES} arquivos, 10MB cada
              </p>
              <input
                id="import-files"
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label htmlFor="pasted">Ou cole o texto do roteiro</Label>
              <Textarea
                id="pasted"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui a programação recebida por e-mail, WhatsApp ou anotações..."
                rows={6}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="hint-dest">Destino (opcional)</Label>
                <Input
                  id="hint-dest"
                  value={destinationHint}
                  onChange={(e) => setDestinationHint(e.target.value)}
                  placeholder="Ex: Orlando"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="hint-start">Início (opcional)</Label>
                <Input
                  id="hint-start"
                  type="date"
                  value={startHint}
                  onChange={(e) => setStartHint(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="hint-end">Fim (opcional)</Label>
                <Input
                  id="hint-end"
                  type="date"
                  value={endHint}
                  onChange={(e) => setEndHint(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleProcess} disabled={!canProcess}>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Analisando seus documentos...</p>
              <p className="text-sm text-muted-foreground mt-1">
                A IA está identificando dias, atividades e organizando o roteiro.
              </p>
            </div>
          </div>
        )}

        {step === "review" && parsed && (
          <div className="space-y-4">
            <Card className="p-4 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Destino</div>
                  <Input
                    value={parsed.destination}
                    onChange={(e) => setParsed({ ...parsed, destination: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Início</div>
                  <Input
                    type="date"
                    value={parsed.start_date ?? ""}
                    onChange={(e) => setParsed({ ...parsed, start_date: e.target.value || null })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Fim</div>
                  <Input
                    type="date"
                    value={parsed.end_date ?? ""}
                    onChange={(e) => setParsed({ ...parsed, end_date: e.target.value || null })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {parsed.days.length} dia(s) identificado(s) · {totalActivities} atividade(s)
                {parsed.truncated && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Documentos truncados para análise
                  </span>
                )}
              </div>
            </Card>

            <Accordion type="multiple" defaultValue={parsed.days.map((_, i) => `d${i}`)}>
              {parsed.days.map((day, di) => {
                const visible = day.activities.filter((a) => !a._removed);
                const cb = confidenceBadge(day.confidence);
                return (
                  <AccordionItem key={di} value={`d${di}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 text-left">
                        <span className="font-semibold">Dia {day.day_number}</span>
                        {day.date && (
                          <span className="text-xs text-muted-foreground">{day.date}</span>
                        )}
                        <Badge variant="outline" className={cb.className}>
                          {cb.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          · {visible.length} atividade(s)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {day.activities.map((a, ai) => {
                          if (a._removed) return null;
                          const acb = confidenceBadge(a.confidence);
                          return (
                            <div key={ai} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <select
                                  value={a.period}
                                  onChange={(e) =>
                                    updateActivity(di, ai, { period: e.target.value as Period })
                                  }
                                  className="text-xs bg-background border rounded px-2 py-1"
                                >
                                  <option value="manha">Manhã</option>
                                  <option value="tarde">Tarde</option>
                                  <option value="noite">Noite</option>
                                </select>
                                <Input
                                  value={a.title}
                                  onChange={(e) =>
                                    updateActivity(di, ai, { title: e.target.value })
                                  }
                                  className="flex-1 h-8"
                                />
                                <Badge variant="outline" className={acb.className}>
                                  {acb.label}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeActivity(di, ai)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                value={a.description ?? ""}
                                onChange={(e) =>
                                  updateActivity(di, ai, { description: e.target.value })
                                }
                                placeholder="Descrição"
                                rows={2}
                                className="text-sm"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  value={a.location ?? ""}
                                  onChange={(e) =>
                                    updateActivity(di, ai, { location: e.target.value })
                                  }
                                  placeholder="Local"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  value={a.time ?? ""}
                                  onChange={(e) =>
                                    updateActivity(di, ai, { time: e.target.value })
                                  }
                                  placeholder="Horário (ex: 14:00)"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  value={a.estimated_duration ?? ""}
                                  onChange={(e) =>
                                    updateActivity(di, ai, { estimated_duration: e.target.value })
                                  }
                                  placeholder="Duração"
                                  className="h-8 text-sm"
                                />
                              </div>
                              {a.source_excerpt && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                                  "{a.source_excerpt}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {visible.length === 0 && (
                          <p className="text-sm text-muted-foreground italic py-2">
                            Todas as atividades deste dia foram removidas.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="flex justify-between gap-2 pt-2 sticky bottom-0 bg-background pb-1">
              <Button variant="outline" onClick={() => setStep("upload")} disabled={submitting}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Criando roteiro...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Confirmar e criar roteiro
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}