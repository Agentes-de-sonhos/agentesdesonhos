import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ExternalLink } from "lucide-react";
import type { CommunityMeeting } from "@/hooks/useCommunityMeetings";

type Draft = Partial<CommunityMeeting> & { start_at?: string; end_at?: string | null };

const emptyDraft: Draft = {
  title: "",
  short_description: "",
  description: "",
  meeting_type: "online",
  status: "scheduled",
  cover_image_url: "",
  start_at: "",
  end_at: "",
  timezone: "America/Sao_Paulo",
  location_name: "",
  address: "",
  city: "",
  state: "",
  maps_url: "",
  meeting_platform: "",
  meeting_url: "",
  registration_url: "",
  organizer_name: "",
  recording_url: "",
  is_recording_available: false,
  published: true,
  speakers: [],
  agenda: [],
  photos: [],
  materials: [],
  related_links: [],
};

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCommunityMeetingsManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("upcoming");
  const [editing, setEditing] = useState<Draft | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-community-meetings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_meetings")
        .select("*")
        .order("start_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommunityMeeting[];
    },
  });

  const save = useMutation({
    mutationFn: async (draft: Draft) => {
      if (!draft.title || !draft.start_at) throw new Error("Título e data são obrigatórios");
      const payload: any = {
        ...draft,
        start_at: new Date(draft.start_at).toISOString(),
        end_at: draft.end_at ? new Date(draft.end_at).toISOString() : null,
      };
      if (draft.id) {
        const { error } = await (supabase as any)
          .from("community_meetings")
          .update(payload)
          .eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("community_meetings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-meetings"] });
      qc.invalidateQueries({ queryKey: ["community-meetings"] });
      toast.success("Encontro salvo");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("community_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-meetings"] });
      qc.invalidateQueries({ queryKey: ["community-meetings"] });
      toast.success("Encontro removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const togglePublish = useMutation({
    mutationFn: async (m: CommunityMeeting) => {
      const { error } = await (supabase as any)
        .from("community_meetings")
        .update({ published: !m.published, published_at: !m.published ? new Date().toISOString() : null })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-meetings"] });
      qc.invalidateQueries({ queryKey: ["community-meetings"] });
    },
  });

  const meetings = listQuery.data ?? [];
  const now = Date.now();
  const upcoming = useMemo(
    () => meetings.filter((m) => new Date(m.start_at).getTime() >= now && m.status !== "completed"),
    [meetings, now]
  );
  const past = useMemo(
    () => meetings.filter((m) => new Date(m.start_at).getTime() < now || m.status === "completed"),
    [meetings, now]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Encontros da Comunidade</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre e gerencie os encontros online e presenciais da comunidade.
            </p>
          </div>
          <Button onClick={() => setEditing({ ...emptyDraft })}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo encontro
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Próximos ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Realizados ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <MeetingsTable
              loading={listQuery.isLoading}
              meetings={upcoming}
              onEdit={(m) => setEditing({ ...m, start_at: toDatetimeLocal(m.start_at), end_at: toDatetimeLocal(m.end_at) })}
              onDelete={(id) => remove.mutate(id)}
              onTogglePublish={(m) => togglePublish.mutate(m)}
            />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <MeetingsTable
              loading={listQuery.isLoading}
              meetings={past}
              onEdit={(m) => setEditing({ ...m, start_at: toDatetimeLocal(m.start_at), end_at: toDatetimeLocal(m.end_at) })}
              onDelete={(id) => remove.mutate(id)}
              onTogglePublish={(m) => togglePublish.mutate(m)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <MeetingFormDialog
        draft={editing}
        onClose={() => setEditing(null)}
        onSave={(d) => save.mutate(d)}
        saving={save.isPending}
      />
    </Card>
  );
}

function MeetingsTable({
  loading, meetings, onEdit, onDelete, onTogglePublish,
}: {
  loading: boolean;
  meetings: CommunityMeeting[];
  onEdit: (m: CommunityMeeting) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (m: CommunityMeeting) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (meetings.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum encontro cadastrado.</p>;
  }
  return (
    <div className="space-y-2">
      {meetings.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-3 border rounded-md p-3 flex-wrap hover:bg-muted/50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{m.title}</span>
              <Badge variant="outline">{m.meeting_type}</Badge>
              {!m.published && <Badge variant="secondary">Rascunho</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(m.start_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {m.location_name && ` · ${m.location_name}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onTogglePublish(m)} title={m.published ? "Despublicar" : "Publicar"}>
              {m.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            {m.meeting_url && (
              <Button size="sm" variant="ghost" onClick={() => window.open(m.meeting_url!, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onEdit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Remover "${m.title}"?`)) onDelete(m.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingFormDialog({
  draft, onClose, onSave, saving,
}: {
  draft: Draft | null;
  onClose: () => void;
  onSave: (d: Draft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<Draft>(draft ?? emptyDraft);
  const open = !!draft;

  useEffect(() => {
    if (draft) setD(draft);
  }, [draft]);

  if (!open) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar encontro" : "Novo encontro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Título *">
            <Input value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Descrição curta (destaque)">
            <Input value={d.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
          </Field>
          <Field label="Descrição completa">
            <Textarea rows={4} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tipo *">
              <Select value={d.meeting_type} onValueChange={(v) => set("meeting_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presential">Presencial</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={d.status} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="live">Ao vivo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Início *">
              <Input type="datetime-local" value={d.start_at ?? ""} onChange={(e) => set("start_at", e.target.value)} />
            </Field>
            <Field label="Término">
              <Input type="datetime-local" value={d.end_at ?? ""} onChange={(e) => set("end_at", e.target.value)} />
            </Field>
          </div>

          <Field label="Imagem de capa (URL)">
            <Input value={d.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} />
          </Field>

          {(d.meeting_type === "online" || d.meeting_type === "hybrid") && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Plataforma (Zoom, Meet…)">
                <Input value={d.meeting_platform ?? ""} onChange={(e) => set("meeting_platform", e.target.value)} />
              </Field>
              <Field label="Link do encontro">
                <Input value={d.meeting_url ?? ""} onChange={(e) => set("meeting_url", e.target.value)} />
              </Field>
            </div>
          )}

          {(d.meeting_type === "presential" || d.meeting_type === "hybrid") && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Local (nome)">
                  <Input value={d.location_name ?? ""} onChange={(e) => set("location_name", e.target.value)} />
                </Field>
                <Field label="Endereço">
                  <Input value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Cidade">
                  <Input value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Estado (UF)">
                  <Input value={d.state ?? ""} onChange={(e) => set("state", e.target.value)} />
                </Field>
                <Field label="Google Maps URL">
                  <Input value={d.maps_url ?? ""} onChange={(e) => set("maps_url", e.target.value)} />
                </Field>
              </div>
            </>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Organizador">
              <Input value={d.organizer_name ?? ""} onChange={(e) => set("organizer_name", e.target.value)} />
            </Field>
            <Field label="URL de inscrição (opcional)">
              <Input value={d.registration_url ?? ""} onChange={(e) => set("registration_url", e.target.value)} />
            </Field>
          </div>

          <Field label="URL da gravação (encontros realizados)">
            <Input value={d.recording_url ?? ""} onChange={(e) => set("recording_url", e.target.value)} />
          </Field>

          <div className="flex items-center gap-3">
            <Switch checked={d.published ?? true} onCheckedChange={(v) => set("published", v)} />
            <Label className="cursor-pointer" onClick={() => set("published", !(d.published ?? true))}>
              Publicar (visível para a comunidade)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(d)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}