import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowRight, FolderOpen } from "lucide-react";
import { GalleryCard } from "@/components/materials/GalleryCard";
import { GalleryModal } from "@/components/materials/GalleryModal";
import type { Material, MaterialGallery } from "@/types/materials";

interface SupplierMaterialsCardProps {
  supplierId: string;
  supplierName: string;
}

export function SupplierMaterialsCard({ supplierId, supplierName }: SupplierMaterialsCardProps) {
  const navigate = useNavigate();
  const [selectedGallery, setSelectedGallery] = useState<MaterialGallery | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: galleries, isLoading } = useQuery({
    queryKey: ["supplier-material-galleries", supplierId],
    queryFn: async () => {
      // Fetch all materials for this supplier
      const { data, error } = await supabase
        .from("materials")
        .select("*, tour_operators(id, name)")
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group materials by normalized title to create galleries
      const galleryMap = new Map<string, Material[]>();
      
      data.forEach((material) => {
        const normalizedTitle = material.title.toLowerCase().trim();
        if (!galleryMap.has(normalizedTitle)) {
          galleryMap.set(normalizedTitle, []);
        }
        galleryMap.get(normalizedTitle)!.push(material as Material);
      });

      // Convert to MaterialGallery array
      const galleriesArray: MaterialGallery[] = [];
      
      galleryMap.forEach((materials, normalizedTitle) => {
        const firstMaterial = materials[0];
        const hasVideos = materials.some(m => m.material_type === "Vídeo");
        const hasImages = materials.some(m => m.material_type === "Imagem");
        const hasPDFs = materials.some(m => m.material_type === "PDF" || m.material_type === "Lâmina");
        
        // Find best thumbnail
        const thumbnail = materials.find(m => m.thumbnail_url)?.thumbnail_url || 
                         materials.find(m => m.material_type === "Imagem")?.file_url ||
                         null;

        galleriesArray.push({
          id: normalizedTitle,
          title: firstMaterial.title,
          category: firstMaterial.category,
          destination: firstMaterial.destination,
          supplier_id: firstMaterial.supplier_id,
          tour_operators: firstMaterial.tour_operators,
          materials,
          published_at: firstMaterial.published_at,
          thumbnail_url: thumbnail,
          fileCount: materials.length,
          hasVideos,
          hasImages,
          hasPDFs,
          isCanvaTemplate: false,
          canva_url: null,
        });
      });

      // Sort by most recent
      galleriesArray.sort((a, b) => 
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );

      return galleriesArray;
    },
    enabled: !!supplierId,
  });

  const handleOpenGallery = (gallery: MaterialGallery) => {
    setSelectedGallery(gallery);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGallery(null);
  };

  const handleViewAll = () => {
    navigate(`/materiais?fornecedor=${encodeURIComponent(supplierName)}`);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
            Materiais de Divulgação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4 overflow-hidden">
              <Skeleton className="h-56 w-64 flex-shrink-0 rounded-lg" />
              <Skeleton className="h-56 w-64 flex-shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
            Materiais de Divulgação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!galleries || galleries.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">
                Nenhum material disponível no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gallery Cards - Horizontal scroll on mobile, grid on desktop */}
              <div className="block sm:hidden">
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {galleries.slice(0, 6).map((gallery) => (
                      <div key={gallery.id} className="flex-shrink-0 w-[280px]">
                        <GalleryCard
                          gallery={gallery}
                          variant="large"
                          onOpen={() => handleOpenGallery(gallery)}
                        />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleries.slice(0, 6).map((gallery) => (
                  <GalleryCard
                    key={gallery.id}
                    gallery={gallery}
                    onOpen={() => handleOpenGallery(gallery)}
                  />
                ))}
              </div>

              {/* View All Button */}
              <Button 
                onClick={handleViewAll} 
                className="w-full h-12 text-base font-medium"
                variant="default"
              >
                Ver todos os materiais
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Modal - Same as main materials page */}
      <GalleryModal
        gallery={selectedGallery}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
