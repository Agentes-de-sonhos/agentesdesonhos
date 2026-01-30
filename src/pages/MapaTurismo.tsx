import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Building2,
  Search,
  Globe,
  Instagram,
  Phone,
  Mail,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";

const CATEGORIES = [
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

interface TradeSupplier {
  id: string;
  name: string;
  category: string;
  how_to_sell: string | null;
  sales_channel: string | null;
  practical_notes: string | null;
  website_url: string | null;
  instagram_url: string | null;
  other_social_media: any[];
  is_active: boolean;
  created_at: string;
}

export default function MapaTurismo() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const navigate = useNavigate();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["trade-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as TradeSupplier[];
    },
  });

  const filteredSuppliers = suppliers?.filter((supplier) => {
    const matchesSearch = supplier.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || supplier.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Operadoras de turismo": "bg-blue-500/10 text-blue-600",
      "Consolidadoras": "bg-purple-500/10 text-purple-600",
      "Companhias aéreas": "bg-sky-500/10 text-sky-600",
      "Hospedagem": "bg-amber-500/10 text-amber-600",
      "Locadoras de veículos": "bg-green-500/10 text-green-600",
      "Cruzeiros": "bg-cyan-500/10 text-cyan-600",
      "Seguros viagem": "bg-red-500/10 text-red-600",
      "Parques e atrações": "bg-pink-500/10 text-pink-600",
      "Receptivos": "bg-orange-500/10 text-orange-600",
      "Guias": "bg-teal-500/10 text-teal-600",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Diretório de Fornecedores
              </h1>
              <p className="text-muted-foreground">
                Encontre parceiros do trade turístico
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome da empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSuppliers?.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhum fornecedor encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros de busca
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers?.map((supplier) => (
              <Card
                key={supplier.id}
                className="group cursor-pointer shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                onClick={() => navigate(`/mapa-turismo/${supplier.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {supplier.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={`mt-2 ${getCategoryColor(supplier.category)}`}
                      >
                        {supplier.category}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>

                  {supplier.sales_channel && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {supplier.sales_channel}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    {supplier.website_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(supplier.website_url!, "_blank");
                        }}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    {supplier.instagram_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(supplier.instagram_url!, "_blank");
                        }}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Category Legend */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Categorias disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className={`cursor-pointer transition-opacity hover:opacity-80 ${getCategoryColor(cat)} ${
                    categoryFilter === cat ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === cat ? "all" : cat)
                  }
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
