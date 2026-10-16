import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfText } from "@/lib/pdfText";
import { hasSufficientText } from "@/lib/fullPackageImportPayload";
import { checkQuoteTimeline } from "@/lib/quoteAiTimeline";
import { diffServiceFields, applySelectedFields, type FieldDiffRow } from "@/lib/serviceFieldDiff";
import { mapBlockToService, type AiBlock, type FullPackageImportResult } from "@/components/quote/full-package-import/FullPackageImportModal";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmService: (svc: FullPackageImportResult) => Promise<void> | void;
}

interface ComposeResult {
  trip_meta: { titulo?: string | null; destino?: string | null; data_inicio?: string | null; data_fim?: string | null };
  blocks: AiBlock[];
  nao_incluidos: string[];
  informacoes_importantes: string[];
  duvidas: string[];
}

const TYPE_LABEL: Record<string, string> = {
  flight: "Passagem aérea", hotel: "Hospedagem", attraction: "Ingresso", insurance: "Seguro viagem",
  transfer: "Transfer", car_rental: "Locação", other: "Outros",
};

async function invokeCompose(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("quote-ai-compose", { body });
  if (error) {
    let msg = "Falha ao chamar a IA.";
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

const summary = (b: AiBlock) => {
  const d: any = b.data || {};
  if (b.type === "flight") return `${d.resumo?.origem_inicial ?? "?"} → ${d.resumo?.destino_final ?? "?"} · ${d.resumo?.data_ida ?? "sem data"} a ${d.resumo?.data_retorno ?? "sem data"}`;
  if (b.type === "hotel") return `${d.nome_hotel || "Hotel não informado"} · ${d.check_in ?? "?"} a ${d.check_out ?? "?"}`;
  if (b.type === "attraction") return `${d.nome_produto || "Ingresso"}${d.tipo_ingresso ? ` · ${d.tipo_ingresso}` : ""}${d.data ? ` · ${d.data}` : ""}`;
  if (b.type === "insurance") return `${d.seguradora || "Seguradora não informada"} · ${d.data_inicio ?? "?"} a ${d.data_fim ?? "?"}`;
  return d.titulo || d.descricao || b.label;
};

export function QuoteAiComposeDialog({ open, onOpenChange, onConfirmService }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [listening, setListening] = useState(false);
  const [creating, setCreating] = useState(false);
  const [compare, setCompare] = useState<{ blockId: string; incoming: Record<string, any>; rows: FieldDiffRow[]; pick: Set<string> } | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pdfTarget = useRef<string | null>(null);

  const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  useEffect(() => () => recRef.current?.stop?.(), []);
  useEffect(() => { if (!open) { recRef.current?.stop?.(); setListening(false); } }, [open]);

  const toggleMic = () => {
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0]?.transcript || "").join(" ").trim();
      if (t) setText((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onerror = () => toast.error("Não foi possível usar o microfone. Digite ou use o ditado do teclado.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const data = await invokeCompose({ mode: "compose", text });
      setResult(data);
      setSelected(new Set((data.blocks as AiBlock[]).map((b) => b.id)));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const warnings = useMemo(
    () => (result ? checkQuoteTimeline(result.blocks, { meta: { data_inicio: result.trip_meta.data_inicio ?? undefined, data_fim: result.trip_meta.data_fim ?? undefined } }) : []),
    [result],
  );

  const onPdfChosen = async (file: File | undefined) => {
    const blockId = pdfTarget.current;
    if (!file || !blockId || !result) return;
    const block = result.blocks.find((b) => b.id === blockId);
    if (!block) return;
    if (file.type !== "application/pdf") return toast.error("Envie um PDF.");
    if (file.size > 10 * 1024 * 1024) return toast.error("PDF acima de 10MB.");
    setPdfLoading(blockId);
    try {
      const pdfText = await extractPdfText(file);
      if (!hasSufficientText(pdfText)) throw new Error("PDF sem texto legível (digitalizado). No piloto, só PDFs com texto são aceitos.");
      const data = await invokeCompose({ mode: "document", service_type: block.type, text: pdfText });
      const incoming = data.block?.data || {};
      const rows = diffServiceFields(block.data, incoming);
      if (!rows.length) toast.info("O PDF não trouxe nada diferente deste serviço.");
      else setCompare({ blockId, incoming, rows, pick: new Set() });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPdfLoading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyCompare = () => {
    if (!compare || !result) return;
    setResult({
      ...result,
      blocks: result.blocks.map((b) => (b.id === compare.blockId ? { ...b, data: applySelectedFields(b.data, compare.incoming, compare.pick) } : b)),
    });
    setCompare(null);
  };

  const createSelected = async () => {
    if (!result) return;
    setCreating(true);
    const extras: AiBlock[] = [];
    const mk = (id: string, titulo: string, items: string[]): AiBlock => ({
      id, type: "other" as any, confidence: 1, label: titulo, raw_excerpt: "", missing_fields: [], unexpected: false,
      data: { titulo, descricao: items.map((i) => `• ${i}`).join("\n") },
    });
    if (result.nao_incluidos.length && selected.has("nao_incluidos")) extras.push(mk("nao_incluidos", "Itens não incluídos", result.nao_incluidos));
    if (result.informacoes_importantes.length && selected.has("informacoes")) extras.push(mk("informacoes", "Informações importantes", result.informacoes_importantes));
    let ok = 0;
    try {
      for (const b of [...result.blocks.filter((x) => selected.has(x.id)), ...extras]) {
        const svc = mapBlockToService(b);
        if (!svc) continue;
        await onConfirmService(svc);
        ok++;
      }
      toast.success(`${ok} serviço(s) adicionados. Revise cada um antes de compartilhar.`);
      onOpenChange(false);
      setResult(null);
      setText("");
    } catch {
      toast.error(`Falha ao criar serviços (${ok} criados).`);
    } finally {
      setCreating(false);
    }
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Montar orçamento com IA
            <Badge variant="outline">Modo teste</Badge>
          </DialogTitle>
          <DialogDescription>
            Descreva a viagem. Nada é criado até você revisar a prévia. A IA não inventa valores nem reservas.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <Textarea
              rows={8}
              maxLength={6000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: Família de 4 para Orlando de 10 a 20/01/2027, voo GRU-MCO. Hotel Disney de 10 a 15 e Universal de 15 a 20. Ingressos Disney 4 dias, Universal 2 parques, SeaWorld. Seguro viagem. Não inclui alimentação."
            />
            <div className="flex items-center justify-between gap-2">
              {SR ? (
                <Button type="button" variant={listening ? "destructive" : "outline"} size="sm" onClick={toggleMic}>
                  {listening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                  {listening ? "Parar" : "Ditar"}
                </Button>
              ) : <span className="text-xs text-muted-foreground">Use o ditado do teclado para falar.</span>}
              <Button onClick={analyze} disabled={loading || text.trim().length < 10}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Gerar prévia
              </Button>
            </div>
          </div>
        )}

        {result && !compare && (
          <div className="space-y-4">
            {warnings.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />{w.message}</p>
                ))}
                <p className="text-xs text-muted-foreground">As datas não foram alteradas. Corrija no texto ou no serviço.</p>
              </div>
            )}
            {result.duvidas.length > 0 && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p className="font-medium">Pontos a confirmar</p>
                {result.duvidas.map((d, i) => <p key={i}>• {d}</p>)}
              </div>
            )}
            <div className="space-y-2">
              {result.blocks.map((b) => (
                <div key={b.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{TYPE_LABEL[b.type] || b.type}{b.label ? ` — ${b.label}` : ""}</p>
                    <p className="text-xs text-muted-foreground break-words">{summary(b)}</p>
                    {b.missing_fields.length > 0 && <p className="text-xs text-muted-foreground mt-1">Faltando: {b.missing_fields.join(", ")}</p>}
                  </div>
                  <Button
                    size="sm" variant="ghost" disabled={pdfLoading === b.id}
                    onClick={() => { pdfTarget.current = b.id; fileRef.current?.click(); }}
                  >
                    {pdfLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">PDF</span>
                  </Button>
                </div>
              ))}
              {result.nao_incluidos.length > 0 && (
                <label className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox checked={selected.has("nao_incluidos")} onCheckedChange={() => toggle("nao_incluidos")} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">Itens não incluídos</p>{result.nao_incluidos.map((t, i) => <p key={i} className="text-xs text-muted-foreground">• {t}</p>)}</div>
                </label>
              )}
              {result.informacoes_importantes.length > 0 && (
                <label className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox checked={selected.has("informacoes")} onCheckedChange={() => toggle("informacoes")} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">Informações importantes</p>{result.informacoes_importantes.map((t, i) => <p key={i} className="text-xs text-muted-foreground">• {t}</p>)}</div>
                </label>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>Voltar ao texto</Button>
              <Button onClick={createSelected} disabled={creating || selected.size === 0}>
                {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar selecionados
              </Button>
            </div>
          </div>
        )}

        {compare && (
          <div className="space-y-3">
            <p className="text-sm">Escolha o que o PDF deve substituir. Campos não marcados ficam como estão.</p>
            {compare.rows.map((r) => (
              <label key={r.key} className="flex items-start gap-3 rounded-md border p-2 text-xs">
                <Checkbox
                  checked={compare.pick.has(r.key)}
                  onCheckedChange={() => setCompare((c) => { if (!c) return c; const p = new Set(c.pick); p.has(r.key) ? p.delete(r.key) : p.add(r.key); return { ...c, pick: p }; })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 flex-1 min-w-0 break-words">
                  <span className="font-medium">{r.key}</span>
                  <span className="text-muted-foreground">Atual: {r.current || "—"}</span>
                  <span>PDF: {r.incoming}</span>
                </div>
              </label>
            ))}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setCompare(null)}>Cancelar</Button>
              <Button onClick={applyCompare} disabled={compare.pick.size === 0}>Aplicar selecionados</Button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onPdfChosen(e.target.files?.[0])} />
      </DialogContent>
    </Dialog>
  );
}
