import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Footer } from "./Footer";
import { GlobalPopupModal } from "@/components/popup/GlobalPopupModal";

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
      <main className="transition-all duration-300 pl-14 lg:pl-64 flex-1 flex flex-col w-full">
        <div className="container py-4 px-3 sm:py-6 sm:px-4 lg:px-8 flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
