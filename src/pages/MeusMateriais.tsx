import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SupplierDashboardLayout } from "@/components/layout/supplier/SupplierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, FileText, Megaphone } from "lucide-react";
import { SupplierMaterialUploadDialog } from "@/components/supplier/SupplierMaterialUploadDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MeusMateriais() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: operator } = useQuery({
    queryKey: ["supplier-own-operator", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_operators")
        .select("id, name")
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
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, material_type, file_url, published_at")
        .eq("supplier_id", operator.id)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!operator?.id,
    staleTime: 30_000,
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("materials").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir material");
    } else {
      toast.success("Material excluído");
      qc.invalidateQueries({ queryKey: ["supplier-own-materials"] });
      qc.invalidateQueries({ queryKey: ["supplier-materials-summary"] });
    }
    setDeleteId(null);
  };

  return (
    <SupplierDashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-orange-600" />
              Materiais de Divulgação
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os materiais enviados pela sua empresa.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Enviar novo material
          </Button>
        </div>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <Megaphone className="h-10 w-10 mx-auto opacity-40" />
                <p>Você ainda não enviou nenhum material.</p>
                <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" /> Enviar primeiro material
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {materials.map((m: any) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-border/60 p-4 hover:border-primary/40 transition-colors flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.material_type} ·{" "}
                          {new Date(m.published_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      {m.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(m.file_url, "_blank")}
                        >
                          Abrir
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierMaterialUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SupplierDashboardLayout>
  );
}