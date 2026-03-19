import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "agente" | "promotor";

export function useUserRole() {
  const { user } = useAuth();

  const { data: role = null, isLoading: loading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      if (data && data.length > 0) {
        const hasAdmin = data.some((r) => r.role === "admin");
        return (hasAdmin ? "admin" : data[0].role) as AppRole;
      }
      return "agente" as AppRole;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isAdmin = role === "admin";
  const isAgente = role === "agente";

  return { role, loading, isAdmin, isAgente };
}
