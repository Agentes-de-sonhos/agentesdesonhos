import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen, Save, X } from "lucide-react";
import { usePlaybook, usePlaybookAdmin } from "@/hooks/usePlaybook";
import { PLAYBOOK_TABS, type PlaybookBlock, type PlaybookSection, type PlaybookContent } from "@/types/playbook";

export function AdminPlaybookManager() {
  const { destinations } = usePlaybook();
  const { createDestination, updateDestination, deleteDestination } = usePlaybookAdmin();
  const [showForm, setShowForm] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const resetForm = () => {
    setName(""); setSlug(""); setDescription(""); setImageUrl("");
    setEditingDest(null); setShowForm(false);
  };

  const handleEdit = (dest: any) => {
    setEditingDest(dest);
    setName(dest.name); setSlug(dest.slug); setDescription(dest.description || ""); setImageUrl(dest.image_url || "");
    setShowForm(true);
  };

  const handleSave = () => {
    const data = { name, slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), description: description || null, image_url: imageUrl || null };
    if (editingDest) {
      updateDestination.mutate({ id: editingDest.id, ...data });
    } else {
      createDestination.mutate(data);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Playbooks Comerciais</h2>
          <Badge variant="secondary">{destinations.length}</Badge>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Destino
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingDest ? "Editar" : "Novo"} Destino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Destino</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); if (!editingDest) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} placeholder="Nova York" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nova-york" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição do playbook..." rows={2} />
            </div>
            <div>
              <Label>URL da Imagem de Capa</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!name.trim()}>
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {destinations.map((dest) => (
          <Card key={dest.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {dest.image_url ? (
                    <img src={dest.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{dest.name}</p>
                    <p className="text-xs text-muted-foreground">/playbook/{dest.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setSelectedDestId(selectedDestId === dest.id ? null : dest.id)}>
                    Editar Conteúdo
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(dest)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Destino?</AlertDialogTitle>
                        <AlertDialogDescription>Isso removerá o playbook "{dest.name}" e todo seu conteúdo.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDestination.mutate(dest.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>

            {selectedDestId === dest.id && (
              <SectionEditor destinationId={dest.id} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function SectionEditor({ destinationId }: { destinationId: string }) {
  const { upsertSection } = usePlaybookAdmin();
  const [activeTab, setActiveTab] = useState<string>(PLAYBOOK_TABS[0].key);
  const [intro, setIntro] = useState("");
  const [blocks, setBlocks] = useState<PlaybookBlock[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: destSections = [] } = useQuery({
    queryKey: ["playbook-sections", destinationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playbook_sections")
        .select("*")
        .eq("destination_id", destinationId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        content: (typeof s.content === 'string' ? JSON.parse(s.content) : s.content) as PlaybookContent,
      })) as PlaybookSection[];
    },
  });

  const loadTab = (tabKey: string) => {
    setActiveTab(tabKey);
    const section = destSections.find((s) => s.tab_key === tabKey);
    if (section) {
      setIntro(section.content.intro || "");
      setBlocks(section.content.blocks || []);
    } else {
      setIntro("");
      setBlocks([]);
    }
  };

  if (!initialized && destSections.length >= 0) {
    loadTab(PLAYBOOK_TABS[0].key);
    setInitialized(true);
  }

  const addBlock = (type: PlaybookBlock['type']) => {
    setBlocks([...blocks, { id: crypto.randomUUID(), type, title: "", content: "", items: [] }]);
  };

  const updateBlock = (index: number, updates: Partial<PlaybookBlock>) => {
    setBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const tabIndex = PLAYBOOK_TABS.findIndex((t) => t.key === activeTab);
    upsertSection.mutate({
      destination_id: destinationId,
      tab_key: activeTab,
      title: PLAYBOOK_TABS[tabIndex].label,
      content: { intro, blocks },
      order_index: tabIndex,
    });
  };

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex gap-2 flex-wrap">
        {PLAYBOOK_TABS.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "default" : "outline"}
            onClick={() => loadTab(tab.key)}
            className="text-xs"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <Label>Introdução da Seção</Label>
          <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} placeholder="Texto introdutório..." />
        </div>

        {blocks.map((block, i) => (
          <Card key={block.id} className="border-dashed">
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{block.type}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeBlock(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input value={block.title || ""} onChange={(e) => updateBlock(i, { title: e.target.value })} placeholder="Título do bloco" />
              <Textarea value={block.content} onChange={(e) => updateBlock(i, { content: e.target.value })} rows={3} placeholder="Conteúdo..." />
              <div>
                <Label className="text-xs">Itens (um por linha)</Label>
                <Textarea
                  value={(block.items || []).join('\n')}
                  onChange={(e) => updateBlock(i, { items: e.target.value.split('\n').filter(Boolean) })}
                  rows={2}
                  placeholder={"Item 1\nItem 2"}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => addBlock('text')}>+ Texto</Button>
          <Button size="sm" variant="outline" onClick={() => addBlock('tip')}>+ Dica</Button>
          <Button size="sm" variant="outline" onClick={() => addBlock('alert')}>+ Alerta</Button>
          <Button size="sm" variant="outline" onClick={() => addBlock('strategy')}>+ Estratégia</Button>
          <Button size="sm" variant="outline" onClick={() => addBlock('checklist')}>+ Checklist</Button>
          <Button size="sm" variant="outline" onClick={() => addBlock('highlight')}>+ Destaque</Button>
        </div>

        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Salvar Seção
        </Button>
      </div>
    </div>
  );
}
