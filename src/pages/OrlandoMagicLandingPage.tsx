import { useEffect } from "react";
import { AgentRecommendationBar } from "@/components/landing/orlando-magic/AgentRecommendationBar";
import { HeroSection } from "@/components/landing/orlando-magic/HeroSection";
import { BenefitsSection } from "@/components/landing/orlando-magic/BenefitsSection";
import { ObjectionSection } from "@/components/landing/orlando-magic/ObjectionSection";
import { TicketCategoriesSection } from "@/components/landing/orlando-magic/TicketCategoriesSection";
import { KiaCenterSection } from "@/components/landing/orlando-magic/KiaCenterSection";
import { AgentPresentationSection } from "@/components/landing/orlando-magic/AgentPresentationSection";
import { HowItWorksSection } from "@/components/landing/orlando-magic/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/orlando-magic/TestimonialsSection";
import { FAQSection } from "@/components/landing/orlando-magic/FAQSection";
import { FinalCTA } from "@/components/landing/orlando-magic/FinalCTA";
import { LandingFooter } from "@/components/landing/orlando-magic/LandingFooter";
import { MobileStickyCTA } from "@/components/landing/orlando-magic/MobileStickyCTA";
import { LANDING_FLAGS } from "@/components/landing/orlando-magic/content";

export default function OrlandoMagicLandingPage() {
  useEffect(() => {
    document.title = "Orlando Magic • Uma noite de NBA na sua viagem a Orlando";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Inclua uma partida do Orlando Magic no Kia Center no seu roteiro em Orlando. Opções para famílias e todos os orçamentos, com o atendimento do seu agente de viagens."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AgentRecommendationBar />
      <HeroSection />
      <BenefitsSection />
      <ObjectionSection />
      <TicketCategoriesSection />
      <KiaCenterSection />
      <AgentPresentationSection />
      <HowItWorksSection />
      {LANDING_FLAGS.showTestimonials && <TestimonialsSection />}
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
      <MobileStickyCTA />
    </div>
  );
}
