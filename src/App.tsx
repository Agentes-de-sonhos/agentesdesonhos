import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminCRM from "./pages/AdminCRM";
import FerramentasIA from "./pages/FerramentasIA";
import GerarOrcamento from "./pages/GerarOrcamento";
import CriarRoteiro from "./pages/CriarRoteiro";
import CriarConteudo from "./pages/CriarConteudo";
import RoteiroPublico from "./pages/RoteiroPublico";
import TripWallet from "./pages/TripWallet";
import ViagemPublica from "./pages/ViagemPublica";
import CarteiraPublica from "./pages/CarteiraPublica";
import ShortCodeRedirect from "./pages/ShortCodeRedirect";
import MapaTurismo from "./pages/MapaTurismo";
import SupplierDetail from "./pages/SupplierDetail";
import OperadoraDetail from "./pages/OperadoraDetail";
import Noticias from "./pages/Noticias";
import Perfil from "./pages/Perfil";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Materiais from "./pages/Materiais";
import BloqueiosAereos from "./pages/BloqueiosAereos";
import Calculadora from "./pages/Calculadora";
import Agenda from "./pages/Agenda";
import BlocoNotas from "./pages/BlocoNotas";
import CRM from "./pages/CRM";
import Financeiro from "./pages/Financeiro";
import GestaoClientes from "./pages/GestaoClientes";
import EducaAcademy from "./pages/EducaAcademy";
import Community from "./pages/Community";
import Beneficios from "./pages/Beneficios";
import Mentorias from "./pages/Mentorias";
import MentoriaDetail from "./pages/MentoriaDetail";
import PlaybookViewer from "./components/playbook/PlaybookViewer";
import PerguntasRespostas from "./pages/PerguntasRespostas";
import DreamAdvisor from "./pages/DreamAdvisor";
import MinhaVitrine from "./pages/MinhaVitrine";
import MeuCartao from "./pages/MeuCartao";
import CriarCartao from "./pages/CriarCartao";
import VitrinePublica from "./pages/VitrinePublica";
import CartaoPublico from "./pages/CartaoPublico";
import SlugResolver from "./components/routing/SlugResolver";
import NotFound from "./pages/NotFound";
import CertificateTest from "./pages/CertificateTest";
import Gamificacao from "./pages/Gamificacao";
import Pesquisa from "./pages/Pesquisa";
import AtivarCartao from "./pages/AtivarCartao";
import PoliticasPrivacidade from "./pages/PoliticasPrivacidade";
import TermosDeUso from "./pages/TermosDeUso";
import Atualizacoes from "./pages/Atualizacoes";
import CadastroLink from "./pages/CadastroLink";
import { LaunchOverlay } from "./components/launch/LaunchOverlay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LaunchOverlay />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
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
                ) : (
                  <LandingPage />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/crm"
              element={
                <AdminRoute>
                  <AdminCRM />
                </AdminRoute>
              }
            />
            <Route
              path="/ferramentas-ia"
              element={
                <ProtectedRoute>
                  <FerramentasIA />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/criar-roteiro"
              element={
                <ProtectedRoute>
                  <CriarRoteiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/criar-roteiro/:id"
              element={
                <ProtectedRoute>
                  <CriarRoteiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/criar-conteudo"
              element={
                <ProtectedRoute>
                  <CriarConteudo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/gerar-orcamento"
              element={
                <ProtectedRoute>
                  <GerarOrcamento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/gerar-orcamento/:id"
              element={
                <ProtectedRoute>
                  <GerarOrcamento />
                </ProtectedRoute>
              }
            />
            <Route path="/roteiro/:token" element={<RoteiroPublico />} />
            <Route
              path="/ferramentas-ia/trip-wallet"
              element={
                <ProtectedRoute>
                  <TripWallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ferramentas-ia/trip-wallet/:id"
              element={
                <ProtectedRoute>
                  <TripWallet />
                </ProtectedRoute>
              }
            />
            <Route path="/viagem/:token" element={<ViagemPublica />} />
            <Route path="/c/:slug" element={<CarteiraPublica />} />
            <Route path="/v/:code" element={<ShortCodeRedirect />} />
            <Route
              path="/mapa-turismo"
              element={
                <ProtectedRoute>
                  <MapaTurismo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mapa-turismo/operadora/:id"
              element={
                <ProtectedRoute>
                  <OperadoraDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mapa-turismo/:id"
              element={
                <ProtectedRoute>
                  <SupplierDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/noticias"
              element={
                <ProtectedRoute>
                  <Noticias />
                </ProtectedRoute>
              }
            />
            <Route
              path="/materiais"
              element={
                <ProtectedRoute>
                  <Materiais />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bloqueios-aereos"
              element={
                <ProtectedRoute>
                  <BloqueiosAereos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bloco-notas"
              element={
                <ProtectedRoute>
                  <BlocoNotas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculadora"
              element={
                <ProtectedRoute>
                  <Calculadora />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-clientes"
              element={
                <ProtectedRoute>
                  <GestaoClientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-clientes/clientes"
              element={
                <ProtectedRoute>
                  <GestaoClientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-clientes/funil"
              element={
                <ProtectedRoute>
                  <GestaoClientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-clientes/metas"
              element={
                <ProtectedRoute>
                  <GestaoClientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/educa-academy"
              element={
                <ProtectedRoute>
                  <EducaAcademy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comunidade"
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficios"
              element={
                <ProtectedRoute>
                  <Beneficios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentorias"
              element={
                <ProtectedRoute>
                  <Mentorias />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentorias/:id"
              element={
                <ProtectedRoute>
                  <MentoriaDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook/:slug"
              element={
                <ProtectedRoute>
                  <PlaybookViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perguntas-respostas"
              element={
                <ProtectedRoute>
                  <PerguntasRespostas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dream-advisor"
              element={
                <ProtectedRoute>
                  <DreamAdvisor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/minha-vitrine"
              element={
                <ProtectedRoute>
                  <MinhaVitrine />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meu-cartao"
              element={
                <ProtectedRoute>
                  <MeuCartao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gamificacao"
              element={
                <ProtectedRoute>
                  <Gamificacao />
                </ProtectedRoute>
              }
            />
            <Route path="/politicasdeprivacidade" element={<PoliticasPrivacidade />} />
            <Route path="/termosdeuso" element={<TermosDeUso />} />
            <Route
              path="/atualizacoes"
              element={
                <ProtectedRoute>
                  <Atualizacoes />
                </ProtectedRoute>
              }
            />
            <Route path="/pesquisa/:slug" element={<Pesquisa />} />
            <Route path="/cadastro/:token" element={<CadastroLink />} />
            <Route path="/ativar-cartao" element={<AtivarCartao />} />
            <Route path="/criar-cartao" element={<CriarCartao />} />
            <Route path="/certificate-test" element={<CertificateTest />} />
            <Route path="/:slug/ofertas" element={<VitrinePublica />} />
            <Route path="/:slug" element={<SlugResolver />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;