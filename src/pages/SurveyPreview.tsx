import { useEffect } from "react";
import { FeatureUsageSurveyModal } from "@/components/survey/FeatureUsageSurveyModal";

export default function SurveyPreview() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  return (
    <div className="min-h-screen bg-muted">
      <FeatureUsageSurveyModal preview />
    </div>
  );
}
