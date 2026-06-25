import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Upload, Loader2, FileText, Trash2 } from "lucide-react";
import { SupplierMaterialUploadDialog } from "@/components/supplier/SupplierMaterialUploadDialog";
import { toast } from "sonner";

export function SupplierMaterialsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: operator } = useQuery({
    queryKey: ["supplier-own-operator", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_operators")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["supplier-own-materials", operator?.id],
    queryFn: async () => {
      if (!operator?.id) return [];
      const { data } = await supabase
        .from("materials")
        .select("id, title, material_type, file_url, published_at")
        .eq("supplier_id", operator.id)
        .order("published_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!operator?.id,
    staleTime: 30_000,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir material");
    } else {
      toast.success("Material excluído");
      qc.invalidateQueries({ queryKey: ["supplier-own-materials"] });
    }
  };

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
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1">
            <Upload className="h-3.5 w-3.5" /> Enviar novo material
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : materials.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground space-y-2">
            <Megaphone className="h-8 w-8 mx-auto opacity-40" />
            <p>Você ainda não enviou materiais.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {materials.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1">{m.title}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <SupplierMaterialUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </Card>
  );
}