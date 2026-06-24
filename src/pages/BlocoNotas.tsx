import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { useNotes } from "@/hooks/useNotes";
import { useToast } from "@/hooks/use-toast";
import { Note } from "@/types/notes";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";

function BlocoNotasInner() {
  const {
    notes,
    isLoading,
    filters,
    setFilters,
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,
  } = useNotes();
  const { toast } = useToast();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await createNote({ title: "Nova Nota" });
      setSelectedNote(newNote);
    } catch (error) {
      console.error("Error creating note:", error);
      toast({ title: "Erro ao criar nota", description: "Tente novamente.", variant: "destructive" });
    }
  }, [createNote]);

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
  }, []);

  const handleDeleteNote = useCallback(async () => {
    if (!deleteNoteId) return;

    try {
      await deleteNote(deleteNoteId);
      if (selectedNote?.id === deleteNoteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({ title: "Erro ao excluir nota", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setDeleteNoteId(null);
    }
  }, [deleteNoteId, deleteNote, selectedNote]);

  const handleDuplicateNote = useCallback(
    async (note: Note) => {
      try {
        const duplicated = await duplicateNote(note);
        setSelectedNote(duplicated);
      } catch (error) {
        console.error("Error duplicating note:", error);
        toast({ title: "Erro ao duplicar nota", description: "Tente novamente.", variant: "destructive" });
      }
    },
    [duplicateNote]
  );

  const handleToggleFavorite = useCallback(
    async (note: Note) => {
      try {
        await updateNote({ id: note.id, is_favorite: !note.is_favorite });
      } catch (error) {
        console.error("Error toggling favorite:", error);
        toast({ title: "Erro ao atualizar favorito", description: "Tente novamente.", variant: "destructive" });
      }
    },
    [updateNote]
  );

  const handleToggleTemplate = useCallback(
    async (note: Note) => {
      try {
        await updateNote({ id: note.id, is_template: !note.is_template });
        toast({
          title: note.is_template ? "Modelo removido" : "Definido como modelo",
          description: note.is_template ? "A nota não é mais um modelo." : "A nota agora pode ser usada como modelo.",
        });
      } catch (error) {
        console.error("Error toggling template:", error);
        toast({ title: "Erro ao atualizar modelo", description: "Tente novamente.", variant: "destructive" });
      }
    },
    [updateNote, toast]
  );

  const handleExportPDF = useCallback((note: Note) => {
    // Create a simple PDF using browser print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${note.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              margin-bottom: 20px;
              color: #333;
            }
            .content {
              white-space: pre-wrap;
              line-height: 1.6;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>${note.title}</h1>
          <div class="content">${note.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <div class="footer">
            Exportado de Agentes de Sonhos - Bloco de Notas
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, []);

  const handleExportTXT = useCallback((note: Note) => {
    const text = `${note.title}\n${"=".repeat(note.title.length)}\n\n${note.content}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Nota exportada",
      description: "O arquivo TXT foi baixado.",
    });
  }, [toast]);

  return (
    <>
      <NotesGrid
        notes={notes}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={setDeleteNoteId}
        onDuplicateNote={handleDuplicateNote}
        onToggleFavorite={handleToggleFavorite}
        onToggleTemplate={handleToggleTemplate}
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Note Editor Modal */}
      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => !open && setSelectedNote(null)}
      >
        <DialogContent className="p-0 gap-0 max-w-none w-[95vw] sm:w-[90vw] h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden rounded-2xl">
          <NoteEditor
            note={selectedNote}
            updateNote={updateNote}
            onExportPDF={handleExportPDF}
            onExportTXT={handleExportTXT}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta nota? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function BlocoNotasContent() {
  return (
    <SubscriptionGuard feature="notepad">
      <BlocoNotasInner />
    </SubscriptionGuard>
  );
}

export default function BlocoNotas() {
  return (
    <DashboardLayout>
      <BlocoNotasContent />
    </DashboardLayout>
  );
}

