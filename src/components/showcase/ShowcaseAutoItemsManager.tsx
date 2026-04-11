import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Eye, EyeOff, ChevronUp, ChevronDown, Loader2, Image as ImageIcon,
  Search, Filter
} from "lucide-react";
import { useShowcaseOverrides } from "@/hooks/useShowcaseOverrides";
import { toast } from "sonner";

interface AutoItem {
  material_key: string;
  image_url: string | null;
  title: string;
  supplier_name: string | null;
  category: string;
  is_permanent: boolean;
  created_at: string;
  gallery_count: number;
}

interface ShowcaseAutoItemsManagerProps {
  showcaseId: string;
  autoItems: AutoItem[];
  isLoading: boolean;
}

export function ShowcaseAutoItemsManager({ showcaseId, autoItems, isLoading }: ShowcaseAutoItemsManagerProps) {
  const { overrideMap, toggleVisibility, saveOrder, isLoading: loadingOverrides } = useShowcaseOverrides(showcaseId);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "visible" | "hidden">("all");
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading || loadingOverrides) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Carregando lâminas automáticas...</p>
        </CardContent>
      </Card>
    );
  }

  // Apply overrides to determine order and visibility
  const itemsWithOverrides = autoItems.map((item) => {
    const override = overrideMap.get(item.material_key);
    return {
      ...item,
      is_hidden: override?.is_hidden ?? false,
      custom_order: override?.custom_order ?? null,
    };
  });

  // Sort: items with custom_order first (by order), then remaining by original position
  const sortedItems = [...itemsWithOverrides].sort((a, b) => {
    if (a.custom_order !== null && b.custom_order !== null) return a.custom_order - b.custom_order;
    if (a.custom_order !== null) return -1;
    if (b.custom_order !== null) return 1;
    return 0;
  });

  // Apply filters
  const filteredItems = sortedItems.filter((item) => {
    if (filterStatus === "visible" && item.is_hidden) return false;
    if (filterStatus === "hidden" && !item.is_hidden) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.supplier_name?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const visibleCount = itemsWithOverrides.filter((i) => !i.is_hidden).length;
  const hiddenCount = itemsWithOverrides.filter((i) => i.is_hidden).length;

  const handleMove = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sortedItems.length) return;

    const newItems = [...sortedItems];
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];

    setIsSaving(true);
    try {
      await saveOrder(newItems.map((i) => i.material_key));
      toast.success("Ordem atualizada");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (materialKey: string) => {
    await toggleVisibility(materialKey);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Lâminas atualmente na sua vitrine
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" /> {visibleCount} visíveis
            </Badge>
            {hiddenCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" /> {hiddenCount} ocultas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, operadora ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "visible", "hidden"] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setFilterStatus(status)}
              >
                {status === "all" ? "Todas" : status === "visible" ? "Visíveis" : "Ocultas"}
              </Button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {search || filterStatus !== "all" ? "Nenhuma lâmina encontrada com esses filtros." : "Nenhuma lâmina automática disponível."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item, idx) => {
              const globalIdx = sortedItems.findIndex((s) => s.material_key === item.material_key);
              return (
                <div
                  key={item.material_key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    item.is_hidden
                      ? "bg-muted/30 border-border/50 opacity-60"
                      : "bg-card border-border"
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMove(globalIdx, "up")}
                      disabled={globalIdx === 0 || isSaving}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMove(globalIdx, "down")}
                      disabled={globalIdx === sortedItems.length - 1 || isSaving}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="h-16 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {item.gallery_count > 1 && (
                      <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 py-0.5 font-bold rounded-tl">
                        {item.gallery_count}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title || "Sem título"}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {item.supplier_name && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.supplier_name}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {item.category}
                      </Badge>
                      {item.is_permanent && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
                          Permanente
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Toggle visibility */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {item.is_hidden ? "Oculta" : "Visível"}
                    </span>
                    <Switch
                      checked={!item.is_hidden}
                      onCheckedChange={() => handleToggle(item.material_key)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
