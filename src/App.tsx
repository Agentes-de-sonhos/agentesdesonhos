import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { LaunchOverlay } from "./components/launch/LaunchOverlay";
import { ImpersonationBanner } from "./components/admin/ImpersonationBanner";
import { WhatsAppSupportButton } from "./components/layout/WhatsAppSupportButton";
import { Loader2 } from "lucide-react";

// ── Lazy-loaded pages ──────────────────────────────────────
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StartDashboard = lazy(() => import("./pages/StartDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const FerramentasIA = lazy(() => import("./pages/FerramentasIA"));
const GerarOrcamento = lazy(() => import("./pages/GerarOrcamento"));
const CriarRoteiro = lazy(() => import("./pages/CriarRoteiro"));
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
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const Materiais = lazy(() => import("./pages/Materiais"));
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
const CardCaptureQuickAccess = lazy(() => import("./pages/CardCaptureQuickAccess"));
const CadastroFornecedor = lazy(() => import("./pages/CadastroFornecedor"));
const CadastroGuia = lazy(() => import("./pages/CadastroGuia"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const SupplierProfileEdit = lazy(() => import("./pages/SupplierProfileEdit"));
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
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationBanner />
          <SubscriptionProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/auth" element={
              window.location.hostname.startsWith("ativar-cartao") ? (
                <AtivarCartao />
              ) : (
                <Auth />
              )
            } />
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
            <Route path="/desconto30off" element={<Desconto30Off />} />
            <Route path="/cadastro-fornecedor" element={<CadastroFornecedor />} />
            <Route path="/cadastro-guia" element={<CadastroGuia />} />
            <Route path="/meu-perfil-empresa" element={<ProtectedRoute><SupplierProfileEdit /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard-start" element={<ProtectedRoute><StartDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/crm" element={<AdminRoute><AdminCRM /></AdminRoute>} />
            <Route path="/ferramentas-ia" element={<ProtectedRoute><FerramentasIA /></ProtectedRoute>} />
            <Route path="/meus-projetos" element={<ProtectedRoute><MeusProjetos /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/criar-roteiro" element={<ProtectedRoute><CriarRoteiro /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/criar-roteiro/:id" element={<ProtectedRoute><CriarRoteiro /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/criar-conteudo" element={<ProtectedRoute><CriarConteudo /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/gerar-orcamento" element={<ProtectedRoute><GerarOrcamento /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/gerar-orcamento/:id" element={<ProtectedRoute><GerarOrcamento /></ProtectedRoute>} />
            <Route path="/roteiro/:token" element={<RoteiroPublico />} />
            <Route path="/ferramentas-ia/trip-wallet" element={<ProtectedRoute><TripWallet /></ProtectedRoute>} />
            <Route path="/ferramentas-ia/trip-wallet/:id" element={<ProtectedRoute><TripWallet /></ProtectedRoute>} />
            <Route path="/viagem/:token" element={<ViagemPublica />} />
            <Route path="/c/:slug" element={<CarteiraPublica />} />
            <Route path="/v/:code" element={<ShortCodeRedirect />} />
            <Route path="/mapa-turismo" element={<ProtectedRoute><MapaTurismo /></ProtectedRoute>} />
            <Route path="/mapa-turismo/cruzeiros" element={<ProtectedRoute><CruisesPage /></ProtectedRoute>} />
            <Route path="/mapa-turismo/cruzeiros/:id" element={<ProtectedRoute><CruiseDetailPage /></ProtectedRoute>} />
            <Route path="/mapa-turismo/operadora/:id" element={<ProtectedRoute><OperadoraDetail /></ProtectedRoute>} />
            <Route path="/mapa-turismo/guia/:id" element={<ProtectedRoute><GuideDetail /></ProtectedRoute>} />
            <Route path="/mapa-turismo/:id" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
            <Route path="/noticias" element={<ProtectedRoute><Noticias /></ProtectedRoute>} />
            <Route path="/materiais" element={<ProtectedRoute><Materiais /></ProtectedRoute>} />
            <Route path="/bloqueios-aereos" element={<ProtectedRoute><BloqueiosAereos /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/bloco-notas" element={<ProtectedRoute><BlocoNotas /></ProtectedRoute>} />
            <Route path="/calculadora" element={<ProtectedRoute><Calculadora /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            
            <Route path="/hotel-raio-x" element={<ProtectedRoute><HotelRaioX /></ProtectedRoute>} />
            <Route path="/campanha-indicacao" element={<ProtectedRoute><CampanhaIndicacao /></ProtectedRoute>} />
            <Route path="/gestao-clientes" element={<ProtectedRoute><GestaoClientes /></ProtectedRoute>} />
            <Route path="/gestao-clientes/clientes" element={<ProtectedRoute><GestaoClientes /></ProtectedRoute>} />
            <Route path="/gestao-clientes/funil" element={<ProtectedRoute><GestaoClientes /></ProtectedRoute>} />
            <Route path="/gestao-clientes/metas" element={<ProtectedRoute><GestaoClientes /></ProtectedRoute>} />
            <Route path="/educa-academy" element={<ProtectedRoute><EducaAcademy /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute><TradeConnectHub /></ProtectedRoute>} />
            <Route path="/comunidade/chat" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/comunidade/perfil" element={<ProtectedRoute><TradeConnectProfile /></ProtectedRoute>} />
            <Route path="/comunidade/comunidades" element={<ProtectedRoute><TradeConnectCommunities /></ProtectedRoute>} />
            <Route path="/comunidade/agente/:userId" element={<ProtectedRoute><AgentProfile /></ProtectedRoute>} />
            {/* Redirects from old routes */}
            <Route path="/trade-connect" element={<Navigate to="/comunidade" replace />} />
            <Route path="/trade-connect/perfil" element={<Navigate to="/comunidade/perfil" replace />} />
            <Route path="/trade-connect/comunidades" element={<Navigate to="/comunidade/comunidades" replace />} />
            <Route path="/trade-connect/agente/:userId" element={<ProtectedRoute><AgentProfile /></ProtectedRoute>} />
            <Route path="/beneficios" element={<ProtectedRoute><Beneficios /></ProtectedRoute>} />
            <Route path="/mentorias" element={<ProtectedRoute><Mentorias /></ProtectedRoute>} />
            <Route path="/mentorias/:id" element={<ProtectedRoute><MentoriaDetail /></ProtectedRoute>} />
            <Route path="/cursos" element={<ProtectedRoute><CursosMarketplace /></ProtectedRoute>} />
            <Route path="/cursos/:id" element={<ProtectedRoute><CursoDetalhe /></ProtectedRoute>} />
            <Route path="/cursos/:id/editar" element={<ProtectedRoute><CursoEditar /></ProtectedRoute>} />
            <Route path="/playbook/:slug" element={<ProtectedRoute><PlaybookViewer /></ProtectedRoute>} />
            <Route path="/perguntas-respostas" element={<ProtectedRoute><PerguntasRespostas /></ProtectedRoute>} />
            <Route path="/dream-advisor" element={<ProtectedRoute><DreamAdvisor /></ProtectedRoute>} />
            <Route path="/minha-vitrine" element={<ProtectedRoute><MinhaVitrine /></ProtectedRoute>} />
            <Route path="/meu-cartao" element={<ProtectedRoute><MeuCartao /></ProtectedRoute>} />
            <Route path="/meu-cartao/:id" element={<ProtectedRoute><MeuCartaoEditor /></ProtectedRoute>} />
            <Route path="/gamificacao" element={<ProtectedRoute><Gamificacao /></ProtectedRoute>} />
            <Route path="/politicasdeprivacidade" element={<PoliticasPrivacidade />} />
            <Route path="/termosdeuso" element={<TermosDeUso />} />
            <Route path="/personalizador-laminas" element={<ProtectedRoute><PersonalizadorLaminas /></ProtectedRoute>} />
            <Route path="/atualizacoes" element={<ProtectedRoute><Atualizacoes /></ProtectedRoute>} />
            <Route path="/pesquisa/:slug" element={<Pesquisa />} />
            <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
            <Route path="/cadastro/:token" element={<CadastroLink />} />
            <Route path="/formulario/:token" element={<LeadFormPublic />} />
            <Route path="/meus-leads" element={<ProtectedRoute><MeusLeads /></ProtectedRoute>} />
            <Route path="/meus-leads/conversacional" element={<ProtectedRoute><MeusLeads /></ProtectedRoute>} />
            <Route path="/meus-leads/landings" element={<ProtectedRoute><SalesLandings /></ProtectedRoute>} />
            <Route path="/meus-leads/landings/nova" element={<ProtectedRoute><SalesLandingEditor /></ProtectedRoute>} />
            <Route path="/meus-leads/landings/:id/editar" element={<ProtectedRoute><SalesLandingEditor /></ProtectedRoute>} />
            <Route path="/lp/:slug" element={<SalesLandingPublic />} />
            <Route path="/ativar-cartao" element={<AtivarCartao />} />
            <Route path="/suporte" element={<ProtectedRoute><Suporte /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/criar-cartao" element={<CriarCartao />} />
            <Route path="/captura-cartao/:token" element={<CardCaptureQuickAccess />} />
            <Route path="/certificate-test" element={<CertificateTest />} />
            <Route path="/:slug/ofertas" element={<VitrinePublica />} />
            <Route path="/:agencySlug/:accessCode" element={<PublicCodeResolver />} />
            <Route path="/:slug" element={<SlugResolver />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <WhatsAppSupportButton />
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
