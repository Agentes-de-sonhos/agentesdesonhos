import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  Star,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUpDown,
  LayoutTemplate,
  SlidersHorizontal,
  StickyNote,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Note, NoteFilters, NoteSortOption, NoteTypeFilter } from "@/types/notes";

interface NotesGridProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onDuplicateNote: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onToggleTemplate: (note: Note) => void;
  filters: NoteFilters;
  onFiltersChange: (filters: NoteFilters) => void;
  isLoading: boolean;
}

const typeFilterOptions: { value: NoteTypeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "notes", label: "Notas" },
  { value: "templates", label: "Modelos" },
];

const sortOptions: { value: NoteSortOption; label: string }[] = [
  { value: "updated_at", label: "Última edição" },
  { value: "created_at", label: "Data de criação" },
  { value: "title", label: "Ordem alfabética" },
];

function getPreview(content: string) {
  if (!content) return "";
  return content.replace(/\s+/g, " ").trim().slice(0, 140);
}

export function NotesGrid({
  notes,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onDuplicateNote,
  onToggleFavorite,
  onToggleTemplate,
  filters,
  onFiltersChange,
  isLoading,
}: NotesGridProps) {
  const handleSortChange = (value: NoteSortOption) => {
    onFiltersChange({
      ...filters,
      sortBy: value,
      sortOrder: value === "title" ? "asc" : "desc",
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9 h-10 rounded-lg bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-lg gap-2 text-muted-foreground hover:text-foreground"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-sm">
                  Filtros
                  {filters.typeFilter !== "all" && (
                    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                      1
                    </span>
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Tipo
              </p>
              {typeFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onFiltersChange({ ...filters, typeFilter: opt.value })
                  }
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                    filters.typeFilter === opt.value
                      ? "bg-muted text-foreground font-medium"
                      : "hover:bg-muted/60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[170px] h-10 rounded-lg">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onCreateNote} className="h-10 rounded-lg gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Nota</span>
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <StickyNote className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {filters.search
                ? "Nenhuma nota encontrada"
                : filters.typeFilter === "templates"
                ? "Nenhum modelo criado ainda"
                : "Nenhuma nota criada ainda"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {filters.search
                ? "Ajuste sua busca para encontrar a nota desejada."
                : "Crie sua primeira nota para começar a organizar suas ideias."}
            </p>
            {!filters.search && (
              <Button onClick={onCreateNote} className="mt-4 h-10 rounded-lg">
                <Plus className="h-4 w-4" />
                Nova Nota
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {notes.map((note) => {
            const preview = getPreview(note.content);
            return (
              <Card
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="group relative rounded-2xl border-border/60 bg-card p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md flex flex-col gap-2 h-44"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {note.title || "Sem título"}
                    </h3>
                    {note.is_favorite && (
                      <Star className="h-3.5 w-3.5 fill-warning text-warning flex-shrink-0" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTemplate(note);
                        }}
                      >
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        {note.is_template
                          ? "Remover como modelo"
                          : "Definir como modelo"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(note);
                        }}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {note.is_favorite
                          ? "Remover dos favoritos"
                          : "Fixar nota"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateNote(note);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-4 flex-1 whitespace-pre-wrap break-words">
                  {preview || (
                    <span className="italic opacity-60">Sem conteúdo</span>
                  )}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(note.updated_at), "dd MMM yyyy, HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                  {note.is_template && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
                    >
                      <LayoutTemplate className="h-2.5 w-2.5" />
                      Modelo
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}