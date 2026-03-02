import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Link2, Unlink, FolderOpen, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TrailLinkedMaterialsManagerProps {
  trailId: string;
}

// Same normalization as admin materials manager
function normalizeTitle(title: string): string {
  return title.trim().replace(/\s*\(\d+\)\s*$/, '').replace(/\s*-\s*\d+\s*$/, '').replace(/\s+\d+\s*$/, '').trim().toLowerCase();
}
function getDisplayTitle(title: string): string {
  return title.trim().replace(/\s*\(\d+\)\s*$/, '').replace(/\s*-\s*\d+\s*$/, '').replace(/\s+\d+\s*$/, '').trim();
}

interface GalleryGroup {
  key: string;
  title: string;
  supplier_name: string | null;
  category: string;
  destination: string | null;
  thumbnail: string | null;
  materialIds: string[];
  count: number;
  is_permanent: boolean;
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
        .select("id, title, material_type, category, destination, thumbnail_url, file_url, supplier_id, is_permanent, trade_suppliers(id, name)")
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

  // Group materials into galleries
  const galleries = useMemo<GalleryGroup[]>(() => {
    if (!allMaterials.length) return [];
    const map = new Map<string, any[]>();
    allMaterials.forEach((m: any) => {
      const norm = normalizeTitle(m.title);
      const key = `${norm}|${m.supplier_id || 'none'}|${(m.destination || '').trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([key, mats]) => {
      const first = mats[0];
      let thumb: string | null = null;
      for (const m of mats) {
        if (m.thumbnail_url) { thumb = m.thumbnail_url; break; }
        if (m.material_type === "Imagem" && m.file_url) { thumb = m.file_url; break; }
      }
      return {
        key,
        title: getDisplayTitle(first.title),
        supplier_name: first.trade_suppliers?.name || null,
        category: first.category,
        destination: first.destination || null,
        thumbnail: thumb,
        materialIds: mats.map((m: any) => m.id),
        count: mats.length,
        is_permanent: mats.some((m: any) => m.is_permanent),
      };
    });
  }, [allMaterials]);

  const linkedSet = new Set(linkedIds);

  // Check if a gallery is fully linked (all its material IDs are linked)
  const isGalleryLinked = (gallery: GalleryGroup) => gallery.materialIds.every(id => linkedSet.has(id));
  const isGalleryPartial = (gallery: GalleryGroup) => gallery.materialIds.some(id => linkedSet.has(id)) && !isGalleryLinked(gallery);

  // Link all materials of a gallery
  const linkGalleryMutation = useMutation({
    mutationFn: async (gallery: GalleryGroup) => {
      const toLink = gallery.materialIds.filter(id => !linkedSet.has(id));
      if (toLink.length === 0) return;
      const rows = toLink.map(material_id => ({ trail_id: trailId, material_id }));
      const { error } = await supabase.from("trail_linked_materials").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-linked-materials", trailId] });
      toast.success("Galeria vinculada!");
    },
    onError: () => toast.error("Erro ao vincular galeria"),
  });

  // Unlink all materials of a gallery (delete from trail_linked_materials)
  const unlinkGalleryMutation = useMutation({
    mutationFn: async (gallery: GalleryGroup) => {
      const toUnlink = gallery.materialIds.filter(id => linkedSet.has(id));
      if (toUnlink.length === 0) return;
      const { error } = await supabase
        .from("trail_linked_materials")
        .delete()
        .eq("trail_id", trailId)
        .in("material_id", toUnlink);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-linked-materials", trailId] });
      toast.success("Galeria desvinculada da trilha!");
    },
    onError: () => toast.error("Erro ao desvincular"),
  });

  const filtered = galleries.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      g.title.toLowerCase().includes(s) ||
      g.destination?.toLowerCase().includes(s) ||
      g.supplier_name?.toLowerCase().includes(s)
    );
  });

  // Sort: linked first
  const sorted = [...filtered].sort((a, b) => {
    const aLinked = isGalleryLinked(a) ? 0 : isGalleryPartial(a) ? 1 : 2;
    const bLinked = isGalleryLinked(b) ? 0 : isGalleryPartial(b) ? 1 : 2;
    return aLinked - bLinked;
  });

  const totalLinkedGalleries = galleries.filter(g => isGalleryLinked(g)).length;

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
        Vincule galerias de materiais de divulgação a esta trilha. Todas as imagens da galeria serão vinculadas de uma vez.
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
        <Badge variant="secondary">{totalLinkedGalleries} galeria{totalLinkedGalleries !== 1 ? "s" : ""} vinculada{totalLinkedGalleries !== 1 ? "s" : ""}</Badge>
      </div>

      <ScrollArea className="h-[45vh] border rounded-lg">
        <div className="divide-y">
          {sorted.map((gallery) => {
            const linked = isGalleryLinked(gallery);
            const partial = isGalleryPartial(gallery);
            return (
              <div
                key={gallery.key}
                className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                  linked ? "bg-primary/5" : partial ? "bg-primary/[0.02]" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                  {gallery.thumbnail ? (
                    <img src={gallery.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  )}
                  {gallery.is_permanent && (
                    <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Pin className="h-2 w-2" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{gallery.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{gallery.count} arquivo{gallery.count > 1 ? "s" : ""}</span>
                    {gallery.supplier_name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{gallery.supplier_name}</span>
                      </>
                    )}
                    {gallery.destination && (
                      <>
                        <span>•</span>
                        <span className="truncate">{gallery.destination}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <Button
                  variant={linked || partial ? "destructive" : "default"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs shrink-0"
                  disabled={linkGalleryMutation.isPending || unlinkGalleryMutation.isPending}
                  onClick={() =>
                    linked || partial
                      ? unlinkGalleryMutation.mutate(gallery)
                      : linkGalleryMutation.mutate(gallery)
                  }
                >
                  {linked || partial ? (
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
              Nenhuma galeria encontrada
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
