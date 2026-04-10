import { useState } from "react";
import { useVitrineCategories } from "@/hooks/useVitrineCategories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Pencil, Check, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

export function AdminVitrineCategoriesManager() {
  const { categories, isLoading, addCategory, updateCategory, removeCategory } = useVitrineCategories();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Categoria já existe");
      return;
    }
    addCategory.mutate(trimmed, {
      onSuccess: () => {
        setNewName("");
        toast.success("Categoria criada");
      },
      onError: () => toast.error("Erro ao criar categoria"),
    });
  };

  const handleUpdate = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Categoria já existe");
      return;
    }
    updateCategory.mutate({ id, name: trimmed }, {
      onSuccess: () => {
        setEditingId(null);
        toast.success("Categoria atualizada");
      },
      onError: () => toast.error("Erro ao atualizar"),
    });
  };

  const handleRemove = (id: string) => {
    removeCategory.mutate(id, {
      onSuccess: () => toast.success("Categoria removida"),
      onError: () => toast.error("Erro ao remover categoria"),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5" />
          Categorias da Vitrine
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gerencie as categorias disponíveis na Vitrine Virtual. Os agentes visualizam apenas as categorias definidas aqui.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1.5 bg-background">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-6 w-32 border-0 p-0 text-sm focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(cat.id)}
                    className="text-primary hover:text-primary/80"
                    disabled={updateCategory.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium bg-muted">
                  {cat.name}
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditingName(cat.name);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(cat.id)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={removeCategory.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nenhuma categoria criada ainda.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Adicionar nova categoria..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={addCategory.isPending || !newName.trim()}
          >
            {addCategory.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
