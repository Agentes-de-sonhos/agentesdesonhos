import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  /** Initial message shown immediately. */
  message?: string;
  /** Message shown after `escalateAfterMs` if still loading. */
  escalatedMessage?: string;
  escalateAfterMs?: number;
}

const INTERNAL_PREFIXES = /^\/(dashboard|admin|auth|ferramentas-ia|crm|financeiro|gestao|meu-|minha-|configuracoes|comunidade|planos)/;

function isPublicClientPath(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, pathname } = window.location;
  if (hostname.endsWith(".tur.br")) return true;
  if (/^\/(orcamento|roteiro|viagem|c|v|fatura)\//.test(pathname)) return true;
  // /:agencySlug/:accessCode (links públicos por código)
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && !INTERNAL_PREFIXES.test(pathname);
}

/**
 * Global loading fallback used after login while session/plan/role data resolves.
 * Escalates the message after a few seconds so users never face a blank screen
 * without context.
 */
export function LoadingScreen({
  message = "Carregando sua área...",
  escalatedMessage = "Ainda estamos carregando seus dados. Tente atualizar a página se demorar muito.",
  escalateAfterMs = 6000,
}: Props) {
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setEscalated(true), escalateAfterMs);
    return () => window.clearTimeout(t);
  }, [escalateAfterMs]);

  // Links públicos de clientes nunca exibem textos da área interna.
  if (isPublicClientPath()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background" role="status" aria-busy="true">
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">
          {escalated ? escalatedMessage : message}
        </p>
        {escalated && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-primary hover:underline"
          >
            Atualizar a página
          </button>
        )}
      </div>
    </div>
  );
}