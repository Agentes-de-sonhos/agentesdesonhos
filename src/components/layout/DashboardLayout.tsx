import { ReactNode, createContext, useContext } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNavBar } from "./BottomNavBar";
import { Footer } from "./Footer";
import { GlobalPopupModal } from "@/components/popup/GlobalPopupModal";
import { MonthlyPopupModal } from "@/components/popup/MonthlyPopupModal";
import { ChatFloatingButton } from "@/components/community-chat/ChatFloatingButton";
import { SessionTimeoutModal } from "@/components/session/SessionTimeoutModal";
import { isActiveImpersonatingUser } from "@/lib/impersonation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { SupplierDashboardLayout } from "./supplier/SupplierDashboardLayout";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Signals to a nested <DashboardLayout> that an outer instance is already
 * mounted (e.g. from a router layout-route). Nested instances then render
 * their children as-is, avoiding a full sidebar/chrome remount on navigation.
 */
const DashboardLayoutContext = createContext(false);

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const alreadyMounted = useContext(DashboardLayoutContext);
  const { user } = useAuth();
  const { isFornecedor, loading: roleLoading } = useUserRole();
  const impersonating = isActiveImpersonatingUser(user?.id);

  if (alreadyMounted) {
    // Outer shell already provides sidebar/chrome — just render page content.
    // Keep hooks above this return so React hook order remains stable when the
    // workspace mounts nested routes/tabs for fundador/premium users.
    return <>{children}</>;
  }

  // Suppliers always use the supplier-specific layout (sidebar, bottom nav, etc.)
  if (!roleLoading && isFornecedor) {
    return <SupplierDashboardLayout>{children}</SupplierDashboardLayout>;
  }
  
  return (
    <DashboardLayoutContext.Provider value={true}>
    <div className={`min-h-screen bg-background flex flex-col overflow-x-hidden ${impersonating ? "pt-10" : ""}`}>
      {/* Desktop Sidebar - hidden on mobile */}
      <AppSidebar />
      
      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
      
      {/* Global Popup Modal for admin announcements */}
      <GlobalPopupModal />
      
      {/* Monthly Popup (inspirational + events) */}
      <MonthlyPopupModal />
      
      {/* Community Chat Floating Button (Premium only) */}
      <ChatFloatingButton />
      
      {/* Session Timeout Warning */}
      <SessionTimeoutModal />
      
      {/* Main content area */}
      <main className="transition-all duration-300 pl-0 lg:pl-16 flex-1 flex flex-col w-full overflow-x-hidden">
        <div className="py-4 px-4 sm:py-6 sm:px-6 lg:pl-6 lg:pr-6 xl:pl-12 xl:pr-12 flex-1 pb-20 lg:pb-4 min-w-0">
          {children}
        </div>
        <Footer />
      </main>
    </div>
    </DashboardLayoutContext.Provider>
  );
}
