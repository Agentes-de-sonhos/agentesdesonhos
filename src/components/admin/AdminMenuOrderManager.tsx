import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Save, Loader2, ChevronDown, ChevronRight, Layers, Menu } from "lucide-react";
import { useFullMenuOrder } from "@/hooks/useFullMenuOrder";
import { MAIN_MENU_ITEMS, SECTION_ITEMS, MenuItemConfig } from "@/config/menuConfig";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AdminMenuOrderManager() {
  const { allMenuOrder, isLoading, updateOrder, isUpdating } = useFullMenuOrder();
  const [mainItems, setMainItems] = useState<MenuItemConfig[]>([]);
  const [sectionItems, setSectionItems] = useState<Record<string, MenuItemConfig[]>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Sync with DB order
  useEffect(() => {
    if (allMenuOrder && allMenuOrder.length > 0) {
      // Sort main items
      const mainOrder = allMenuOrder.filter((m) => m.section === "main");
      const orderedMain = [...MAIN_MENU_ITEMS].sort((a, b) => {
        const orderA = mainOrder.find((m) => m.item_key === a.key)?.order_index ?? 999;
        const orderB = mainOrder.find((m) => m.item_key === b.key)?.order_index ?? 999;
        return orderA - orderB;
      });
      setMainItems(orderedMain);

      // Sort section sub-items
      const newSectionItems: Record<string, MenuItemConfig[]> = {};
      for (const [sectionKey, items] of Object.entries(SECTION_ITEMS)) {
        const sectionOrder = allMenuOrder.filter((m) => m.section === sectionKey);
        newSectionItems[sectionKey] = [...items].sort((a, b) => {
          const orderA = sectionOrder.find((m) => m.item_key === a.key)?.order_index ?? 999;
          const orderB = sectionOrder.find((m) => m.item_key === b.key)?.order_index ?? 999;
          return orderA - orderB;
        });
      }
      setSectionItems(newSectionItems);
    } else {
      setMainItems(MAIN_MENU_ITEMS);
      setSectionItems({ ...SECTION_ITEMS });
    }
    setHasChanges(false);
  }, [allMenuOrder]);

  const handleDragStart = (index: number, section: string) => {
    setDraggedIndex(index);
    setDragSection(section);
  };

  const handleDragOver = (e: React.DragEvent, index: number, section: string) => {
    e.preventDefault();
    if (draggedIndex === null || dragSection !== section || draggedIndex === index) return;

    if (section === "main") {
      const newItems = [...mainItems];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, draggedItem);
      setMainItems(newItems);
    } else {
      const items = [...(sectionItems[section] || [])];
      const draggedItem = items[draggedIndex];
      items.splice(draggedIndex, 1);
      items.splice(index, 0, draggedItem);
      setSectionItems((prev) => ({ ...prev, [section]: items }));
    }
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragSection(null);
  };

  const handleSave = () => {
    const updates: { section: string; items: { item_key: string; order_index: number }[] }[] = [];

    // Main menu order
    updates.push({
      section: "main",
      items: mainItems.map((item, index) => ({ item_key: item.key, order_index: index })),
    });

    // Section sub-items order
    for (const [sectionKey, items] of Object.entries(sectionItems)) {
      updates.push({
        section: sectionKey,
        items: items.map((item, index) => ({ item_key: item.key, order_index: index })),
      });
    }

    updateOrder(updates);
    setHasChanges(false);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
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

  const renderDraggableItem = (
    item: MenuItemConfig,
    index: number,
    section: string,
    isSubItem = false
  ) => (
    <div
      key={item.key}
      draggable
      onDragStart={() => handleDragStart(index, section)}
      onDragOver={(e) => handleDragOver(e, index, section)}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all",
        isSubItem ? "p-2.5 ml-6 border-dashed" : "p-3",
        draggedIndex === index && dragSection === section && "opacity-50 border-primary ring-1 ring-primary/30",
        item.isSection && "bg-muted/30 font-medium"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      {item.isSection ? (
        <Layers className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        <Menu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={cn("flex-1 text-sm", item.isSection && "font-semibold")}>
        {item.label}
      </span>
      {item.isSection && (
        <Badge variant="secondary" className="text-xs">
          Seção
        </Badge>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ordem do Menu Principal</CardTitle>
            <CardDescription>
              Arraste e solte para reorganizar os itens e seções do menu. Expanda as seções para
              reordenar os sub-itens. A nova ordem será aplicada em todos os dispositivos.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isUpdating} className="gap-2">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Ordem
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {mainItems.map((item, index) => (
          <div key={item.key}>
            {item.isSection && item.sectionKey ? (
              <Collapsible
                open={openSections[item.sectionKey]}
                onOpenChange={() => toggleSection(item.sectionKey!)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      {renderDraggableItem(item, index, "main")}
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                        {openSections[item.sectionKey] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-1 animate-fade-in">
                    {(sectionItems[item.sectionKey] || []).map((subItem, subIndex) =>
                      renderDraggableItem(subItem, subIndex, item.sectionKey!, true)
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ) : (
              renderDraggableItem(item, index, "main")
            )}
          </div>
        ))}
        <p className="text-sm text-muted-foreground mt-4">
          💡 Dica: Clique na seta ao lado de uma seção para expandir e reorganizar seus sub-itens.
        </p>
      </CardContent>
    </Card>
  );
}
