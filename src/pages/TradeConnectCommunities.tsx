import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Loader2 } from "lucide-react";

export default function TradeConnectCommunities() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check community membership
  const { data: membership, isLoading } = useQuery({
    queryKey: ["community-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("community_members")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isMember = membership && ["approved_unverified", "verified"].includes(membership.status);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Trade Connect — Minhas Comunidades
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Participe de comunidades e conecte-se com outros agentes
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* My Communities */}
            {isMember && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Minhas Comunidades</h2>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/comunidade")}>
                  <CardContent className="pt-4 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Travel Experts</h3>
                        <p className="text-xs text-muted-foreground">Comunidade premium de agentes experientes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Membro
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Available Communities */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {isMember ? "Outras Comunidades" : "Comunidades Disponíveis"}
              </h2>
              {!isMember && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Travel Experts</h3>
                        <p className="text-xs text-muted-foreground">Comunidade premium de agentes experientes</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => navigate("/comunidade")}>
                      Solicitar participação
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card className="mt-3 border-dashed">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Novas comunidades em breve! 🚀
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
