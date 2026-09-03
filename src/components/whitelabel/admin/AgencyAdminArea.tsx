import { ComponentType, lazy } from "react";
import { BrowserRouter, Navigate, useParams, useRoutes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TeamSessionProvider } from "@/contexts/TeamSessionContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CriticalErrorState } from "@/components/common/CriticalErrorState";
import { AgencyAdminShell } from "./AgencyAdminShell";
import { AgencyAdminLayout } from "./AgencyAdminLayout";
import AgencyAdminLogin from "@/pages/whitelabel/admin/AgencyAdminLogin";
import {
  AGENCY_ADMIN_HOME,
  AGENCY_ADMIN_LOGIN,
  agencyAdminMount,
  type AgencyAdminPortalInfo,
} from "@/lib/agencyAdmin";
import { AgencyAdminNavProvider } from "@/lib/agencyAdminNav";
import { WorkspaceProvider } from "@/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/workspace/WorkspaceShell";
import { titleForPath } from "@/workspace/routeTitle";

/**
 * Páginas administrativas reutilizadas da plataforma. Comunidade, Academy,
 * Notícias e Gamificação ficam de fora por definição do escopo (Etapa 1).
 */
const AgencyAdminHome = lazy(() => import("@/pages/whitelabel/admin/AgencyAdminHome"));
const MeusProjetos = lazy(() => import("@/pages/MeusProjetos"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const GestaoClientes = lazy(() => import("@/pages/GestaoClientes"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const GerarOrcamento = lazy(() => import("@/pages/GerarOrcamento"));
const TripWallet = lazy(() => import("@/pages/TripWallet"));
const CriarRoteiro = lazy(() => import("@/pages/CriarRoteiro"));
const ModelosRoteiros = lazy(() => import("@/pages/ModelosRoteiros"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const MinhaConta = lazy(() => import("@/pages/MinhaConta"));
const Suporte = lazy(() => import("@/pages/Suporte"));
const AgencyReservas = lazy(() => import("@/pages/whitelabel/admin/AgencyReservas"));
const ProcessoReserva = lazy(() => import("@/pages/ProcessoReserva"));
const AgencyAdminNotFound = lazy(() => import("@/pages/whitelabel/admin/AgencyAdminNotFound"));

/** Alias legado /reservas/:id → rota administrativa equivalente. */
function LegacyReservaRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/gestao/reservas/${id}` : "/gestao/reservas"} replace />;
}

function e(Page: ComponentType) {
  return (
    <ErrorBoundary
      fallback={
        <CriticalErrorState
          description="Esta área não carregou corretamente. Você pode tentar novamente sem perder o restante do painel."
          retryLabel="Atualizar área"
          onRetry={() => window.location.reload()}
        />
      }
    >
      <Page />
    </ErrorBoundary>
  );
}

/**
 * Rotas internas do painel. Cada caminho /gestao/* tem um alias absoluto
 * equivalente para que links internos das páginas existentes (que apontam
 * para caminhos como /meus-projetos ou /perfil) continuem funcionando no
 * MESMO domínio e dentro do mesmo guard — nunca indo parar no app da
 * plataforma.
 *
 * Cada aba do workspace monta esta árvore no seu próprio router de memória,
 * exatamente como a plataforma principal faz com o DashboardLayout.
 */
function AgencyAdminPages({ info }: { info: AgencyAdminPortalInfo }) {
  const pagePairs: Array<[string, ComponentType]> = [
    ["meus-projetos", MeusProjetos],
    ["agenda", Agenda],
    ["crm/funil", GestaoClientes],
    ["crm/operacoes", GestaoClientes],
    ["crm/clientes", GestaoClientes],
    ["crm/agenda", GestaoClientes],
    ["crm/documentos", GestaoClientes],
    ["reservas", AgencyReservas],
    ["reservas/:id", ProcessoReserva],
    ["financeiro", Financeiro],
    ["criar/orcamento", GerarOrcamento],
    ["criar/orcamento/:id", GerarOrcamento],
    ["criar/carteira", TripWallet],
    ["criar/carteira/:id", TripWallet],
    ["criar/roteiro", CriarRoteiro],
    ["criar/roteiro/:id", CriarRoteiro],
    ["criar/modelos-roteiros", ModelosRoteiros],
    ["perfil", Perfil],
    ["minha-conta", MinhaConta],
    ["suporte", Suporte],
  ];

  const aliasPairs: Array<[string, ComponentType]> = [
    ["/meus-projetos", MeusProjetos],
    ["/agenda", Agenda],
    ["/gestao-clientes", GestaoClientes],
    ["/financeiro", Financeiro],
    ["/perfil", Perfil],
    ["/minha-conta", MinhaConta],
    ["/suporte", Suporte],
    ["/ferramentas-ia/gerar-orcamento", GerarOrcamento],
    ["/ferramentas-ia/gerar-orcamento/:id", GerarOrcamento],
    ["/ferramentas-ia/trip-wallet", TripWallet],
    ["/ferramentas-ia/trip-wallet/:id", TripWallet],
    ["/ferramentas-ia/criar-roteiro", CriarRoteiro],
    ["/ferramentas-ia/criar-roteiro/:id", CriarRoteiro],
    ["/ferramentas-ia/modelos-roteiros", ModelosRoteiros],
    ["/reservas", AgencyReservas],
  ];

  const home = <AgencyAdminHome info={info} />;

  const routes = useRoutes([
    { path: AGENCY_ADMIN_HOME, element: home },
    { path: "/dashboard", element: home },
    ...pagePairs.map(([sub, Page]) => ({ path: `/gestao/${sub}`, element: e(Page) })),
    ...aliasPairs.map(([path, Page]) => ({ path, element: e(Page) })),
    // Alias legado com id: direciona para a rota administrativa segura.
    { path: "/reservas/:id", element: <LegacyReservaRedirect /> },
    // Rotas administrativas desconhecidas: 404 white label (sem redirect
    // silencioso), ainda dentro do shell e do guard de domínio/usuário.
    { path: "*", element: e(AgencyAdminNotFound) },
  ]);

  return <AgencyAdminLayout info={info}>{routes}</AgencyAdminLayout>;
}

/** Caminho inicial da primeira janela, a partir da URL real do navegador. */
function initialWorkspacePath(): string {
  const path = `${window.location.pathname}${window.location.search}`;
  const clean = window.location.pathname.replace(/\/+$/, "") || "/";
  if (clean === AGENCY_ADMIN_HOME || clean === "/" || clean === "/dashboard") {
    return AGENCY_ADMIN_HOME;
  }
  return path;
}

/**
 * Ambiente autenticado do painel: reutiliza integralmente o workspace de abas
 * internas da plataforma principal (WorkspaceProvider + WorkspaceShell), com
 * a barra de abas renderizada pelo layout da agência.
 */
function AgencyAdminWorkspace({
  info,
  entryPath,
}: {
  info: AgencyAdminPortalInfo;
  entryPath?: string;
}) {
  const initialPath = entryPath ?? initialWorkspacePath();
  return (
    <WorkspaceProvider
      initialPath={initialPath}
      initialTitle={titleForPath(initialPath)}
      homePath={AGENCY_ADMIN_HOME}
    >
      <WorkspaceShell showTabBar={false}>
        <AgencyAdminPages info={info} />
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}

/**
 * Entrada do painel decidida pela URL real, SEM router externo: a área
 * autenticada usa o workspace de abas (cada aba tem o seu próprio router de
 * memória) e o React Router não permite routers aninhados. O login, que é uma
 * página isolada, monta o seu próprio BrowserRouter.
 */
function AgencyAdminEntry({
  hostname,
  basePath,
  identity,
}: {
  hostname: string;
  basePath?: string;
  identity?: Partial<AgencyAdminPortalInfo>;
}) {
  const mount = agencyAdminMount(basePath);
  const real = window.location.pathname.replace(/\/+$/, "") || "/";
  const clean = mount.toInternal(real);
  const entryPath = mount.base
    ? `${clean}${window.location.search}`
    : undefined;
  if (clean === AGENCY_ADMIN_LOGIN) {
    return (
      <BrowserRouter>
        <AgencyAdminLogin hostname={hostname} basePath={mount.base} />
      </BrowserRouter>
    );
  }
  return (
    <AgencyAdminShell hostname={hostname} basePath={mount.base}>
      {(info) => (
        <AgencyAdminWorkspace
          info={identity ? { ...info, ...identity } : info}
          entryPath={entryPath}
        />
      )}
    </AgencyAdminShell>
  );
}

/**
 * Ponto de entrada do painel: monta os providers necessários (Auth, Equipe e
 * Assinatura) que no app da plataforma vivem acima do AgencyDomainGate — por
 * isso precisam existir aqui para as páginas reutilizadas funcionarem no
 * domínio da agência.
 */
export default function AgencyAdminArea({
  hostname,
  /**
   * Prefixo de URL sob o qual o painel está montado (ex.: `/sitelab-base`).
   * Sem ele o comportamento é exatamente o atual dos domínios das agências.
   *
   * REGRA: o Site Lab é consumidor mestre deste MESMO painel — não existe
   * cópia paralela, nem etapa de "promover" para as agências.
   */
  basePath,
  /**
   * Sobreposição APENAS de identidade (nome, logo e paleta) — usada pelo Site
   * Lab, cujo tenant técnico não tem perfil. Dados e permissões continuam
   * vindo do servidor.
   */
  identity,
}: {
  hostname: string;
  basePath?: string;
  identity?: Partial<AgencyAdminPortalInfo>;
}) {
  return (
    <AuthProvider>
      <TeamSessionProvider>
        <SubscriptionProvider>
          {/* Navegação contextual: páginas reutilizadas geram caminhos /gestao/*. */}
          <AgencyAdminNavProvider>
            <AgencyAdminEntry
              hostname={hostname}
              basePath={basePath}
              identity={identity}
            />
          </AgencyAdminNavProvider>
        </SubscriptionProvider>
      </TeamSessionProvider>
    </AuthProvider>
  );
}
