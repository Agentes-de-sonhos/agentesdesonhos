import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Footer } from "./Footer";
import { GlobalPopupModal } from "@/components/popup/GlobalPopupModal";
import { GamificationPill } from "./GamificationPill";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Mobile Sidebar - Smart icon/expanded mode */}
      <MobileSidebar />
      
      {/* Global Popup Modal for admin announcements */}
      <GlobalPopupModal />
      
      {/* Main content area - accounts for mobile sidebar width */}
      <main className="transition-all duration-300 pl-14 lg:pl-16 flex-1 flex flex-col w-full">
        {/* Global top bar with gamification pill */}
        <div className="flex justify-end items-center gap-2 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-12">
          <GamificationPill />
        </div>
        <div className="py-2 px-3 sm:py-4 sm:px-4 lg:pl-12 lg:pr-12 flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
