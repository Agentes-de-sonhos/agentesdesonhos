import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Upload, ArrowRight, Loader2, FileText } from "lucide-react";

export function SupplierMaterialsCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-materials-summary", user?.id],
    queryFn: async () => {
      const { data: op } = await supabase
        .from("tour_operators")
        .select("id, materials")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!op) return { count: 0, recent: [] as any[] };
      const { data: mats } = await supabase
        .from("materials")
        .select("id, title, type, created_at")
        .eq("supplier_id", op.id)
        .order("created_at", { ascending: false })
        .limit(5);
      const inline = Array.isArray(op.materials) ? op.materials.length : 0;
      return { count: (mats?.length || 0) + inline, recent: mats || [] };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return (
    <Card className="border-0 shadow-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-600" />
              Materiais de Divulgação
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-600" />
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/materiais")} className="gap-1">
            <Upload className="h-3.5 w-3.5" /> Enviar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{data?.count || 0}</span>
              <span className="text-sm text-muted-foreground">materiais publicados</span>
            </div>
            {data && data.recent.length > 0 ? (
              <div className="space-y-1.5">
                {data.recent.slice(0, 4).map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1">{m.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Envie PDFs, imagens, vídeos e campanhas para que agentes de viagens encontrem seu material.
              </p>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-center gap-1" onClick={() => navigate("/materiais")}>
              Gerenciar materiais <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}