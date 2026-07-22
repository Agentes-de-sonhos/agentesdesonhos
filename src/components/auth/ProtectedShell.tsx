import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";

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
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
