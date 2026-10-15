import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Images, Link2, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  addLibraryImage, createLibraryFolder, deleteLibraryFolder, deleteLibraryImage, filterLibraryImages,
  getPendingLibraryRetries, listLibraryFolders, listLibraryImages, renameLibraryFolder,
  retryPendingLibraryRegistrations, updateLibraryImage, type LibraryImage,
} from "@/lib/agencyImageLibrary";
import { LIBRARY_FOLDERS_KEY, LIBRARY_QUERY_KEY, LibraryThumb } from "@/components/image-library/AgencyLibraryPicker";
import { cn } from "@/lib/utils";

const NO_FOLDER = "__none__";

export default function BibliotecaImagens() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryImage | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string } | null>(null);
  const [pending, setPending] = useState(getPendingLibraryRetries());

  const images = useQuery({ queryKey: LIBRARY_QUERY_KEY, queryFn: listLibraryImages, staleTime: 60 * 1000 });
  const folders = useQuery({ queryKey: LIBRARY_FOLDERS_KEY, queryFn: listLibraryFolders, staleTime: 60 * 1000 });
  const folderName = useMemo(() => new Map((folders.data || []).map((f) => [f.id, f.name])), [folders.data]);
  const visible = useMemo(() => filterLibraryImages(images.data || [], search, folder as any), [images.data, search, folder]);

  const refresh = () => { qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY }); qc.invalidateQueries({ queryKey: LIBRARY_FOLDERS_KEY }); };
  const run = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: refresh,
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const activeFolder = folder !== "all" && folder !== "none" ? folder : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Biblioteca de imagens</h1>
          <p className="text-sm text-muted-foreground">Links de imagens compartilhados com toda a equipe da sua agência.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setFolderDialog({ name: "" })}><FolderPlus className="mr-1.5 h-4 w-4" />Nova pasta</Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Adicionar link</Button>
        </div>
      </div>

      {pending > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <span>{pending} foto(s) de serviços salvos ainda não entraram na biblioteca.</span>
          <Button size="sm" variant="outline" onClick={async () => {
            const ok = await retryPendingLibraryRegistrations();
            setPending(getPendingLibraryRetries());
            if (ok) refresh(); else toast({ title: "Ainda não foi possível registrar. Tente novamente.", variant: "destructive" });
          }}>Tentar novamente</Button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome" className="pl-8" aria-label="Buscar por nome" />
        </div>
        <Select value={folder} onValueChange={setFolder}>
          <SelectTrigger className="sm:w-56" aria-label="Filtrar por pasta"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as pastas</SelectItem>
            <SelectItem value="none">Sem pasta</SelectItem>
            {(folders.data || []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {activeFolder && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Renomear pasta" onClick={() => setFolderDialog({ id: activeFolder, name: folderName.get(activeFolder) || "" })}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir pasta" onClick={() => {
              if (!confirm("Excluir esta pasta? As imagens dela vão para \"Sem pasta\".")) return;
              run.mutate(() => deleteLibraryFolder(activeFolder));
              setFolder("all");
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {images.isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (images.data || []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <Images className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Sua biblioteca está vazia</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Ao adicionar uma foto por link em um serviço e salvar, ela aparece aqui automaticamente. Você também pode adicionar links manualmente.
          </p>
          <Button onClick={() => setAddOpen(true)}><Link2 className="mr-1.5 h-4 w-4" />Adicionar link</Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma imagem encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="library-grid">
          {visible.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <LibraryThumb url={img.url} alt={img.name} className="aspect-[4/3] w-full" />
              <div className="space-y-1 p-2">
                <p className="truncate text-sm font-medium" title={img.name}>{img.name}</p>
                <p className="truncate text-xs text-muted-foreground">{img.folder_id ? folderName.get(img.folder_id) || "Sem pasta" : "Sem pasta"}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 flex-1 px-2 text-xs" onClick={() => setEditing(img)}><Pencil className="mr-1 h-3 w-3" />Editar</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" aria-label={`Excluir ${img.name}`} onClick={() => {
                    if (!confirm("Excluir da biblioteca? Serviços que já usam esta foto não mudam.")) return;
                    run.mutate(() => deleteLibraryImage(img.id));
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageDialog
        open={addOpen || !!editing}
        image={editing}
        folders={folders.data || []}
        defaultFolder={activeFolder}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSave={(v) => run.mutateAsync(() => editing
          ? updateLibraryImage(editing.id, { name: v.name, url: v.url, folder_id: v.folder })
          : addLibraryImage(v.url, v.name, v.folder))}
      />

      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{folderDialog?.id ? "Renomear pasta" : "Nova pasta"}</DialogTitle>
            <DialogDescription>Pastas ajudam a organizar as imagens da agência.</DialogDescription>
          </DialogHeader>
          <Input value={folderDialog?.name || ""} maxLength={80} onChange={(e) => setFolderDialog((d) => d && { ...d, name: e.target.value })} aria-label="Nome da pasta" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderDialog(null)}>Cancelar</Button>
            <Button disabled={!folderDialog?.name.trim()} onClick={async () => {
              const d = folderDialog!;
              try { await run.mutateAsync(() => d.id ? renameLibraryFolder(d.id, d.name) : createLibraryFolder(d.name)); setFolderDialog(null); } catch { /* toast */ }
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImageDialog({ open, image, folders, defaultFolder, onClose, onSave }: {
  open: boolean; image: LibraryImage | null; folders: { id: string; name: string }[]; defaultFolder: string | null;
  onClose: () => void; onSave: (v: { url: string; name: string; folder: string | null }) => Promise<unknown>;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [folderSel, setFolderSel] = useState(NO_FOLDER);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const currentKey = open ? image?.id || "new" : null;
  if (currentKey !== key) {
    setKey(currentKey);
    setUrl(image?.url || "");
    setName(image?.name || "");
    setFolderSel(image ? image.folder_id || NO_FOLDER : defaultFolder || NO_FOLDER);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{image ? "Editar imagem" : "Adicionar link de imagem"}</DialogTitle>
          <DialogDescription>
            {image ? "Trocar o link vale só para próximas seleções; serviços já salvos não mudam." : "Cole um link público e permanente (http ou https) de uma imagem."}
          </DialogDescription>
        </DialogHeader>
        {url.trim() && <LibraryThumb key={url} url={url.trim()} alt="Pré-visualização" className="aspect-[16/9] w-full rounded-lg" />}
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="lib-url">Link da imagem</Label><Input id="lib-url" value={url} inputMode="url" onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1"><Label htmlFor="lib-name">Nome</Label><Input id="lib-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-1">
            <Label>Pasta</Label>
            <Select value={folderSel} onValueChange={setFolderSel}>
              <SelectTrigger aria-label="Pasta"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>Sem pasta</SelectItem>
                {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!url.trim() || saving} className={cn(saving && "opacity-80")} onClick={async () => {
            setSaving(true);
            try { await onSave({ url, name: name.trim() || (image?.name ?? ""), folder: folderSel === NO_FOLDER ? null : folderSel }); onClose(); } catch { /* toast */ } finally { setSaving(false); }
          }}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
