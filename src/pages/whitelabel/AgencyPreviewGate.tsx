import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Lock, LogOut } from "lucide-react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AgencyDomainInfo, agencyDisplayName, normalizeHostname } from "@/lib/agencyDomains";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";
import {
  grantPreviewAccess,
  hasPreviewAccess,
  lockoutMsForAttempts,
  previewAccessRemainingMs,
  revokePreviewAccess,
  verifyPreviewPassword,
} from "@/lib/agencyPreviewAccess";

/** Só aceita cores simples e seguras vindas do cadastro (hex). */
function safeAccent(color?: string | null): string | null {
  const value = (color || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : null;
}

function useNoIndex(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, [title]);
}

export default function AgencyPreviewGate({ info }: { info: AgencyDomainInfo }) {
  /**
   * Identidade do tenant é SEMPRE o hostname canônico resolvido pelo
   * AgencyDomainGate (info.hostname) — nunca o host da janela, que no preview
   * técnico é id-preview/localhost. A Origin HTTP continua sendo tratada
   * apenas pela Edge Function, para CORS.
   */
  const host = normalizeHostname(info.hostname);
  const name = agencyDisplayName(info);
  const accent = safeAccent(info.primary_color);

  const [authorized, setAuthorized] = useState(() => hasPreviewAccess(host));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useNoIndex(`${name} — Visualização do novo site`);

  const lockRemaining = Math.max(0, lockedUntil - now);
  const locked = lockRemaining > 0;

  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [locked]);

  /** Expiração real mesmo com a aba aberta: desautoriza no instante do vencimento. */
  useEffect(() => {
    if (!authorized) return;
    const remaining = previewAccessRemainingMs(host);
    if (remaining <= 0) {
      revokePreviewAccess(host);
      setAuthorized(false);
      return;
    }
    const id = window.setTimeout(() => {
      revokePreviewAccess(host);
      setAuthorized(false);
    }, remaining);
    return () => window.clearTimeout(id);
  }, [authorized, host]);

  const lockLabel = useMemo(() => {
    const seconds = Math.ceil(lockRemaining / 1000);
    if (seconds >= 60) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minuto${minutes > 1 ? "s" : ""}`;
    }
    return `${seconds} segundo${seconds > 1 ? "s" : ""}`;
  }, [lockRemaining]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || locked || !password) return;
    setLoading(true);
    setError(null);
    const result = await verifyPreviewPassword(host, password);
    setLoading(false);
    setPassword("");
    if (result.ok) {
      grantPreviewAccess(host);
      setAttempts(0);
      setLockedUntil(0);
      setAuthorized(true);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    const wait = lockoutMsForAttempts(next);
    if (wait > 0) setLockedUntil(Date.now() + wait);
    setNow(Date.now());
    setError("Não foi possível liberar o acesso. Verifique os dados e tente novamente.");
    inputRef.current?.focus();
  }

  function handleExit() {
    revokePreviewAccess(host);
    setAuthorized(false);
    setPassword("");
    setError(null);
  }

  if (authorized) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-foreground px-4 py-2 text-xs text-background">
          <span className="truncate">
            Visualização privada do novo site — <BrandText as="span">{name}</BrandText>
          </span>
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-background/40 px-3 py-1 font-medium transition hover:bg-background/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sair do preview
          </button>
        </div>
        <AgencySiteLayout info={info}>
          <AgencySiteHome info={info} />
        </AgencySiteLayout>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(40_30%_98%)] px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.07]"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, ${accent ?? "hsl(var(--primary))"}, transparent)`,
        }}
      />
      <main className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          {info.logo_url ? (
            <img
              src={info.logo_url}
              alt={`Logo ${name}`}
              className="h-16 w-auto max-w-[220px] object-contain sm:h-20"
            />
          ) : (
            <span
              className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-bold text-white shadow-sm"
              style={{ backgroundColor: accent ?? "hsl(var(--foreground))" }}
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Visualização do novo site
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <BrandText as="span">{name}</BrandText> — área privada de revisão. Informe a senha
            recebida para visualizar o novo site em desenvolvimento.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <Label htmlFor="agency-preview-password" className="text-sm font-medium">
            Senha
          </Label>
          <div className="relative mt-2">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="agency-preview-password"
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || locked}
              aria-invalid={!!error}
              aria-describedby={error || locked ? "agency-preview-feedback" : undefined}
              className="pl-9"
              placeholder="••••••••"
            />
          </div>

          {(error || locked) && (
            <p
              id="agency-preview-feedback"
              role="alert"
              aria-live="polite"
              className="mt-3 text-sm text-destructive"
            >
              {locked
                ? `Muitas tentativas. Tente novamente em ${lockLabel}.`
                : error}
            </p>
          )}

          <Button
            type="submit"
            className="mt-5 w-full"
            disabled={loading || locked || !password}
            style={accent ? { backgroundColor: accent } : undefined}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Validando..." : "Acessar preview"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Conteúdo confidencial em desenvolvimento. Não indexado e não divulgado.
        </p>
      </main>
    </div>
  );
}
