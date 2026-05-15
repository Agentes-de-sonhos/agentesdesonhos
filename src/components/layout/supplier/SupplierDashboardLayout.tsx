import { ReactNode } from "react";
import { SupplierSidebar } from "./SupplierSidebar";
import { SupplierBottomNavBar } from "./SupplierBottomNavBar";
import { Footer } from "../Footer";
import { GlobalPopupModal } from "@/components/popup/GlobalPopupModal";
import { MonthlyPopupModal } from "@/components/popup/MonthlyPopupModal";
import { ChatFloatingButton } from "@/components/community-chat/ChatFloatingButton";
import { SessionTimeoutModal } from "@/components/session/SessionTimeoutModal";
import { isActiveImpersonatingUser } from "@/lib/impersonation";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
}

export function SupplierDashboardLayout({ children }: Props) {
  const { user } = useAuth();
  const impersonating = isActiveImpersonatingUser(user?.id);

  return (
    <div
      className={`min-h-screen bg-background flex flex-col overflow-x-hidden ${
        impersonating ? "pt-10" : ""
      }`}
    >
      <SupplierSidebar />
      <SupplierBottomNavBar />
      <GlobalPopupModal />
      <MonthlyPopupModal />
      <ChatFloatingButton />
      <SessionTimeoutModal />

      <main className="transition-all duration-300 pl-0 lg:pl-16 flex-1 flex flex-col w-full overflow-x-hidden">
        <div className="py-4 px-4 sm:py-6 sm:px-6 lg:pl-12 lg:pr-12 flex-1 pb-20 lg:pb-4 min-w-0">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}