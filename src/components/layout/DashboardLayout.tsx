import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNavBar } from "./BottomNavBar";
import { Footer } from "./Footer";
import { GlobalPopupModal } from "@/components/popup/GlobalPopupModal";
import { ChatFloatingButton } from "@/components/community-chat/ChatFloatingButton";
import { isImpersonating } from "@/components/admin/ImpersonationBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const impersonating = isImpersonating();
  
  return (
    <div className={`min-h-screen bg-background flex flex-col overflow-x-hidden ${impersonating ? "pt-10" : ""}`}>
      {/* Desktop Sidebar - hidden on mobile */}
      <AppSidebar />
      
      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
      
      {/* Global Popup Modal for admin announcements */}
      <GlobalPopupModal />
      
      {/* Community Chat Floating Button (Premium only) */}
      <ChatFloatingButton />
      
      {/* Main content area */}
      <main className="transition-all duration-300 pl-0 lg:pl-16 flex-1 flex flex-col w-full">
        <div className="py-4 px-3 sm:py-6 sm:px-4 lg:pl-12 lg:pr-12 flex-1 pb-20 lg:pb-4">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
