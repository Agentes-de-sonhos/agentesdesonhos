import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Image, Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PageBanner {
  id: string;
  page_key: string;
  banner_url: string | null;
}

const PAGE_LABELS: Record<string, string> = {
  "educa-academy": "EducaTravel Academy",
  "noticias": "Notícias do Trade",
  "mapa-turismo": "Mapa do Turismo",
  "dream-advisor": "Travel Advisor",
  "beneficios": "Benefícios e Descontos",
  "agenda": "Minha Agenda",
  "bloqueios-aereos": "Bloqueios Aéreos",
  "materiais": "Materiais de Divulgação",
  "gerar-orcamento": "Orçamento",
  "criar-roteiro": "Roteiros",
  "criar-conteudo": "Criar Conteúdo",
  "gestao-clientes": "Gestão de Clientes",
  "trip-wallet": "Carteira Digital",
  "meu-cartao": "Cartão de Visitas",
  "minha-vitrine": "Vitrine Virtual",
  "perguntas-respostas": "Perguntas e Respostas",
  "comunidade": "Travel Experts",
  "mentorias": "Mentorias",
  "financeiro": "Financeiro",
  "gamificacao": "Gamificação",
};

export function AdminPageBannersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-page-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_banners")
        .select("*")
        .order("page_key");
      if (error) throw error;
      return (data || []) as PageBanner[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ pageKey, bannerUrl }: { pageKey: string; bannerUrl: string | null }) => {
      const { error } = await supabase
        .from("page_banners")
        .update({ banner_url: bannerUrl, updated_at: new Date().toISOString() })
        .eq("page_key", pageKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page-banners"] });
      queryClient.invalidateQueries({ queryKey: ["page-banner"] });
      toast({ title: "Banner atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar banner", variant: "destructive" });
    },
  });

  const handleUpload = async (pageKey: string, file: File) => {
    setUploadingKey(pageKey);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const sanitized = pageKey.replace(/[^a-z0-9-]/g, "_");
      const path = `page-banners/${sanitized}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("academy-files")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("academy-files")
        .getPublicUrl(path);

      updateMutation.mutate({ pageKey, bannerUrl: publicData.publicUrl });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemove = (pageKey: string) => {
    updateMutation.mutate({ pageKey, bannerUrl: null });
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Capas das Páginas
        </CardTitle>
        <CardDescription>
          Faça upload das imagens de capa para cada página da plataforma (recomendado: 1920×512px)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border bg-muted/30"
              >
                {/* Preview */}
                <div className="w-full sm:w-48 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {banner.banner_url ? (
                    <img
                      src={banner.banner_url}
                      alt={PAGE_LABELS[banner.page_key] || banner.page_key}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="h-8 w-8 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {PAGE_LABELS[banner.page_key] || banner.page_key}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {banner.banner_url ? "Capa configurada" : "Sem capa"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`upload-${banner.page_key}`}
                    className="cursor-pointer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      asChild
                      disabled={uploadingKey === banner.page_key}
                    >
                      <span>
                        {uploadingKey === banner.page_key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Upload
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id={`upload-${banner.page_key}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(banner.page_key, file);
                      e.target.value = "";
                    }}
                  />
                  {banner.banner_url && (
                    <ConfirmDeleteDialog onConfirm={() => handleRemove(banner.page_key)} title="Remover banner" description="Tem certeza que deseja remover este banner? Esta ação não pode ser desfeita.">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDeleteDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
