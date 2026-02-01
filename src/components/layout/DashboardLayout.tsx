import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      <main className="transition-all duration-300 lg:pl-64 flex-1 flex flex-col w-full">
        <div className="container py-6 px-4 lg:px-8 flex-1 pt-16 lg:pt-6">
          {children}
        </div>
        <div className="lg:pl-0">
          <Footer />
        </div>
      </main>
    </div>
  );
}
