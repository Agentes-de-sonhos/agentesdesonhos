import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import FerramentasIA from "./pages/FerramentasIA";
import GerarOrcamento from "./pages/GerarOrcamento";
import CriarRoteiro from "./pages/CriarRoteiro";
import CriarConteudo from "./pages/CriarConteudo";
import RoteiroPublico from "./pages/RoteiroPublico";
import TripWallet from "./pages/TripWallet";
import ViagemPublica from "./pages/ViagemPublica";
import MapaTurismo from "./pages/MapaTurismo";
import SupplierDetail from "./pages/SupplierDetail";
import Noticias from "./pages/Noticias";
import Perfil from "./pages/Perfil";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import Materiais from "./pages/Materiais";
import BloqueiosAereos from "./pages/BloqueiosAereos";
import Agenda from "./pages/Agenda";
import CRM from "./pages/CRM";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
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
            <Route
              path="/mapa-turismo"
              element={
                <ProtectedRoute>
                  <MapaTurismo />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;