import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { TeamSessionProvider } from "@/contexts/TeamSessionContext";
import { TeamRouteGuard } from "@/components/team/TeamRouteGuard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProtectedShell } from "@/components/auth/ProtectedShell";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { LaunchOverlay } from "./components/launch/LaunchOverlay";
import { ImpersonationBanner } from "./components/admin/ImpersonationBanner";
import { WhatsAppSupportButton } from "./components/layout/WhatsAppSupportButton";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/auth/LoadingScreen";
import { NewLeadAlertProvider } from "./components/leads/NewLeadAlertProvider";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { WorkspaceGate } from "@/workspace/WorkspaceGate";
import { AppUpdateModal } from "./components/common/AppUpdateModal";

// ── Lazy-loaded pages ──────────────────────────────────────
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OrlandoMagicLandingPage = lazy(() => import("./pages/OrlandoMagicLandingPage"));
const ComandatubaLandingPage = lazy(() => import("./pages/ComandatubaLandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StartDashboard = lazy(() => import("./pages/StartDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const FerramentasIA = lazy(() => import("./pages/FerramentasIA"));
const GerarOrcamento = lazy(() => import("./pages/GerarOrcamento"));
const CriarRoteiro = lazy(() => import("./pages/CriarRoteiro"));
const ModelosRoteiros = lazy(() => import("./pages/ModelosRoteiros"));
const CriarConteudo = lazy(() => import("./pages/CriarConteudo"));
const RoteiroPublico = lazy(() => import("./pages/RoteiroPublico"));
const TripWallet = lazy(() => import("./pages/TripWallet"));
const ViagemPublica = lazy(() => import("./pages/ViagemPublica"));
const CarteiraPublica = lazy(() => import("./pages/CarteiraPublica"));
const ShortCodeRedirect = lazy(() => import("./pages/ShortCodeRedirect"));
const CarteiraPublicaV2 = lazy(() => import("./pages/CarteiraPublicaV2"));
const PublicCodeResolver = lazy(() => import("./components/routing/PublicCodeResolver"));
const MapaTurismo = lazy(() => import("./pages/MapaTurismo"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail"));
const OperadoraDetail = lazy(() => import("./pages/OperadoraDetail"));
const CruisesPage = lazy(() => import("./pages/CruisesPage"));
const CruiseDetailPage = lazy(() => import("./pages/CruiseDetailPage"));
const Noticias = lazy(() => import("./pages/Noticias"));
const Perfil = lazy(() => import("./pages/Perfil"));
const MinhaConta = lazy(() => import("./pages/MinhaConta"));
const AssinaturasComerciais = lazy(() => import("./pages/AssinaturasComerciais"));
const ConfiguracoesCarteira = lazy(() => import("./pages/ConfiguracoesCarteira"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Materiais = lazy(() => import("./pages/Materiais"));
const MeusMateriais = lazy(() => import("./pages/MeusMateriais"));
const BloqueiosAereos = lazy(() => import("./pages/BloqueiosAereos"));
const Calculadora = lazy(() => import("./pages/Calculadora"));
const Agenda = lazy(() => import("./pages/Agenda"));
const BlocoNotas = lazy(() => import("./pages/BlocoNotas"));
const CRM = lazy(() => import("./pages/CRM"));
const Financeiro = lazy(() => import("./pages/Financeiro"));

const GestaoClientes = lazy(() => import("./pages/GestaoClientes"));
const EducaAcademy = lazy(() => import("./pages/EducaAcademy"));
const Community = lazy(() => import("./pages/Community"));
const Beneficios = lazy(() => import("./pages/Beneficios"));
const Mentorias = lazy(() => import("./pages/Mentorias"));
const MentoriaDetail = lazy(() => import("./pages/MentoriaDetail"));
const PlaybookViewer = lazy(() => import("./components/playbook/PlaybookViewer"));
const PerguntasRespostas = lazy(() => import("./pages/PerguntasRespostas"));
const DreamAdvisor = lazy(() => import("./pages/DreamAdvisor"));
const MinhaVitrine = lazy(() => import("./pages/MinhaVitrine"));
const MeuCartao = lazy(() => import("./pages/MeuCartao"));
const MeuCartaoEditor = lazy(() => import("./pages/MeuCartaoEditor"));
const CriarCartao = lazy(() => import("./pages/CriarCartao"));
const VitrinePublica = lazy(() => import("./pages/VitrinePublica"));
const CartaoPublico = lazy(() => import("./pages/CartaoPublico"));
const SlugResolver = lazy(() => import("./components/routing/SlugResolver"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OrcamentoPublico = lazy(() => import("./pages/OrcamentoPublico"));
const CertificateTest = lazy(() => import("./pages/CertificateTest"));
const Gamificacao = lazy(() => import("./pages/Gamificacao"));
const Pesquisa = lazy(() => import("./pages/Pesquisa"));
const AtivarCartao = lazy(() => import("./pages/AtivarCartao"));
const PoliticasPrivacidade = lazy(() => import("./pages/PoliticasPrivacidade"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Atualizacoes = lazy(() => import("./pages/Atualizacoes"));
const PersonalizadorLaminas = lazy(() => import("./pages/PersonalizadorLaminas"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CadastroLink = lazy(() => import("./pages/CadastroLink"));
const LeadFormPublic = lazy(() => import("./pages/LeadFormPublic"));
const MeusLeads = lazy(() => import("./pages/MeusLeads"));
const CaptacaoLeads = lazy(() => import("./pages/CaptacaoLeads"));
const SalesLandings = lazy(() => import("./pages/SalesLandings"));
const SalesLandingEditor = lazy(() => import("./pages/SalesLandingEditor"));
const SalesLandingPublic = lazy(() => import("./pages/SalesLandingPublic"));
const Suporte = lazy(() => import("./pages/Suporte"));
const TradeConnectHub = lazy(() => import("./pages/TradeConnectHub"));
const TradeConnectProfile = lazy(() => import("./pages/TradeConnectProfile"));
const TradeConnectCommunities = lazy(() => import("./pages/TradeConnectCommunities"));
const AgentProfile = lazy(() => import("./pages/AgentProfile"));
const CursosMarketplace = lazy(() => import("./pages/CursosMarketplace"));
const CursoDetalhe = lazy(() => import("./pages/CursoDetalhe"));
const CursoEditar = lazy(() => import("./pages/CursoEditar"));
const Planos = lazy(() => import("./pages/Planos"));
const Desconto30Off = lazy(() => import("./pages/Desconto30Off"));
const HotelRaioX = lazy(() => import("./pages/HotelRaioX"));
const CampanhaIndicacao = lazy(() => import("./pages/CampanhaIndicacao"));
const MeusProjetos = lazy(() => import("./pages/MeusProjetos"));
const Sorteador = lazy(() => import("./pages/Sorteador"));
const CardCaptureQuickAccess = lazy(() => import("./pages/CardCaptureQuickAccess"));
const CadastroFornecedor = lazy(() => import("./pages/CadastroFornecedor"));
const CadastroGuia = lazy(() => import("./pages/CadastroGuia"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const SupplierProfileEdit = lazy(() => import("./pages/SupplierProfileEdit"));
const RequisitosViagem = lazy(() => import("./pages/RequisitosViagem"));
const Blog = lazy(() => import("./pages/Blog"));
const DashboardFornecedor = lazy(() => import("./pages/DashboardFornecedor"));
const AgendaTrade = lazy(() => import("./pages/AgendaTrade"));
const FaturaPublica = lazy(() => import("./pages/FaturaPublica"));
// ── Fallback spinner ───────────────────────────────────────
function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LaunchOverlay />
      <Toaster />
      <Sonner />
      <AppUpdateModal />
        <ErrorBoundary>
        <AuthProvider>
          <TeamSessionProvider>
          <SubscriptionProvider>
          <WorkspaceGate>
          <ImpersonationBanner />
          <NewLeadAlertProvider>
          <Suspense fallback={<LoadingScreen />}>
          <TeamRouteGuard />
          <Routes>

            <Route path="/auth" element={
              window.location.hostname.startsWith("ativar-cartao") ? (
                <AtivarCartao />
              ) : (
                <Auth />
              )
            } />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route
              path="/"
              element={
                window.location.hostname.startsWith("ativar-cartao") ? (
                  <AtivarCartao />
                ) : window.location.hostname.startsWith("lp.") ? (
                  <SalesLandingPublic />
                ) : (
                  <LandingPage />
                )
              }
            />
            <Route path="/planos" element={<Planos />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/experiencias/orlando-magic/demo" element={<OrlandoMagicLandingPage />} />
            <Route path="/experiencias/transamerica-comandatuba/demo" element={<ComandatubaLandingPage />} />
            <Route path="/desconto30off" element={<Desconto30Off />} />
            <Route path="/cadastro-fornecedor" element={<CadastroFornecedor />} />
            <Route path="/cadastro-guia" element={<CadastroGuia />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/crm" element={<AdminRoute><AdminCRM /></AdminRoute>} />
            <Route path="/roteiro/:token" element={<RoteiroPublico />} />
            <Route path="/viagem/:token" element={<ViagemPublica />} />
            <Route path="/c/:slug" element={<CarteiraPublica />} />
            <Route path="/v/:code" element={<ShortCodeRedirect />} />
            
            {/* Redirects from old routes */}
            <Route path="/trade-connect" element={<Navigate to="/comunidade" replace />} />
            <Route path="/trade-connect/perfil" element={<Navigate to="/comunidade/perfil" replace />} />
            <Route path="/trade-connect/comunidades" element={<Navigate to="/comunidade/comunidades" replace />} />
            <Route path="/politicasdeprivacidade" element={<PoliticasPrivacidade />} />
            <Route path="/termosdeuso" element={<TermosDeUso />} />
            <Route path="/pesquisa/:slug" element={<Pesquisa />} />
            <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
            <Route path="/fatura/:agencySlug/:code" element={<FaturaPublica />} />
            <Route path="/cadastro/:token" element={<CadastroLink />} />
            <Route path="/formulario/:token" element={<LeadFormPublic />} />
            <Route path="/lp/:slug" element={<SalesLandingPublic />} />
            <Route path="/ativar-cartao" element={<AtivarCartao />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/criar-cartao" element={<CriarCartao />} />
            <Route path="/captura-cartao/:token" element={<CardCaptureQuickAccess />} />
            <Route path="/certificate-test" element={<CertificateTest />} />
            <Route path="/:slug/ofertas" element={<VitrinePublica />} />
            <Route path="/:agencySlug/:accessCode" element={<PublicCodeResolver />} />
            <Route
              path="/:slug"
              element={
                window.location.hostname.startsWith("lp.") ? (
                  <SalesLandingPublic />
                ) : (
                  <SlugResolver />
                )
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route element={<ProtectedShell />}>
              <Route path="/meu-perfil-empresa" element={<DashboardLayout><SupplierProfileEdit /></DashboardLayout>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-start" element={<StartDashboard />} />
              <Route path="/dashboard-fornecedor" element={<DashboardFornecedor />} />
              <Route path="/agenda-trade" element={<AgendaTrade />} />
              <Route path="/ferramentas-ia" element={<FerramentasIA />} />
              <Route path="/meus-projetos" element={<MeusProjetos />} />
              <Route path="/sorteador" element={<Sorteador />} />
              <Route path="/ferramentas-ia/criar-roteiro" element={<CriarRoteiro />} />
              <Route path="/ferramentas-ia/criar-roteiro/:id" element={<CriarRoteiro />} />
              <Route path="/ferramentas-ia/modelos-roteiros" element={<ModelosRoteiros />} />
              <Route path="/ferramentas-ia/criar-conteudo" element={<CriarConteudo />} />
              <Route path="/ferramentas-ia/gerar-orcamento" element={<GerarOrcamento />} />
              <Route path="/ferramentas-ia/gerar-orcamento/:id" element={<GerarOrcamento />} />
              <Route path="/ferramentas-ia/trip-wallet" element={<TripWallet />} />
              <Route path="/ferramentas-ia/trip-wallet/:id" element={<TripWallet />} />
              <Route path="/mapa-turismo" element={<MapaTurismo />} />
              <Route path="/mapa-turismo/cruzeiros" element={<CruisesPage />} />
              <Route path="/mapa-turismo/cruzeiros/:id" element={<CruiseDetailPage />} />
              <Route path="/mapa-turismo/operadora/:id" element={<OperadoraDetail />} />
              <Route path="/mapa-turismo/guia/:id" element={<GuideDetail />} />
              <Route path="/mapa-turismo/:id" element={<SupplierDetail />} />
              <Route path="/noticias" element={<Noticias />} />
              <Route path="/materiais" element={<Materiais />} />
              <Route path="/meus-materiais" element={<MeusMateriais />} />
              <Route path="/bloqueios-aereos" element={<BloqueiosAereos />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/bloco-notas" element={<BlocoNotas />} />
              <Route path="/calculadora" element={<Calculadora />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              <Route path="/assinaturas-comerciais" element={<AssinaturasComerciais />} />
              <Route path="/configuracoes/carteira" element={<ConfiguracoesCarteira />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/hotel-raio-x" element={<HotelRaioX />} />
              <Route path="/requisitos-viagem" element={<RequisitosViagem />} />
              <Route path="/campanha-indicacao" element={<CampanhaIndicacao />} />
              <Route path="/gestao-clientes" element={<GestaoClientes />} />
              <Route path="/gestao-clientes/dashboard" element={<GestaoClientes />} />
              <Route path="/gestao-clientes/clientes" element={<GestaoClientes />} />
              <Route path="/gestao-clientes/funil" element={<GestaoClientes />} />
              <Route path="/gestao-clientes/metas" element={<GestaoClientes />} />
              <Route path="/gestao-clientes/operacoes" element={<GestaoClientes />} />
              <Route path="/educa-academy" element={<EducaAcademy />} />
              <Route path="/comunidade" element={<TradeConnectHub />} />
              <Route path="/comunidade/chat" element={<Community />} />
              <Route path="/comunidade/perfil" element={<TradeConnectProfile />} />
              <Route path="/comunidade/comunidades" element={<TradeConnectCommunities />} />
              <Route path="/comunidade/agente/:userId" element={<AgentProfile />} />
              <Route path="/trade-connect/agente/:userId" element={<AgentProfile />} />
              <Route path="/beneficios" element={<Beneficios />} />
              <Route path="/mentorias" element={<Mentorias />} />
              <Route path="/mentorias/:id" element={<MentoriaDetail />} />
              <Route path="/cursos" element={<CursosMarketplace />} />
              <Route path="/cursos/:id" element={<CursoDetalhe />} />
              <Route path="/cursos/:id/editar" element={<CursoEditar />} />
              <Route path="/playbook/:slug" element={<PlaybookViewer />} />
              <Route path="/perguntas-respostas" element={<PerguntasRespostas />} />
              <Route path="/dream-advisor" element={<DreamAdvisor />} />
              <Route path="/minha-vitrine" element={<MinhaVitrine />} />
              <Route path="/meu-cartao" element={<MeuCartao />} />
              <Route path="/meu-cartao/:id" element={<MeuCartaoEditor />} />
              <Route path="/gamificacao" element={<Gamificacao />} />
              <Route path="/personalizador-laminas" element={<PersonalizadorLaminas />} />
              <Route path="/atualizacoes" element={<Atualizacoes />} />
              <Route path="/meus-leads" element={<CaptacaoLeads />} />
              <Route path="/meus-leads/conversacional" element={<MeusLeads />} />
              <Route path="/meus-leads/landings" element={<SalesLandings />} />
              <Route path="/meus-leads/landings/nova" element={<SalesLandingEditor />} />
              <Route path="/meus-leads/landings/:id/editar" element={<SalesLandingEditor />} />
              <Route path="/suporte" element={<Suporte />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          
</Routes>
          </Suspense>
          <WhatsAppSupportButton />
          </NewLeadAlertProvider>
          </WorkspaceGate>
          </SubscriptionProvider>
          </TeamSessionProvider>
        </AuthProvider>
        </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
