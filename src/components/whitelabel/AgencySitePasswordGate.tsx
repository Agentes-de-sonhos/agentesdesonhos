import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandText } from "@/components/ui/brand-text";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import {
  clearUnlock,
  isPasswordExemptPath,
  isTenantPasswordProtected,
  readStoredUnlock,
  saveUnlock,
  unlockWithPassword,
  verifyUnlockToken,
} from "@/lib/agencySitePassword";

type Phase = "checking" | "locked" | "unlocked" | "verifyUnavailable";

/** Tokens já conferidos nesta aba (evita nova chamada a cada navegação). */
const verifiedThisSession = new Set<string>();

/**
 * Envolve as páginas institucionais. Renderiza no próprio URL solicitado
 * (inclusive `?__agency_host=`), então o destino é preservado após liberar.
 */
export function AgencySitePasswordGate({ info, children }: { info: AgencyDomainInfo; children: ReactNode }) {
  const { pathname } = useLocation();
  const tenant = info.user_id;
  const active = isTenantPasswordProtected(tenant) && !isPasswordExemptPath(pathname);

  const [phase, setPhase] = useState<Phase>(() => {
    if (!active) return "unlocked";
    const stored = readStoredUnlock(tenant);
    if (!stored) return "locked";
    return verifiedThisSession.has(stored.token) ? "unlocked" : "checking";
  });

  const check = useCallback(async () => {
    const stored = readStoredUnlock(tenant);
    if (!stored) return setPhase("locked");
    if (verifiedThisSession.has(stored.token)) return setPhase("unlocked");
    setPhase("checking");
    const r = await verifyUnlockToken(tenant, stored.token);
    if (r.status === "ok") {
      verifiedThisSession.add(stored.token);
      setPhase("unlocked");
    } else if (r.status === "invalid") {
      clearUnlock(tenant);
      setPhase("locked");
    } else {
      setPhase("verifyUnavailable");
    }
  }, [tenant]);

  useEffect(() => {
    if (active && phase === "checking") void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || phase === "unlocked") return <>{children}</>;
  if (phase === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AgencyBrandSpinner hostname={info.hostname} size="lg" />
      </div>
    );
  }
  return (
    <PasswordScreen
      info={info}
      unavailableOnVerify={phase === "verifyUnavailable"}
      onRetryVerify={check}
      onUnlocked={(token, exp) => {
        saveUnlock(tenant, token, exp);
        verifiedThisSession.add(token);
        setPhase("unlocked");
      }}
    />
  );
}

function PasswordScreen({
  info,
  unavailableOnVerify,
  onRetryVerify,
  onUnlocked,
}: {
  info: AgencyDomainInfo;
  unavailableOnVerify: boolean;
  onRetryVerify: () => void;
  onUnlocked: (token: string, exp: number) => void;
}) {
  const name = agencyDisplayName(info);
  const logo = resolveAgencyLogoUrl(info);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    setUnavailable(false);
    const r = await unlockWithPassword(info.user_id, password);
    setLoading(false);
    if (r.status === "ok") return onUnlocked(r.token, r.exp);
    if (r.status === "invalid") setError("Senha incorreta. Tente novamente.");
    else setUnavailable(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm text-center">
        {logo ? (
          <img src={logo} alt={name} className="mx-auto h-20 max-w-[220px] object-contain" />
        ) : (
          <p className="text-xl font-semibold text-foreground">
            <BrandText>{name}</BrandText>
          </p>
        )}
        <div className="mx-auto mt-8 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-4 text-base font-medium text-foreground">Digite a senha para acessar este site</h1>

        {unavailableOnVerify ? (
          <div className="mt-6 space-y-3" role="alert">
            <p className="text-sm text-muted-foreground">
              Não foi possível confirmar seu acesso agora. Verifique sua conexão e tente novamente.
            </p>
            <Button onClick={onRetryVerify} className="w-full">Tentar novamente</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3 text-left">
            <Label htmlFor="site-password">Senha</Label>
            <div className="relative">
              <Input
                id="site-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "site-password-error" : undefined}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p id="site-password-error" className="text-xs text-destructive" role="alert">{error}</p>
            )}
            {unavailable && (
              <p className="text-xs text-muted-foreground" role="alert">
                Não foi possível validar a senha agora. Tente novamente em instantes.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : unavailable ? "Tentar novamente" : "Entrar"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
