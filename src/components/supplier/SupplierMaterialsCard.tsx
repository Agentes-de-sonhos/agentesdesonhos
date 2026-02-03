import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Image,
  FileText,
  Video,
  ArrowRight,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupplierMaterialsCardProps {
  supplierId: string;
  supplierName: string;
}

interface MaterialGallery {
  title: string;
  category: string;
  thumbnail_url: string | null;
  published_at: string;
  fileCount: number;
  hasVideos: boolean;
  hasImages: boolean;
  hasPDFs: boolean;
}

export function SupplierMaterialsCard({ supplierId, supplierName }: SupplierMaterialsCardProps) {
  const navigate = useNavigate();

  const { data: latestGallery, isLoading } = useQuery({
    queryKey: ["supplier-latest-materials", supplierId],
    queryFn: async () => {
      // Fetch all materials for this supplier
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Group materials by title (normalized) to create galleries
      const galleryMap = new Map<string, typeof data>();
      
      data.forEach((material) => {
        const normalizedTitle = material.title.toLowerCase().trim();
        if (!galleryMap.has(normalizedTitle)) {
          galleryMap.set(normalizedTitle, []);
        }
        galleryMap.get(normalizedTitle)!.push(material);
      });

      // Find the most recent gallery
      let latestGalleryData: MaterialGallery | null = null;
      let latestDate = new Date(0);

      galleryMap.forEach((materials, title) => {
        const mostRecentMaterial = materials[0];
        const publishedAt = new Date(mostRecentMaterial.published_at);
        
        if (publishedAt > latestDate) {
          latestDate = publishedAt;
          
          const hasVideos = materials.some(m => m.material_type === "video");
          const hasImages = materials.some(m => m.material_type === "imagem");
          const hasPDFs = materials.some(m => m.material_type === "pdf");
          const thumbnail = materials.find(m => m.thumbnail_url)?.thumbnail_url || 
                           materials.find(m => m.material_type === "imagem")?.file_url;

          latestGalleryData = {
            title: mostRecentMaterial.title,
            category: mostRecentMaterial.category,
            thumbnail_url: thumbnail || null,
            published_at: mostRecentMaterial.published_at,
            fileCount: materials.length,
            hasVideos,
            hasImages,
            hasPDFs,
          };
        }
      });

      return latestGalleryData;
    },
    enabled: !!supplierId,
  });

  const handleViewAll = () => {
    navigate(`/materiais?fornecedor=${encodeURIComponent(supplierName)}`);
  };

  const getFileTypeIcon = () => {
    if (latestGallery?.hasVideos) return <Video className="h-4 w-4" />;
    if (latestGallery?.hasPDFs) return <FileText className="h-4 w-4" />;
    return <Image className="h-4 w-4" />;
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
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5 text-primary" />
          Materiais de Divulgação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!latestGallery ? (
          <div className="text-center py-8">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">
              Nenhum material disponível no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Material Card */}
            <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all duration-300">
              {/* Thumbnail */}
              <div className="relative h-48 sm:h-56 bg-muted/30 overflow-hidden">
                {latestGallery.thumbnail_url ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
                    <img
                      src={latestGallery.thumbnail_url}
                      alt={latestGallery.title}
                      className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <Image className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* File count badge */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    {getFileTypeIcon()}
                    <span className="ml-1">{latestGallery.fileCount} {latestGallery.fileCount === 1 ? 'arquivo' : 'arquivos'}</span>
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-2">
                    {latestGallery.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(latestGallery.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                </div>

                {/* Category badge */}
                <Badge variant="outline" className="text-xs">
                  {latestGallery.category}
                </Badge>
              </div>
            </div>

            {/* View All Button */}
            <Button 
              onClick={handleViewAll} 
              className="w-full h-12 text-base font-medium"
              variant="default"
            >
              Ver todos os materiais deste fornecedor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
