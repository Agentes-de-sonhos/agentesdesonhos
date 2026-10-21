import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** True quando o usuário logado é dono de ao menos um domínio de site ativo. */
export function useOwnsAgencySite() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owns-agency-site", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { count } = await supabase
        .from("agency_public_domains")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_active", true);
      return (count ?? 0) > 0;
    },
  });
}
