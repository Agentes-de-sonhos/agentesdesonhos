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
import { LANDING_FLAGS, SEO } from "@/components/landing/orlando-magic/content";

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function OrlandoMagicLandingPage() {
  useNoindex();
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO.title;

    upsertMeta('meta[name="description"]', "name", "description", SEO.description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", SEO.ogTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", SEO.ogDescription);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", SEO.twitterTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", SEO.twitterDescription);

    return () => {
      document.title = prevTitle;
    };
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
