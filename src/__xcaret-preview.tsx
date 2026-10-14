import { createRoot } from "react-dom/client";
import "@/index.css";
import { AgencyFeaturedExperienceSection } from "@/components/whitelabel/AgencyFeaturedExperienceSection";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

const cfg = resolveSiteProfile("www.destinoscomaju.com.br").featuredExperience!;

createRoot(document.getElementById("root")!).render(
  <div className="wl-editorial wl-rose bg-background text-foreground">
    <AgencyFeaturedExperienceSection
      config={cfg}
      container="mx-auto w-full max-w-[1200px] px-5 md:px-8"
    />
  </div>
);
