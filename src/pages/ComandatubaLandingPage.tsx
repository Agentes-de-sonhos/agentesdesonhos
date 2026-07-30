import { useEffect, useRef } from "react";
import { useNoindex } from "@/hooks/useNoindex";
import { useComandatubaAgency } from "@/hooks/useComandatubaAgency";
import { Header } from "@/components/landing/comandatuba/Header";
import { HeroSection } from "@/components/landing/comandatuba/HeroSection";
import { RefugeSection } from "@/components/landing/comandatuba/RefugeSection";
import { AllInclusiveSection } from "@/components/landing/comandatuba/AllInclusiveSection";
import { ExperiencesSection } from "@/components/landing/comandatuba/ExperiencesSection";
import { AccommodationsSection } from "@/components/landing/comandatuba/AccommodationsSection";
import { AudienceAndAccessSection } from "@/components/landing/comandatuba/AudienceAndAccessSection";
import { QuoteFormSection, type FormRef } from "@/components/landing/comandatuba/QuoteFormSection";
import { FaqSection } from "@/components/landing/comandatuba/FaqSection";
import { FinalCTASection } from "@/components/landing/comandatuba/FinalCTASection";
import { Footer } from "@/components/landing/comandatuba/Footer";
import { ConsultantWidget } from "@/components/landing/comandatuba/ConsultantWidget";
import {
  SEO_TEMPLATE,
  FORM_ANCHOR_ID,
  scrollToForm,
  type AgencyConfig,
  type LandingContext,
} from "@/components/landing/comandatuba/content";
import { COMANDATUBA_PRODUCT_KEY } from "@/config/landingProducts";
import { DEFAULT_TIMEZONE, DEFAULT_OFFICE_HOURS } from "@/lib/officeHours";

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const DEMO_CONTEXT: LandingContext = {
  landingId: null,
  productKey: COMANDATUBA_PRODUCT_KEY,
  slug: null,
  isDemo: true,
  officeHours: DEFAULT_OFFICE_HOURS,
  timezone: DEFAULT_TIMEZONE,
  serverNowIso: null,
  whatsappMessageTemplate: null,
};

export default function ComandatubaLandingPage({
  agency: agencyProp,
  context,
}: {
  agency?: AgencyConfig;
  context?: LandingContext;
} = {}) {
  const demoAgency = useComandatubaAgency();
  const agency = agencyProp ?? demoAgency;
  const ctx = context ?? DEMO_CONTEXT;
  // The internal demo must never be indexed; published agency pages are public.
  useNoindex(ctx.isDemo);
  const formRef = useRef<FormRef | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = SEO_TEMPLATE.title(agency.name);
    upsertMeta('meta[name="description"]', "name", "description", SEO_TEMPLATE.description(agency.name));
    upsertMeta('meta[property="og:title"]', "property", "og:title", SEO_TEMPLATE.title(agency.name));
    upsertMeta('meta[property="og:description"]', "property", "og:description", SEO_TEMPLATE.description(agency.name));
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    // Self-canonical: the same product layout is served under many agency
    // slugs, so each published page must point to its own URL.
    if (!ctx.isDemo && typeof window !== "undefined") {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${window.location.origin}${window.location.pathname}`);
    }
    return () => {
      document.title = prev;
    };
  }, [agency.name, ctx.isDemo]);

  const handleAccommodation = (key: string, label: string) => {
    formRef.current?.setInterestedCategory(key, label);
    scrollToForm();
  };

  return (
    <div className="min-h-screen scroll-smooth bg-white text-slate-900 [scroll-behavior:smooth]">
      <Header agency={agency} />
      <main>
        <HeroSection agency={agency} />
        <RefugeSection agency={agency} />
        <AllInclusiveSection agency={agency} />
        <ExperiencesSection />
        <AccommodationsSection agency={agency} onSelect={handleAccommodation} />
        <AudienceAndAccessSection agency={agency} />
        <QuoteFormSection agency={agency} formRef={formRef} context={ctx} />
        <FaqSection agency={agency} />
        <FinalCTASection agency={agency} context={ctx} />
        <div id={`${FORM_ANCHOR_ID}-end`} aria-hidden />
      </main>
      <Footer agency={agency} />
      <ConsultantWidget agency={agency} context={ctx} />
    </div>
  );
}