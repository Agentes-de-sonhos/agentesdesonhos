/**
 * Chrome compartilhada do SiteLab Base (gate de senha, barra superior,
 * identidade/paleta e conversão do tenant técnico).
 *
 * Extraída sem mudar aparência para que a GESTÃO possa ser montada FORA do
 * router do App (igual aos domínios das agências, que decidem o painel antes
 * do BrowserRouter) enquanto Site e Área do Cliente continuam dentro dele.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { useAgencyBrandTheme } from "@/lib/useAgencyBrandTheme";
import {
  SITELAB_BASE,
  SITELAB_DEMO_USER_ID,
  SITELAB_VIEWS,
  sitelabModelFromRecord,
  sitelabPath,
  type SiteLabModel,
  type SiteLabView,
} from "@/lib/sitelabModels";
import {
  grantSitelabAccess,
  lockoutMsForAttempts,
  verifySitelabPassword,
} from "@/lib/sitelabAccess";
import sitelabLogo from "@/assets/sitelab/sitelab-base-logo.png.asset.json";

/** noindex/nofollow em todas as áreas do laboratório. */
export function useNoIndex(title: string) {
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

/**
 * Modelo do laboratório (configuração pública + logo/paleta aplicados).
 * A paleta é sempre aplicada via tokens dinâmicos, sem cor hardcoded de tenant.
 */
export function useSiteLabModel(): SiteLabModel {
  const { data } = useQuery({
    queryKey: ["sitelab-template", SITELAB_BASE.slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sitelab_template" as never, {
        p_slug: SITELAB_BASE.slug,
      } as never);
      if (error) return null;
      return data ?? null;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const model = useMemo<SiteLabModel>(() => {
    const base = sitelabModelFromRecord(SITELAB_BASE, data);
    return { ...base, logoUrl: base.logoUrl ?? sitelabLogo.url };
  }, [data]);

  useAgencyBrandTheme({
    primary: model.palette.primary,
    secondary: model.palette.secondary,
    secondaryAuto: false,
    tertiary: model.palette.tertiary,
    tertiaryAuto: false,
  });

  return model;
}

/** Tenant técnico do laboratório convertido para o contrato compartilhado. */
export function sitelabTenantInfo(
  model: SiteLabModel,
  tenant: AgencyDomainInfo | null,
): AgencyDomainInfo {
  return {
    ...(tenant ?? {
      user_id: SITELAB_DEMO_USER_ID,
      cover_image_url: null,
      phone: null,
      city: null,
      state: null,
      bio: null,
      cnpj: null,
      is_primary: true,
    }),
    agency_slug: model.slug,
    hostname: model.adminHostname,
    is_primary: true,
    agency_name: model.name,
    owner_name: model.name,
    logo_url: model.logoUrl,
    primary_color: model.palette.primary,
    secondary_color: model.palette.secondary,
    secondary_auto: false,
    tertiary_color: model.palette.tertiary,
    tertiary_auto: false,
    public_slug: model.slug,
  } as AgencyDomainInfo;
}

export function SiteLabTopBar({
  model,
  view,
  onExit,
  /** Fora do router do App (gestão) os links precisam ser navegação real. */
  useAnchors = false,
}: {
  model: SiteLabModel;
  view: SiteLabView;
  onExit: () => void;
  useAnchors?: boolean;
}) {
  /* O asset pode falhar em ambientes de preview: cai para o nome, sem marca terceira. */
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {model.logoUrl && logoOk ? (
            <img
              src={model.logoUrl}
              alt={model.name}
              className="h-7 w-auto object-contain"
              onError={() => setLogoOk(false)}
            />
          ) : null}
          <span className="truncate text-sm font-semibold">{model.name}</span>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          {SITELAB_VIEWS.map((entry) => {
            const to = sitelabPath(model.slug, entry.view);
            return (
              <Button
                key={entry.view}
                asChild
                size="sm"
                variant={entry.view === view ? "default" : "ghost"}
              >
                {useAnchors ? <a href={to}>{entry.label}</a> : <Link to={to}>{entry.label}</Link>}
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" onClick={onExit} title="Sair do ambiente">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair do ambiente</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}

export function PasswordGate({
  model,
  onGranted,
}: {
  model: SiteLabModel;
  onGranted: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempts = useRef(0);
  const lockedUntil = useRef(0);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const now = Date.now();
      if (now < lockedUntil.current) {
        setError("Aguarde alguns instantes antes de tentar novamente.");
        return;
      }
      setLoading(true);
      setError(null);
      const { ok } = await verifySitelabPassword(model.slug, password);
      setLoading(false);
      setPassword("");
      if (ok) {
        attempts.current = 0;
        grantSitelabAccess(model.slug);
        onGranted();
        return;
      }
      attempts.current += 1;
      const wait = lockoutMsForAttempts(attempts.current);
      lockedUntil.current = Date.now() + wait;
      setError("Não foi possível liberar o acesso. Verifique a senha e tente novamente.");
    },
    [model.slug, onGranted, password],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-tertiary)] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-tertiary)] text-[var(--brand-primary)]">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-semibold">{model.name}</h1>
          <p className="text-sm text-muted-foreground">
            Ambiente privado. Informe a senha de acesso.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sitelab-password">Senha</Label>
          <Input
            id="sitelab-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading || !password}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Entrar
        </Button>
      </form>
    </div>
  );
}

export const SiteLabFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
  </div>
);
