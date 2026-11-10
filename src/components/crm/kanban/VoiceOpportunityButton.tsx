import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { VoiceOpportunityPrefill } from "../OpportunityForm";

const SILENCE_MS = 2500;
const BARS = 24;

/**
 * Ditado por voz (pt-BR) no rodapé da coluna: barra flutuante com ondas ao vivo,
 * transcrição em tempo real e conclusão automática por silêncio. A IA transforma
 * a fala em uma sugestão de oportunidade, revisada no formulário.
 */
export interface VoiceCommandContext {
  stages: { id: string; name: string }[];
  cards: { id: string; client: string; destination: string; stage: string }[];
}

export interface VoiceCommandResult {
  action: "create_opportunity" | "move_stage" | "create_followup" | "add_note" | "unknown";
  card_id: string | null;
  stage_id: string | null;
  follow_up_date: string | null;
  note: string | null;
  message: string | null;
  options?: string[];
}

export function VoiceOpportunityButton({
  onResult,
  getContext,
  onCommand,
  label = "Criar oportunidade por voz",
}: {
  onResult: (p: VoiceOpportunityPrefill) => void;
  /** Quando informado, a fala também pode mover cartões, agendar follow-ups e anotar. */
  getContext?: () => VoiceCommandContext;
  onCommand?: (r: VoiceCommandResult, transcript: string) => void | Promise<void>;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "listening" | "parsing" | "asking">("idle");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const historyRef = useRef("");
  const roundsRef = useRef(0);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const recRef = useRef<any>(null);
  const textRef = useRef("");
  const cancelledRef = useRef(false);
  const silenceRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const SR: any =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  const stopAudio = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    silenceRef.current = null;
  };

  useEffect(
    () => () => {
      cancelledRef.current = true;
      recRef.current?.abort?.();
      stopAudio();
    },
    []
  );

  const armSilence = () => {
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    silenceRef.current = window.setTimeout(() => recRef.current?.stop(), SILENCE_MS);
  };

  const reset = () => {
    historyRef.current = "";
    roundsRef.current = 0;
    setQuestion("");
    setOptions([]);
    setFinalText("");
    setInterim("");
    setState("idle");
  };

  const parse = async (said: string) => {
    const text = historyRef.current ? `${historyRef.current}\nResposta do usuário: ${said}` : said;
    setState("parsing");
    setFinalText("");
    setInterim("");
    try {
      const { data, error } = await supabase.functions.invoke("kanban-voice-command", {
        body: { text, ...(getContext ? getContext() : {}) },
      });
      if (error) {
        let msg = "Não foi possível interpretar o áudio.";
        try {
          const j = await (error as any).context?.clone?.().json?.();
          if (j?.error) msg = j.error;
        } catch { /* mantém mensagem padrão */ }
        toast.error(msg);
        reset();
        return;
      }
      const d = data?.data ?? {};
      if (onCommand && d.action === "unknown" && roundsRef.current < 3) {
        // Diálogo: a IA pergunta e o usuário responde por voz ou clicando.
        roundsRef.current += 1;
        historyRef.current = text;
        setQuestion(d.message || "Não entendi. Pode repetir de outro jeito?");
        setOptions(Array.isArray(d.options) ? d.options.slice(0, 4) : []);
        setState("asking");
        return;
      }
      if (onCommand && d.action && d.action !== "create_opportunity") {
        reset();
        await onCommand(d as VoiceCommandResult, text);
        return;
      }
      reset();
      onResult({ ...d, notes: d.notes || `Ditado: ${said}` });
    } catch {
      toast.error("Não foi possível interpretar o áudio.");
      reset();
    }
  };

  const startMeter = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const next: number[] = [];
      for (let i = 0; i < BARS; i++) next.push(Math.max(0.08, (buf[i % buf.length] || 0) / 255));
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = async () => {
    if (!SR || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador não permite ditado. Use o Chrome ou o Edge.");
      return;
    }
    try {
      await startMeter();
    } catch (e: any) {
      stopAudio();
      toast.error(
        e?.name === "NotAllowedError"
          ? "Microfone bloqueado. Clique no cadeado ao lado do endereço do site, permita o microfone e tente de novo."
          : "Nenhum microfone encontrado. Verifique se ele está conectado."
      );
      return;
    }
    cancelledRef.current = false;
    textRef.current = "";
    setFinalText("");
    setInterim("");
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let fin = "";
      let tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal) fin += t + " ";
        else tmp += t;
      }
      textRef.current = (fin + tmp).trim();
      setFinalText(fin.trim());
      setInterim(tmp);
      armSilence();
    };
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed") toast.error("Microfone bloqueado. Permita o acesso ao microfone no navegador.");
      else if (e?.error === "no-speech") toast.message("Não ouvi nada. Tente falar mais perto do microfone.");
      else if (e?.error !== "aborted") toast.error("Não foi possível usar o microfone.");
    };
    rec.onend = () => {
      stopAudio();
      const t = textRef.current;
      if (t && !cancelledRef.current) void parse(t);
      else if (!cancelledRef.current && historyRef.current) setState("asking");
      else reset();
    };
    recRef.current = rec;
    setState("listening");
    rec.start();
    // Se ninguém falar em 8s, encerra.
    silenceRef.current = window.setTimeout(() => recRef.current?.stop(), 8000);
  };

  const finish = () => recRef.current?.stop();
  const cancel = () => {
    cancelledRef.current = true;
    if (recRef.current && state === "listening") recRef.current.abort?.();
    reset();
  };

  const toggle = () => {
    if (state === "listening") return finish();
    if (state === "idle" || state === "asking") void start();
  };

  const overlay =
    state !== "idle" &&
    createPortal(
      <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                state === "listening" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
              )}
            >
              {state === "parsing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {state === "listening"
                  ? historyRef.current ? "Pode responder..." : "Ouvindo você..."
                  : state === "asking" ? "Preciso de um detalhe" : "Entendendo o comando..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {state === "asking"
                  ? "Responda por voz ou toque em uma opção."
                  : state === "listening"
                  ? getContext
                    ? "Ex.: “Mover a Adriana para Orçamento enviado”, “Follow-up do Fernando dia 10 de dezembro” ou uma nova viagem."
                    : "Diga cliente, destino, datas, pessoas e valor. Conclui sozinho após uma pausa."
                  : "A IA está organizando o que você falou."}
              </p>
            </div>
            {(state === "listening" || state === "asking") && (
              <Button size="icon" variant="ghost" onClick={cancel} aria-label="Cancelar ditado">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {state === "listening" && (
            <div className="mt-3 flex h-10 items-center justify-center gap-[3px]" aria-hidden>
              {levels.map((l, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-destructive/70 transition-[height] duration-75"
                  style={{ height: `${Math.round(l * 100)}%` }}
                />
              ))}
            </div>
          )}
          {state === "asking" && (
            <div className="mt-3 space-y-3">
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium">{question}</p>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (
                    <Button key={o} size="sm" variant="secondary" onClick={() => void parse(o)}>
                      {o}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={cancel}>Cancelar</Button>
                <Button size="sm" onClick={() => void start()} className="gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Responder por voz
                </Button>
              </div>
            </div>
          )}
          {state !== "asking" && (
          <div className="mt-3 min-h-[2.5rem] rounded-lg bg-muted/60 px-3 py-2 text-sm">
            {finalText || interim ? (
              <>
                <span>{finalText} </span>
                <span className="text-muted-foreground">{interim}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {state === "parsing" ? "..." : "Comece a falar..."}
              </span>
            )}
          </div>
          )}
          {state === "listening" && (
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancel}>Cancelar</Button>
              <Button size="sm" onClick={finish} disabled={!finalText && !interim}>Concluir</Button>
            </div>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title={state === "listening" ? "Concluir ditado" : label}
        aria-label={state === "listening" ? "Concluir ditado" : label}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground",
          state === "listening" && "animate-pulse bg-destructive/10 text-destructive"
        )}
      >
        {state === "parsing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "listening" ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {overlay}
    </>
  );
}
