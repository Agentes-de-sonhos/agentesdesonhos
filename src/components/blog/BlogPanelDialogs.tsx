import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBlogCategories, useBlogSettings } from "@/hooks/useBlogAdmin";
import { BLOG_DEFAULT_TZ, slugify } from "@/lib/blog/blogUtils";

const sb = supabase as any;

export const BLOG_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Rio_Branco",
  "America/Noronha",
  "Europe/Lisbon",
  "America/New_York",
];

export function BlogCategoriesDialog({ open, onOpenChange, agencyId }: { open: boolean; onOpenChange: (v: boolean) => void; agencyId: string }) {
  const qc = useQueryClient();
  const { data: cats = [] } = useBlogCategories(agencyId);
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["blog-categories", agencyId] });

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    const { error } = await sb.from("site_blog_categories").insert({ agency_id: agencyId, name: n.slice(0, 60), slug: slugify(n).slice(0, 70) });
    if (error) return toast.error(error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar a categoria.");
    setName("");
    refresh();
  };
  const remove = async (id: string) => {
    const { error } = await sb.from("site_blog_categories").delete().eq("id", id);
    if (error) return toast.error("Não foi possível remover a categoria.");
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorias do blog</DialogTitle>
          <DialogDescription>Organize os artigos por assunto. Os visitantes podem filtrar por categoria.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dicas de viagem" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}>Adicionar</Button>
        </div>
        <ul className="divide-y rounded-lg border">
          {cats.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nenhuma categoria ainda.</li>}
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-3 text-sm">
              {c.name}
              <Button variant="ghost" size="icon" aria-label={`Remover ${c.name}`} onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function BlogSettingsDialog({ open, onOpenChange, agencyId }: { open: boolean; onOpenChange: (v: boolean) => void; agencyId: string }) {
  const qc = useQueryClient();
  const { data } = useBlogSettings(agencyId);
  const [form, setForm] = useState({ cta_title: "", cta_text: "", timezone: BLOG_DEFAULT_TZ, default_author_name: "" });
  useEffect(() => {
    if (data) setForm({ cta_title: data.cta_title ?? "", cta_text: data.cta_text ?? "", timezone: data.timezone, default_author_name: data.default_author_name ?? "" });
  }, [data]);

  const save = async () => {
    const { error } = await sb.from("site_blog_settings").upsert({ agency_id: agencyId, ...form, updated_at: new Date().toISOString() });
    if (error) return toast.error("Não foi possível salvar as configurações.");
    toast.success("Configurações salvas.");
    qc.invalidateQueries({ queryKey: ["blog-settings", agencyId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações do blog</DialogTitle>
          <DialogDescription>Valem para todos os artigos, a menos que o artigo tenha um convite próprio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título do convite ao final do artigo</Label>
            <Input value={form.cta_title} onChange={(e) => setForm({ ...form, cta_title: e.target.value })} placeholder="Vamos planejar a sua viagem?" />
          </div>
          <div className="space-y-1">
            <Label>Texto do convite</Label>
            <Textarea value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Autor padrão</Label>
            <Input value={form.default_author_name} onChange={(e) => setForm({ ...form, default_author_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Fuso horário padrão para agendamentos</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {BLOG_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={save}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
