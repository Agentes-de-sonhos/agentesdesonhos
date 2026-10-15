import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { tutorialContextKey } from "@/lib/tutorialContext";

const PRESETS = [
  { label: "Orçamentos – criar", key: "/ferramentas-ia/gerar-orcamento" },
  { label: "Orçamentos – editar orçamento", key: "/ferramentas-ia/gerar-orcamento/:id" },
];
const empty = { context_key: PRESETS[0].key, title: "", description: "", video_url: "", sort_order: 0 };

export function AdminTutorialsManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const { data = [] } = useQuery({
    queryKey: ["admin-contextual-tutorials"],
    queryFn: async () => (await supabase.from("contextual_tutorials").select("*").order("context_key").order("sort_order")).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-contextual-tutorials"] }); qc.invalidateQueries({ queryKey: ["contextual-tutorials"] }); };

  const save = async () => {
    if (!form.title.trim() || !form.video_url.trim()) return toast.error("Informe título e link do vídeo");
    const context_key = tutorialContextKey(form.context_key.trim());
    const { error } = await supabase.from("contextual_tutorials").insert({ ...form, context_key, description: form.description || null });
    if (error) return toast.error("Não foi possível salvar");
    toast.success("Videoaula adicionada"); setForm({ ...empty, context_key }); refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Nova videoaula</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => <Button key={p.key} size="sm" variant={form.context_key === p.key ? "default" : "outline"} onClick={() => setForm({ ...form, context_key: p.key })}>{p.label}</Button>)}
          </div>
          <Input placeholder="Endereço da página (ex.: /ferramentas-ia/gerar-orcamento/:id)" value={form.context_key} onChange={(e) => setForm({ ...form, context_key: e.target.value })} />
          <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Link do vídeo (YouTube, Vimeo ou Loom)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
          <Input type="number" placeholder="Ordem" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <Button onClick={save}>Adicionar</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {data.map((t: any) => (
          <Card key={t.id}><CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.sort_order}. {t.title}</p>
              <p className="truncate text-xs text-muted-foreground">{t.context_key} · {t.video_url}</p>
            </div>
            <Input type="number" className="w-20" defaultValue={t.sort_order} onBlur={async (e) => { await supabase.from("contextual_tutorials").update({ sort_order: Number(e.target.value), updated_at: new Date().toISOString() }).eq("id", t.id); refresh(); }} />
            <Switch checked={t.is_active} onCheckedChange={async (v) => { await supabase.from("contextual_tutorials").update({ is_active: v }).eq("id", t.id); refresh(); }} />
            <Button size="icon" variant="ghost" onClick={async () => { if (!confirm("Excluir esta videoaula?")) return; await supabase.from("contextual_tutorials").delete().eq("id", t.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
