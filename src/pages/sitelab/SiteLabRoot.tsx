import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { fetchAgencyDomain, type AgencyDomainInfo } from "@/lib/agencyDomains";
import { useAgencyBrandTheme } from "@/lib/useAgencyBrandTheme";
import {
  SITELAB_BASE,
  SITELAB_BASE_PATH,
  SITELAB_DEMO_HOSTNAME,
  SITELAB_DEMO_USER_ID,
  SITELAB_VIEWS,
  sitelabModelFromRecord,
  sitelabPath,
  type SiteLabModel,
  type SiteLabView,
} from "@/lib/sitelabModels";
import {
  grantSitelabAccess,
  hasSitelabAccess,
  lockoutMsForAttempts,
  revokeSitelabAccess,
  verifySitelabPassword,
} from "@/lib/sitelabAccess";
import sitelabLogo from "@/assets/sitelab/sitelab-base-logo.png.asset.json";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
/* Áreas internas: as PRÓPRIAS páginas reais do white label, sem versão paralela. */
const AgencyClientArea = lazy(() => import("@/pages/whitelabel/AgencyClientArea"));
const AgencyAdminArea = lazy(() => import("@/components/whitelabel/admin/AgencyAdminArea"));

/** noindex/nofollow em todas as áreas do laboratório. */
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

/**
 * Identidade do template-base: apenas nome, logo e as 3 cores.
 *
 * REGRA DO SITE LAB: ele é o CONSUMIDOR MESTRE do mesmo template das agências
 * (AgencySiteHome/AgencySiteLayout, AgencyClientArea, AgencyAdminArea). Não é
 * staging, não gera cópias e não existe etapa de "promover para as agências":
 * uma melhoria no núcleo compartilhado chega no mesmo deploy aqui e em todos os
 * tenants. Só a identidade (nome, logo, paleta) varia.
 *
 * `tenant` é o registro real do tenant técnico do laboratório (isolado e
 * possivelmente vazio); quando indisponível, mantemos um contorno neutro.
 */
function demoInfo(model: SiteLabModel, tenant: AgencyDomainInfo | null): AgencyDomainInfo {
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

function SiteLabTopBar({
  model,
  view,
  onExit,
}: {
  model: SiteLabModel;
  view: SiteLabView;
  onExit: () => void;
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
          {SITELAB_VIEWS.map((entry) => (
            <Button
              key={entry.view}
              asChild
              size="sm"
              variant={entry.view === view ? "default" : "ghost"}
            >
              <Link to={sitelabPath(model.slug, entry.view)}>{entry.label}</Link>
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={onExit} title="Sair do ambiente">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair do ambiente</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}

function PasswordGate({
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

const Fallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
  </div>
);

export default function SiteLabRoot({ view = "site" }: { view?: SiteLabView }) {
  const location = useLocation();
  const [granted, setGranted] = useState(() => hasSitelabAccess(SITELAB_BASE.slug));

  // Configuração pública do modelo (sem qualquer campo de senha).
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
    // Logo provisório do laboratório (asset próprio, facilmente substituível).
    return { ...base, logoUrl: base.logoUrl ?? sitelabLogo.url };
  }, [data]);

  useNoIndex(`${model.name} — template base`);
  useAgencyBrandTheme({
    primary: model.palette.primary,
    secondary: model.palette.secondary,
    secondaryAuto: false,
    tertiary: model.palette.tertiary,
    tertiaryAuto: false,
  });

  // Tenant TÉCNICO do laboratório, resolvido no servidor pelo mesmo RPC das
  // agências. Nunca usa dados de uma agência real.
  const tenant = useQuery({
    queryKey: ["sitelab-tenant", model.adminHostname],
    queryFn: () => fetchAgencyDomain(model.adminHostname),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // A sessão vale para as três áreas por até 8 horas.
  useEffect(() => {
    setGranted(hasSitelabAccess(SITELAB_BASE.slug));
  }, [location.pathname]);

  const exit = useCallback(() => {
    revokeSitelabAccess(SITELAB_BASE.slug);
    setGranted(false);
  }, []);

  if (!granted) {
    return <PasswordGate model={model} onGranted={() => setGranted(true)} />;
  }

  const info = demoInfo(model, tenant.data ?? null);

  return (
    <div className="min-h-screen bg-white">
      <SiteLabTopBar model={model} view={view} onExit={exit} />
      <Suspense fallback={<Fallback />}>
        {view === "site" ? (
          <AgencySiteLayout info={info}>
            <AgencySiteHome info={info} />
          </AgencySiteLayout>
        ) : view === "clientArea" ? (
          /* Página real: login, sessão, navegação e dados são os do white label. */
          <AgencyClientArea info={info} basePath={`${SITELAB_BASE_PATH}/area-do-cliente`} />
        ) : (
          /* Painel real completo: mesmos providers, guard, menu, shell e páginas. */
          /* Painel real: tenant técnico do laboratório (nunca o hostname
             reservado da plataforma) e rotas sob o prefixo protegido. */
          <AgencyAdminArea hostname={model.adminHostname} basePath={SITELAB_BASE_PATH} />
        )}
      </Suspense>
    </div>
  );
}
