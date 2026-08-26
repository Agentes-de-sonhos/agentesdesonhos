import { ComponentType, lazy } from "react";
import { Navigate, useOutletContext, useParams, useRoutes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TeamSessionProvider } from "@/contexts/TeamSessionContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CriticalErrorState } from "@/components/common/CriticalErrorState";
import { AgencyAdminShell } from "./AgencyAdminShell";
import AgencyAdminLogin from "@/pages/whitelabel/admin/AgencyAdminLogin";
import type { AgencyAdminPortalInfo } from "@/lib/agencyAdmin";
import { AgencyAdminNavProvider } from "@/lib/agencyAdminNav";

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

/**
 * Home exclusiva do painel: recebe a agência resolvida pelo shell via
 * contexto do Outlet, sem refazer a consulta de domínio.
 */
function AdminHomeRoute() {
  const { info } = useOutletContext<{ info: AgencyAdminPortalInfo }>();
  return <AgencyAdminHome info={info} />;
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
 * Rotas do painel white label. Cada caminho /gestao/* tem um alias absoluto
 * equivalente para que links internos das páginas existentes (que apontam
 * para caminhos como /meus-projetos ou /perfil) continuem funcionando no
 * MESMO domínio e dentro do mesmo guard — nunca indo parar no app da
 * plataforma.
 */
function AgencyAdminRouter({ hostname }: { hostname: string }) {
  const pagePairs: Array<[string, ComponentType]> = [
    ["", AdminHomeRoute],
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
    ["/dashboard", AdminHomeRoute],
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

  const routes = useRoutes([
    { path: "/gestao/login", element: <AgencyAdminLogin hostname={hostname} /> },
    {
      element: <AgencyAdminShell hostname={hostname} />,
      children: [
        ...pagePairs.map(([sub, Page]) => ({
          path: `/gestao${sub ? `/${sub}` : ""}`,
          element: e(Page),
        })),
        ...aliasPairs.map(([path, Page]) => ({ path, element: e(Page) })),
        // Alias legado com id: direciona para a rota administrativa segura.
        { path: "/reservas/:id", element: <LegacyReservaRedirect /> },
        // Rotas administrativas desconhecidas: 404 white label (sem redirect
        // silencioso), ainda dentro do shell e do guard de domínio/usuário.
        { path: "*", element: e(AgencyAdminNotFound) },
      ],
    },
  ]);

  return routes;
}

/**
 * Ponto de entrada do painel: monta os providers necessários (Auth, Equipe e
 * Assinatura) que no app da plataforma vivem acima do AgencyDomainGate — por
 * isso precisam existir aqui para as páginas reutilizadas funcionarem no
 * domínio da agência.
 */
export default function AgencyAdminArea({ hostname }: { hostname: string }) {
  return (
    <AuthProvider>
      <TeamSessionProvider>
        <SubscriptionProvider>
          {/* Navegação contextual: páginas reutilizadas geram caminhos /gestao/*. */}
          <AgencyAdminNavProvider>
            <AgencyAdminRouter hostname={hostname} />
          </AgencyAdminNavProvider>
        </SubscriptionProvider>
      </TeamSessionProvider>
    </AuthProvider>
  );
}
