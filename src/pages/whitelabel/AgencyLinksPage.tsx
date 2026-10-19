import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import CartaoPublico from "@/pages/CartaoPublico";

/**
 * Página de links (bio) do domínio da agência: `/links`.
 * Reaproveita o cartão virtual ativo mais antigo do DONO da agência resolvida
 * pelo hostname — nunca de outro tenant.
 */
export default function AgencyLinksPage({ info, cardSlug, fallback }: { info: AgencyDomainInfo; cardSlug?: string; fallback?: React.ReactNode }) {
  const { data: slug, isLoading } = useQuery({
    queryKey: ["agency-links-card", info.user_id, cardSlug ?? null],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_cards")
        .select("slug")
        .eq("user_id", info.user_id)
        .eq("is_active", true)
        // Cartão individual (/juliana): só se pertencer ao dono desta agência.
        .eq(cardSlug ? "slug" : "is_active", cardSlug ?? true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data?.slug as string | undefined) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!slug) {
    if (cardSlug && fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Página de links ainda não configurada.</p>
      </div>
    );
  }
  return <CartaoPublico slugOverride={slug} publicUrlOverride={`https://${info.hostname}/${cardSlug ?? "links"}`} />;
}
