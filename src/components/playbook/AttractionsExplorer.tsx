import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowUpDown, X, Compass, Landmark, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AttractionCard } from "./AttractionCard";
import type { PlaybookAttraction } from "@/types/playbook";

type SortOption = 'rating' | 'price_asc' | 'price_desc' | 'alpha';

interface AttractionsExplorerProps {
  destinationName?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'alpha', label: 'Ordem alfabética' },
];

export function AttractionsExplorer({ destinationName }: AttractionsExplorerProps) {
  const navigate = useNavigate();

  // Fetch attractions from DB
  const { data: dbAttractions = [], isLoading } = useQuery({
    queryKey: ["playbook-attractions", destinationName],
    queryFn: async () => {
      let query = supabase.from("attractions").select("*").eq("is_active", true);
      if (destinationName) {
        query = query.eq("destination", destinationName);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch experiences from DB
  const { data: dbExperiences = [] } = useQuery({
    queryKey: ["playbook-experiences", destinationName],
    queryFn: async () => {
      let query = supabase.from("experiences").select("*").eq("is_active", true);
      if (destinationName) {
        query = query.eq("destination", destinationName);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Map DB records to PlaybookAttraction format for AttractionCard compatibility
  const attractions: PlaybookAttraction[] = useMemo(() => {
    const fromAttractions = dbAttractions.map((a: any) => ({
      id: a.id,
      name: a.name,
      short_description: a.short_description || "",
      category: a.category || "Outros",
      price_from: 0,
      rating: a.review_score || 0,
      image_url: a.image_url || "",
      tags: a.must_visit ? ["Imperdível" as const] : [],
      neighborhood: a.neighborhood,
    }));
    const fromExperiences = dbExperiences.map((e: any) => ({
      id: e.id,
      name: e.name,
      short_description: e.short_description || "",
      category: "Experiências únicas" as const,
      price_from: e.average_price || 0,
      rating: e.review_score || 0,
      image_url: e.image_url || "",
      tags: e.must_visit ? ["Imperdível" as const] : [],
      neighborhood: e.neighborhood,
    }));
    return [...fromAttractions, ...fromExperiences];
  }, [dbAttractions, dbExperiences]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(true);

  // Get unique categories from data
  const categories = useMemo(() => {
    const cats = [...new Set(attractions.map((a) => a.category))].sort();
    return cats;
  }, [attractions]);

  const filtered = useMemo(() => {
    let result = [...attractions];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.short_description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }
    switch (sort) {
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'price_asc': result.sort((a, b) => a.price_from - b.price_from); break;
      case 'price_desc': result.sort((a, b) => b.price_from - a.price_from); break;
      case 'alpha': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return result;
  }, [attractions, search, selectedCategory, sort]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attractions.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1; });
    return counts;
  }, [attractions]);

  return (
    <div className="space-y-4">
      {/* CTA Banner to Dream Advisor */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
            <Compass className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Explore no Dream Advisor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Veja atrações, experiências, restaurantes, compras e muito mais com filtros avançados e sugestões da comunidade.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={() => navigate("/dream-advisor?tab=attraction")}
          >
            <Landmark className="h-4 w-4" /> Atrações
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={() => navigate("/dream-advisor?tab=experience")}
          >
            <Compass className="h-4 w-4" /> Experiências
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
        <Input
          placeholder={`Buscar atrações${destinationName ? ` em ${destinationName}` : ''}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-sm rounded-xl border-border bg-card shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-lg gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {selectedCategory && <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded text-[10px]">1</span>}
        </Button>

        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
            <ArrowUpDown className="h-3 w-3 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {isLoading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? 'atração' : 'atrações'}`}
        </span>
      </div>

      <div className="flex gap-5">
        {/* Filters sidebar */}
        {showFilters && (
          <div className="w-56 shrink-0 space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Categoria</h4>
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                  !selectedCategory ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Todas <span className="float-right opacity-70">{attractions.length}</span>
              </button>
              {categories.map((cat) => {
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat} <span className="float-right opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Carregando atrações...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma atração encontrada</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente alterar a busca ou filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((attraction) => (
                <AttractionCard key={attraction.id} attraction={attraction} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
