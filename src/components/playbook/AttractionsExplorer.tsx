import { useState, useMemo, useCallback, useRef } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, Plus, Trash2, Pencil, X, Upload, Loader2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AttractionCard } from "./AttractionCard";
import {
  ATTRACTION_CATEGORIES,
  ATTRACTION_TAGS,
  type PlaybookAttraction,
  type AttractionCategory,
  type AttractionTag,
  type PlaybookContent,
} from "@/types/playbook";

type SortOption = 'rating' | 'price_asc' | 'price_desc' | 'alpha';

interface AttractionsExplorerProps {
  section?: { content: PlaybookContent } | null;
  destinationName?: string;
  onSaveSection?: (content: PlaybookContent) => Promise<void>;
}

function sanitizeFileName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'alpha', label: 'Ordem alfabética' },
];

export function AttractionsExplorer({ section, destinationName, onSaveSection }: AttractionsExplorerProps) {
  const isAdmin = !!onSaveSection;
  const attractions: PlaybookAttraction[] = section?.content?.attractions || [];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AttractionCategory | null>(null);
  const [sort, setSort] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);

  // Admin state
  const [editDialog, setEditDialog] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<PlaybookAttraction | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<Partial<PlaybookAttraction>>({});

  const filtered = useMemo(() => {
    let result = [...attractions];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.short_description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Sort
    switch (sort) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_asc':
        result.sort((a, b) => a.price_from - b.price_from);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price_from - a.price_from);
        break;
      case 'alpha':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [attractions, search, selectedCategory, sort]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attractions.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [attractions]);

  // Admin: image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `attractions/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("playbook-files").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("playbook-files").getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Imagem enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  // Admin: open editor
  const openEditor = useCallback((attraction?: PlaybookAttraction) => {
    if (attraction) {
      setEditingAttraction(attraction);
      setForm({ ...attraction });
    } else {
      setEditingAttraction(null);
      setForm({
        name: '',
        short_description: '',
        category: ATTRACTION_CATEGORIES[0],
        price_from: 0,
        rating: 8.0,
        image_url: '',
        tags: [],
      });
    }
    setEditDialog(true);
  }, []);

  // Admin: save attraction
  const handleSave = useCallback(async () => {
    if (!onSaveSection) return;
    if (!form.name || !form.category) {
      toast.error("Preencha nome e categoria.");
      return;
    }
    setSaving(true);
    try {
      let updated: PlaybookAttraction[];
      const newAttraction: PlaybookAttraction = {
        id: editingAttraction?.id || crypto.randomUUID(),
        name: form.name || '',
        short_description: form.short_description || '',
        category: form.category as AttractionCategory,
        price_from: Number(form.price_from) || 0,
        rating: Number(form.rating) || 0,
        image_url: form.image_url || '',
        tags: (form.tags || []) as AttractionTag[],
        duration_minutes: form.duration_minutes,
        neighborhood: form.neighborhood,
        traveler_profile: form.traveler_profile,
      };

      if (editingAttraction) {
        updated = attractions.map((a) => (a.id === editingAttraction.id ? newAttraction : a));
      } else {
        updated = [...attractions, newAttraction];
      }

      await onSaveSection({ ...section?.content, attractions: updated });
      setEditDialog(false);
      toast.success(editingAttraction ? "Atração atualizada!" : "Atração adicionada!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [onSaveSection, form, editingAttraction, attractions, section?.content]);

  // Admin: delete attraction
  const handleDelete = useCallback(async (id: string) => {
    if (!onSaveSection) return;
    const updated = attractions.filter((a) => a.id !== id);
    await onSaveSection({ ...section?.content, attractions: updated });
    toast.success("Atração removida!");
  }, [onSaveSection, attractions, section?.content]);

  const toggleTag = (tag: AttractionTag) => {
    const current = (form.tags || []) as AttractionTag[];
    setForm((prev) => ({
      ...prev,
      tags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    }));
  };

  return (
    <div className="space-y-4">
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
          {filtered.length} {filtered.length === 1 ? 'atração' : 'atrações'}
        </span>

        {isAdmin && (
          <Button size="sm" onClick={() => openEditor()} className="rounded-lg gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        )}
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
              {ATTRACTION_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                if (count === 0 && !isAdmin) return null;
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
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma atração encontrada</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente alterar a busca ou filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((attraction) => (
                <div key={attraction.id} className="relative group/card">
                  <AttractionCard attraction={attraction} />
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                      <Button size="icon" variant="secondary" className="h-7 w-7 rounded-lg shadow-md" onClick={() => openEditor(attraction)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-7 w-7 rounded-lg shadow-md" onClick={() => handleDelete(attraction.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin edit dialog */}
      {isAdmin && (
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAttraction ? "Editar Atração" : "Nova Atração"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: SUMMIT One Vanderbilt" />
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Textarea value={form.short_description || ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} placeholder="Descrição breve da atração" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.category || ''} onValueChange={(v) => setForm({ ...form, category: v as AttractionCategory })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ATTRACTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nota (0-10)</Label>
                  <Input type="number" step="0.1" min="0" max="10" value={form.rating ?? ''} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço a partir de ($)</Label>
                  <Input type="number" min="0" value={form.price_from ?? ''} onChange={(e) => setForm({ ...form, price_from: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Duração (minutos)</Label>
                  <Input type="number" min="0" value={form.duration_minutes ?? ''} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || undefined })} placeholder="Opcional" />
                </div>
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.neighborhood || ''} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Opcional" />
              </div>

              {/* Image */}
              <div>
                <Label>Imagem</Label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                {form.image_url ? (
                  <div className="relative rounded-lg overflow-hidden mt-1">
                    <img src={form.image_url} alt="" className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Trocar"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setForm({ ...form, image_url: '' })}>Remover</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full mt-1 border-dashed" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Enviar imagem
                  </Button>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {ATTRACTION_TAGS.map((tag) => (
                    <label key={tag} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={((form.tags || []) as AttractionTag[]).includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingAttraction ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
