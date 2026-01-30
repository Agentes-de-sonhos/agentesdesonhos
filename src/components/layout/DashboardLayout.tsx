import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="transition-all duration-300 lg:pl-64">
        <div className="container py-6 px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
