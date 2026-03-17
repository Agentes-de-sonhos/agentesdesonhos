import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebar } from "./MobileSidebar";
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
      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Mobile Sidebar - Smart icon/expanded mode */}
      <MobileSidebar />
      
      {/* Global Popup Modal for admin announcements */}
      <GlobalPopupModal />
      
      {/* Community Chat Floating Button (Premium only) */}
      <ChatFloatingButton />
      
      {/* Main content area - accounts for mobile sidebar width */}
      <main className="transition-all duration-300 pl-14 lg:pl-16 flex-1 flex flex-col w-full">
        <div className="py-4 px-3 sm:py-6 sm:px-4 lg:pl-12 lg:pr-12 flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
