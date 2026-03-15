import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Save, Loader2 } from "lucide-react";
import { useMenuOrder } from "@/hooks/useMenuOrder";
import { cn } from "@/lib/utils";

interface MenuItemDisplay {
  key: string;
  label: string;
  isPremium?: boolean;
  isHighlighted?: boolean;
}

const VENDER_ITEMS: MenuItemDisplay[] = [
  { key: "materiais", label: "Materiais de Divulgação" },
  { key: "dream-advisor", label: "Dream Advisor", isPremium: true },
  { key: "ferramentas-ia", label: "Ferramentas IA", isPremium: true },
  { key: "mentorias", label: "Cursos e Mentorias", isPremium: true },
  { key: "cartao-digital", label: "Meu Cartão", isPremium: true },
  { key: "bloqueios-aereos", label: "Bloqueios Aéreos" },
  { key: "minha-vitrine", label: "Minha Vitrine", isPremium: true },
];

export function AdminMenuOrderManager() {
  const { menuOrder, isLoading, updateOrder, isUpdating } = useMenuOrder("vender");
  const [items, setItems] = useState<MenuItemDisplay[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync items with DB order
  useEffect(() => {
    if (menuOrder && menuOrder.length > 0) {
      const orderedItems = [...VENDER_ITEMS].sort((a, b) => {
        const orderA = menuOrder.find((m) => m.item_key === a.key)?.order_index ?? 999;
        const orderB = menuOrder.find((m) => m.item_key === b.key)?.order_index ?? 999;
        return orderA - orderB;
      });
      setItems(orderedItems);
    } else {
      setItems(VENDER_ITEMS);
    }
    setHasChanges(false);
  }, [menuOrder]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    const updates = items.map((item, index) => ({
      item_key: item.key,
      order_index: index,
    }));
    updateOrder(updates);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ordem do Menu "Vender"</CardTitle>
            <CardDescription>
              Arraste e solte para reorganizar os itens do menu. A nova ordem será aplicada para todos os usuários.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Ordem
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.key}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all",
                draggedIndex === index && "opacity-50 border-primary",
                item.isHighlighted && "ring-1 ring-primary/40 bg-primary/5"
              )}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.isPremium && (
                  <Badge variant="outline" className="text-warning border-warning/50">
                    PRO
                  </Badge>
                )}
                {item.isHighlighted && (
                  <Badge variant="outline" className="text-primary border-primary/50">
                    Destaque
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          💡 Dica: O item "Gerar Orçamento" sempre aparece com destaque visual, independente da posição.
        </p>
      </CardContent>
    </Card>
  );
}
