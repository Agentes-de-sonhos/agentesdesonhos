import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  Image,
  Video,
  File,
  Download,
  ExternalLink,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  "Todas",
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
];

const MATERIAL_TYPES = ["Todos", "Lâmina", "PDF", "Imagem", "Vídeo"];

const typeIcons: Record<string, React.ElementType> = {
  "Lâmina": FileText,
  "PDF": File,
  "Imagem": Image,
  "Vídeo": Video,
};

export default function Materiais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedSupplier, setSelectedSupplier] = useState("Todos");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          *,
          trade_suppliers (
            id,
            name
          )
        `)
        .eq("is_active", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["trade-suppliers-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredMaterials = materials?.filter((material) => {
    const matchesSearch = material.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || material.category === selectedCategory;
    const matchesType =
      selectedType === "Todos" || material.material_type === selectedType;
    const matchesSupplier =
      selectedSupplier === "Todos" || material.supplier_id === selectedSupplier;
    return matchesSearch && matchesCategory && matchesType && matchesSupplier;
  });

  const getFileIcon = (type: string) => {
    const Icon = typeIcons[type] || File;
    return <Icon className="h-5 w-5" />;
  };

  const handleView = (material: any) => {
    const url = material.video_url || material.file_url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Materiais de Divulgação
          </h1>
          <p className="text-muted-foreground mt-1">
            Acesse lâminas, PDFs, imagens e vídeos dos fornecedores
          </p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os fornecedores</SelectItem>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de material" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMaterials && filteredMaterials.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((material) => (
              <Card
                key={material.id}
                className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleView(material)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getFileIcon(material.material_type)}
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {material.title}
                        </CardTitle>
                        {material.trade_suppliers && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {material.trade_suppliers.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{material.material_type}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {material.category}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {material.video_url ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Publicado em{" "}
                    {new Date(material.published_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum material encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Ajuste os filtros ou aguarde novos materiais
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
