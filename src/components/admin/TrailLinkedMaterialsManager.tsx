import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Link2, Unlink, Image, Video, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TrailLinkedMaterialsManagerProps {
  trailId: string;
}

export function TrailLinkedMaterialsManager({ trailId }: TrailLinkedMaterialsManagerProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Fetch all active materials
  const { data: allMaterials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ["all-materials-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, material_type, category, destination, thumbnail_url, file_url, supplier_id, trade_suppliers(id, name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked material IDs for this trail
  const { data: linkedIds = [], isLoading: loadingLinked } = useQuery({
    queryKey: ["trail-linked-materials", trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_linked_materials")
        .select("material_id")
        .eq("trail_id", trailId);
      if (error) throw error;
      return data.map((r: any) => r.material_id as string);
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from("trail_linked_materials")
        .insert({ trail_id: trailId, material_id: materialId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-linked-materials", trailId] });
      toast.success("Material vinculado!");
    },
    onError: () => toast.error("Erro ao vincular material"),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from("trail_linked_materials")
        .delete()
        .eq("trail_id", trailId)
        .eq("material_id", materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-linked-materials", trailId] });
      toast.success("Material desvinculado!");
    },
    onError: () => toast.error("Erro ao desvincular"),
  });

  const linkedSet = new Set(linkedIds);

  const filtered = allMaterials.filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.title?.toLowerCase().includes(s) ||
      m.destination?.toLowerCase().includes(s) ||
      m.trade_suppliers?.name?.toLowerCase().includes(s)
    );
  });

  // Sort: linked first
  const sorted = [...filtered].sort((a: any, b: any) => {
    const aLinked = linkedSet.has(a.id) ? 0 : 1;
    const bLinked = linkedSet.has(b.id) ? 0 : 1;
    return aLinked - bLinked;
  });

  const typeIcon = (type: string) => {
    if (type === "Imagem") return <Image className="h-3.5 w-3.5" />;
    if (type === "Vídeo") return <Video className="h-3.5 w-3.5" />;
    return <File className="h-3.5 w-3.5" />;
  };

  if (loadingMaterials || loadingLinked) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Vincule materiais de divulgação do menu principal a esta trilha. Eles aparecerão como posts no estilo rede social na aba "Materiais de Divulgação" da trilha.
      </p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, destino ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Badge variant="secondary">{linkedIds.length} vinculados</Badge>
      </div>

      <ScrollArea className="h-[45vh] border rounded-lg">
        <div className="divide-y">
          {sorted.map((m: any) => {
            const isLinked = linkedSet.has(m.id);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                  isLinked ? "bg-primary/5" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {m.thumbnail_url || (m.material_type === "Imagem" && m.file_url) ? (
                    <img
                      src={m.thumbnail_url || m.file_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    typeIcon(m.material_type)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{m.material_type}</span>
                    {m.trade_suppliers?.name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{m.trade_suppliers.name}</span>
                      </>
                    )}
                    {m.destination && (
                      <>
                        <span>•</span>
                        <span className="truncate">{m.destination}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <Button
                  variant={isLinked ? "destructive" : "default"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs shrink-0"
                  disabled={linkMutation.isPending || unlinkMutation.isPending}
                  onClick={() =>
                    isLinked
                      ? unlinkMutation.mutate(m.id)
                      : linkMutation.mutate(m.id)
                  }
                >
                  {isLinked ? (
                    <>
                      <Unlink className="h-3.5 w-3.5" /> Desvincular
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" /> Vincular
                    </>
                  )}
                </Button>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum material encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
