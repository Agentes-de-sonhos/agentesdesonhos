import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { VoiceOpportunityPrefill } from "../OpportunityForm";

/**
 * Ditado por voz (pt-BR) no rodapé da coluna: transcreve no navegador e a IA
 * transforma a fala em uma sugestão de oportunidade, revisada no formulário.
 */
export function VoiceOpportunityButton({ onResult }: { onResult: (p: VoiceOpportunityPrefill) => void }) {
  const [state, setState] = useState<"idle" | "listening" | "parsing">("idle");
  const recRef = useRef<any>(null);
  const textRef = useRef("");
  const SR: any =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  useEffect(() => () => recRef.current?.abort?.(), []);

  const parse = async (text: string) => {
    setState("parsing");
    try {
      const { data, error } = await supabase.functions.invoke("kanban-voice-command", { body: { text } });
      if (error) {
        let msg = "Não foi possível interpretar o áudio.";
        try {
          const j = await (error as any).context?.clone?.().json?.();
          if (j?.error) msg = j.error;
        } catch { /* mantém mensagem padrão */ }
        toast.error(msg);
        return;
      }
      onResult({ ...(data?.data ?? {}), notes: data?.data?.notes || `Ditado: ${text}` });
    } finally {
      setState("idle");
    }
  };

  const toggle = () => {
    if (!SR) {
      toast.error("Este navegador não permite ditado. Use o Chrome ou o Edge.");
      return;
    }
    if (state === "listening") {
      recRef.current?.stop();
      return;
    }
    if (state !== "idle") return;
    textRef.current = "";
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      textRef.current = Array.from(e.results).map((r: any) => r[0]?.transcript || "").join(" ").trim();
    };
    rec.onerror = (e: any) => {
      if (e?.error !== "aborted" && e?.error !== "no-speech") toast.error("Não foi possível usar o microfone.");
    };
    rec.onend = () => {
      const t = textRef.current;
      if (t) void parse(t);
      else setState("idle");
    };
    recRef.current = rec;
    setState("listening");
    toast.message("Fale a oportunidade: cliente, destino, datas, pessoas e valor. Clique de novo para concluir.");
    rec.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={state === "listening" ? "Concluir ditado" : "Criar oportunidade por voz"}
      aria-label={state === "listening" ? "Concluir ditado" : "Criar oportunidade por voz"}
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
  );
}
