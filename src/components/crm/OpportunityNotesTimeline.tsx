import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Check, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOpportunityNotes } from "@/hooks/useOpportunityExtras";

interface OpportunityNotesTimelineProps {
  opportunityId: string;
}

export function OpportunityNotesTimeline({ opportunityId }: OpportunityNotesTimelineProps) {
  const { notes, isLoading, createNote, updateNote, deleteNote, isSaving } =
    useOpportunityNotes(opportunityId);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const value = newContent.trim();
    if (!value) return;
    await createNote(value);
    setNewContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await updateNote({ id: editingId, content: editContent.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* New note input */}
      <div className="space-y-2">
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Adicione uma anotação sobre essa oportunidade..."
          rows={3}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Dica: Ctrl/Cmd + Enter para salvar
          </p>
          <Button size="sm" onClick={handleAdd} disabled={!newContent.trim() || isSaving}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Salvar anotação
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Carregando anotações...
          </p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma anotação ainda.
          </p>
        ) : (
          <div className="relative pl-5 border-l-2 border-border space-y-3">
            {notes.map((note) => {
              const isEditing = editingId === note.id;
              return (
                <div key={note.id} className="relative group">
                  {/* timeline dot */}
                  <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                  <div className="rounded-lg border border-border bg-card p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                          <span className="text-[11px] text-muted-foreground" title={format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
                            {formatDistanceToNow(new Date(note.created_at), {
                              locale: ptBR,
                              addSuffix: true,
                            })}
                            {note.updated_at !== note.created_at && " (editada)"}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingId(note.id);
                                setEditContent(note.content);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => setDeletingId(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) await deleteNote(deletingId);
                setDeletingId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}