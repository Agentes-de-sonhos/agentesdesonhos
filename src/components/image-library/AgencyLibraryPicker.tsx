import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageOff, Library, Link2, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addLibraryImage, defaultNameFromUrl, filterLibraryImages, listLibraryFolders, listLibraryImages } from "@/lib/agencyImageLibrary";
import { cn } from "@/lib/utils";

export const LIBRARY_QUERY_KEY = ["agency-image-library"] as const;
export const LIBRARY_FOLDERS_KEY = ["agency-image-folders"] as const;

/** Miniatura lazy; erro vira placeholder "Imagem indisponível" sem travar a grade. */
export function LibraryThumb({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={`${alt} — imagem indisponível`} className={cn("flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground", className)}>
        <ImageOff className="h-5 w-5 opacity-60" />
        <span className="text-[11px]">Imagem indisponível</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("bg-muted object-cover", className)}
    />
  );
}

interface PickerProps {
  existingUrls: string[];
  /** Quantas fotos ainda cabem no editor (1 para editores de foto única). */
  maxSelectable: number;
  onAdd: (urls: string[]) => void;
  disabled?: boolean;
  triggerClassName?: string;
}

export function AgencyLibraryPicker({ existingUrls, maxSelectable, onAdd, disabled, triggerClassName }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const images = useQuery({ queryKey: LIBRARY_QUERY_KEY, queryFn: listLibraryImages, enabled: open, staleTime: 2 * 60 * 1000 });
  const folders = useQuery({ queryKey: LIBRARY_FOLDERS_KEY, queryFn: listLibraryFolders, enabled: open, staleTime: 2 * 60 * 1000 });

  const visible = useMemo(() => filterLibraryImages(images.data || [], search, folder as any), [images.data, search, folder]);
  const existing = useMemo(() => new Set(existingUrls.map((u) => u.trim())), [existingUrls]);

  const toggle = (url: string) => {
    setSelected((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (maxSelectable <= 1) return [url];
      if (prev.length >= maxSelectable) return prev;
      return [...prev, url];
    });
  };

  const close = () => { setOpen(false); setSelected([]); setSearch(""); setNewUrl(""); setUrlError(null); };

  const addByUrl = async () => {
    const url = newUrl.trim();
    if (!url || adding) return;
    if (existing.has(url)) { setUrlError("Esta foto já está no serviço."); return; }
    const inLibrary = (images.data || []).some((img) => img.url === url);
    setAdding(true);
    try {
      if (!inLibrary) {
        await addLibraryImage(url, defaultNameFromUrl(url), folder !== "all" && folder !== "none" ? folder : null);
        await qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      }
      setSelected((prev) => prev.includes(url) ? prev : maxSelectable <= 1 ? [url] : prev.length >= maxSelectable ? prev : [...prev, url]);
      setNewUrl("");
      setSearch("");
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "Não foi possível adicionar a imagem.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={triggerClassName || "h-8 gap-1.5 text-xs"}
        onClick={() => setOpen(true)}
        disabled={disabled || maxSelectable <= 0}
        aria-label="Biblioteca da agência"
      >
        <Library className="h-3.5 w-3.5" />
        Biblioteca da agência
      </Button>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Biblioteca da agência</DialogTitle>
            <DialogDescription>
              {maxSelectable <= 1 ? "Escolha 1 foto para este serviço." : `Escolha até ${maxSelectable} fotos para este serviço.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome" className="pl-8" aria-label="Buscar por nome" />
            </div>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="sm:w-52" aria-label="Filtrar por pasta"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pastas</SelectItem>
                <SelectItem value="none">Sem pasta</SelectItem>
                {(folders.data || []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addByUrl(); } }}
                placeholder="Colar link de uma nova foto (https://...)"
                className="pl-8"
                aria-label="Link da nova foto"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void addByUrl()} disabled={!newUrl.trim() || adding} className="gap-1.5">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar por link
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive" role="alert">{urlError}</p>}
          <div className="flex-1 overflow-y-auto min-h-[200px]" data-testid="library-picker-grid">
            {images.isLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {(images.data || []).length === 0
                  ? "A biblioteca ainda está vazia. Fotos adicionadas por link nos serviços aparecem aqui depois de salvar."
                  : "Nenhuma imagem encontrada."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {visible.map((img) => {
                  const already = existing.has(img.url);
                  const isSel = selected.includes(img.url);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      disabled={already}
                      onClick={() => toggle(img.url)}
                      aria-pressed={isSel}
                      aria-label={`Selecionar ${img.name}`}
                      className={cn(
                        "relative overflow-hidden rounded-lg border text-left transition",
                        isSel ? "border-primary ring-2 ring-primary" : "border-border",
                        already && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <LibraryThumb url={img.url} alt={img.name} className="aspect-[4/3] w-full" />
                      <span className="block truncate px-2 py-1 text-xs">{img.name}</span>
                      {isSel && (
                        <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </span>
                      )}
                      {already && <span className="absolute top-1 right-1 rounded bg-background/90 px-1 text-[10px]">Já no serviço</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
            <Button
              type="button"
              disabled={selected.length === 0}
              onClick={() => { onAdd(selected.slice(0, Math.max(1, maxSelectable))); close(); }}
            >
              Adicionar ao serviço{selected.length > 0 ? ` (${selected.length})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
