import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CriticalErrorState } from "@/components/common/CriticalErrorState";

/**
 * Layout-route element used to group all authenticated routes.
 * Mounts <ProtectedRoute> and <DashboardLayout> ONCE, so the sidebar,
 * bottom nav and other chrome persist across navigations (SPA feel).
 * Nested pages that still call <DashboardLayout> internally become
 * passthroughs via DashboardLayoutContext.
 */
export function ProtectedShell() {
  return (
    <ProtectedRoute>
      {/* All authenticated routes are private: block indexing globally. */}
      <SEO noindex />
      <DashboardLayout>
        <ErrorBoundary
          fallback={
            <CriticalErrorState
              description="Esta área não carregou corretamente. Você pode tentar novamente sem perder o restante da plataforma."
              retryLabel="Atualizar área"
              onRetry={() => window.location.reload()}
            />
          }
        >
          <Outlet />
        </ErrorBoundary>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
