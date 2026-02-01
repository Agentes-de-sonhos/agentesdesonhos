import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { usePromoterPresentation } from "@/hooks/usePromoterPresentation";
import { StartPresentationModal } from "@/components/promoter/StartPresentationModal";
import { PresentationModeBar } from "@/components/promoter/PresentationModeBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const {
    isPromotor,
    activePresentation,
    needsPresentation,
    startPresentation,
    isStartingPresentation,
    endPresentation,
    isEndingPresentation,
  } = usePromoterPresentation();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Presentation Mode Bar for Promoters */}
      {isPromotor && activePresentation && (
        <PresentationModeBar
          presentation={activePresentation}
          onEndPresentation={endPresentation}
          isEnding={isEndingPresentation}
        />
      )}

      {/* Start Presentation Modal for Promoters */}
      <StartPresentationModal
        open={needsPresentation}
        onStartPresentation={startPresentation}
        isLoading={isStartingPresentation}
      />

      {/* Desktop Sidebar */}
      <AppSidebar />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      <main className={`transition-all duration-300 lg:pl-64 flex-1 flex flex-col w-full ${
        isPromotor && activePresentation ? "pt-12" : ""
      }`}>
        <div className={`container py-6 px-4 lg:px-8 flex-1 ${
          isPromotor && activePresentation ? "pt-6" : "pt-16 lg:pt-6"
        }`}>
          {children}
        </div>
        <div className="lg:pl-0">
          <Footer />
        </div>
      </main>
    </div>
  );
}
