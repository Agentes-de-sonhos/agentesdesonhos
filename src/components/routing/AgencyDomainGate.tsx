import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { agencyHostFromLocation, fetchAgencyDomain } from "@/lib/agencyDomains";

const AgencyDomainRoutes = lazy(() => import("@/components/routing/AgencyDomainRoutes"));

/**
 * When the current hostname belongs to an agency (custom domain), renders the
 * white-label agency site instead of the platform app. Otherwise renders the
 * platform routes untouched — platform hosts never even hit the network.
 */
export function AgencyDomainGate({ children }: { children: React.ReactNode }) {
  const host =
    typeof window === "undefined"
      ? null
      : agencyHostFromLocation(window.location.hostname, window.location.search);

  const { data, isLoading } = useQuery({
    queryKey: ["agency-domain", host],
    enabled: !!host,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchAgencyDomain(host as string),
  });

  if (host && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (host && data) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <AgencyDomainRoutes info={data} />
      </Suspense>
    );
  }

  return <>{children}</>;
}