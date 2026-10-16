import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Piloto "Montar orçamento com IA".
 * UI aparece só quando: host de preview técnico + o servidor (modo "status", sem IA/sem contador) confirma eligible=true.
 * Não depende de papel admin; o servidor bloqueia qualquer outra conta.
 */
export const QUOTE_AI_PILOT_KEY = "quote_ai_pilot";

export function isPilotPreviewHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || /^id-preview--[0-9a-f-]+\.lovable\.app$/i.test(host)
    || /\.lovableproject\.com$/i.test(host);
}

/** Visível só em host de preview + confirmação do servidor (allowlist). Flag local é opcional/ignorada. */
export function isQuoteAiPilotEnabled(opts: { host: string; eligible: boolean | undefined }): boolean {
  return isPilotPreviewHost(opts.host) && opts.eligible === true;
}

export function readQuoteAiPilotFlag(): string | null {
  try { return window.localStorage.getItem(QUOTE_AI_PILOT_KEY); } catch { return null; }
}

/** Consulta o status somente se host e flag local permitirem (evita chamadas para usuários comuns). */
export function useQuoteAiPilot(): boolean {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const { user } = useAuth();
  const precheck = isPilotPreviewHost(host) && !!user;
  const { data } = useQuery({
    queryKey: ["quote-ai-pilot-status", user?.id],
    enabled: precheck,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("quote-ai-compose", { body: { mode: "status" } });
      if (error) return false;
      return (data as { eligible?: boolean } | null)?.eligible === true;
    },
  });
  return isQuoteAiPilotEnabled({ host, eligible: data });
}
