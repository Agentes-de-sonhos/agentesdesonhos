import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  FileText,
  Star,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUpDown,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Note, NoteFilters, NoteSortOption, NoteTypeFilter } from "@/types/notes";

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
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

export function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onDuplicateNote,
  onToggleFavorite,
  onToggleTemplate,
  filters,
  onFiltersChange,
  isLoading,
}: NotesListProps) {
  const sortOptions: { value: NoteSortOption; label: string }[] = [
    { value: "updated_at", label: "Última edição" },
    { value: "created_at", label: "Data de criação" },
    { value: "title", label: "Ordem alfabética" },
  ];

  const handleSortChange = (value: NoteSortOption) => {
    onFiltersChange({
      ...filters,
      sortBy: value,
      sortOrder: value === "title" ? "asc" : "desc",
    });
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Minhas Notas</h2>
          <Button size="sm" onClick={onCreateNote} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </Button>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
          {typeFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFiltersChange({ ...filters, typeFilter: opt.value })}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors",
                filters.typeFilter === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {filters.search
                ? "Nenhuma nota encontrada"
                : filters.typeFilter === "templates"
                ? "Nenhum modelo criado ainda"
                : "Nenhuma nota criada ainda"}
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "group flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                  selectedNoteId === note.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectNote(note)}
              >
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium truncate text-sm">
                      {note.title || "Sem título"}
                    </span>
                    {note.is_favorite && (
                      <Star className="h-3 w-3 fill-warning text-warning flex-shrink-0" />
                    )}
                    {note.is_template && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                        <LayoutTemplate className="h-2.5 w-2.5" />
                        Modelo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(note.updated_at), "dd MMM yyyy, HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        : "Adicionar aos favoritos"}
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
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
