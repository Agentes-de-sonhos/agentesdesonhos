import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Star, Search, MapPin, Calendar, Users, Wand2, Copy, Trash2, Pencil, MoreVertical, ImageIcon, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useItineraryTemplates, type ItineraryTemplate } from "@/hooks/useItineraryTemplates";
import { InstantiateTemplateDialog } from "@/components/itinerary/InstantiateTemplateDialog";
import { TRIP_PROFILE_LABELS } from "@/types/itinerary";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STYLE_LABELS: Record<string, string> = {
  economico: "Econômico",
  moderado: "Moderado",
  luxo: "Premium",
};

export default function ModelosRoteiros() {
  const { templates, isLoading, deleteTemplate, duplicateTemplate, updateTemplate } = useItineraryTemplates();
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [instantiate, setInstantiate] = useState<ItineraryTemplate | null>(null);
  const [editing, setEditing] = useState<ItineraryTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ItineraryTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (styleFilter !== "all" && t.style !== styleFilter) return false;
      if (profileFilter !== "all" && t.profile !== profileFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.destination ?? "").toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [templates, search, styleFilter, profileFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="modelos-roteiros"
          title="Biblioteca de Modelos"
          subtitle="Reutilize roteiros como base inteligente para novos clientes"
          icon={Star}
        />

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, destino ou tag..."
              className="pl-9"
            />
          </div>
          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Estilo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estilos</SelectItem>
              {Object.entries(STYLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={profileFilter} onValueChange={setProfileFilter}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Perfil" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {Object.entries(TRIP_PROFILE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Carregando modelos...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">
              {templates.length === 0 ? "Nenhum modelo salvo ainda" : "Nenhum modelo encontrado"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              {templates.length === 0
                ? "Crie um roteiro e use a ação ‘Salvar como modelo’ para reaproveitar a estrutura em futuras viagens."
                : "Ajuste os filtros para encontrar o modelo que procura."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <div className="relative aspect-[16/10] w-full bg-muted">
                  {t.cover_image_url ? (
                    <img src={t.cover_image_url} alt={t.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8 bg-background/90 backdrop-blur">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setInstantiate(t)}>
                          <Wand2 className="mr-2 h-4 w-4" /> Criar roteiro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(t)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateTemplate.mutate(t.id)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmDelete(t)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs">
                      <Calendar className="mr-1 h-3 w-3" />
                      {t.nights_count} noites
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2.5">
                  <h3 className="font-display font-semibold text-base leading-tight line-clamp-1">{t.name}</h3>
                  {t.destination && (
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{t.destination}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{STYLE_LABELS[t.style] ?? t.style}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="mr-0.5 h-2.5 w-2.5" />
                      {TRIP_PROFILE_LABELS[t.profile as keyof typeof TRIP_PROFILE_LABELS] ?? t.profile}
                    </Badge>
                    {(t.activities_count ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px]">{t.activities_count} atividades</Badge>
                    )}
                  </div>
                  {t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {t.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button className="w-full mt-2" size="sm" onClick={() => setInstantiate(t)}>
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                    Criar roteiro a partir deste
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {instantiate && (
        <InstantiateTemplateDialog
          open={!!instantiate}
          onOpenChange={(o) => { if (!o) setInstantiate(null); }}
          template={instantiate}
        />
      )}

      {editing && (
        <EditTemplateDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSave={(updates) => {
            updateTemplate.mutate({ id: editing.id, updates }, { onSuccess: () => setEditing(null) });
          }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo "{confirmDelete?.name}" será excluído permanentemente. Roteiros já criados a partir dele não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteTemplate.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function EditTemplateDialog({
  template,
  onClose,
  onSave,
}: {
  template: ItineraryTemplate;
  onClose: () => void;
  onSave: (updates: Partial<ItineraryTemplate>) => void;
}) {
  const [name, setName] = useState(template.name);
  const [nights, setNights] = useState(template.nights_count);
  const [style, setStyle] = useState(template.style);
  const [profile, setProfile] = useState(template.profile);
  const [tagsStr, setTagsStr] = useState(template.tags.join(", "));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar modelo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Noites</Label>
              <Input type="number" min={1} value={nights} onChange={(e) => setNights(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STYLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIP_PROFILE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSave({
              name: name.trim() || template.name,
              nights_count: nights,
              style,
              profile,
              tags: tagsStr.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
            })}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}