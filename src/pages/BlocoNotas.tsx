import { useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotesList } from "@/components/notes/NotesList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import { useIsMobile } from "@/hooks/use-mobile";

export default function BlocoNotas() {
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
  const isMobile = useIsMobile();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await createNote({ title: "Nova Nota" });
      setSelectedNote(newNote);
      setMobileListOpen(false);
    } catch (error) {
      console.error("Error creating note:", error);
      toast({ title: "Erro ao criar nota", description: "Tente novamente.", variant: "destructive" });
    }
  }, [createNote]);

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setMobileListOpen(false);
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
      }
    },
    [updateNote]
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

  const NotesListComponent = (
    <NotesList
      notes={notes}
      selectedNoteId={selectedNote?.id || null}
      onSelectNote={handleSelectNote}
      onCreateNote={handleCreateNote}
      onDeleteNote={setDeleteNoteId}
      onDuplicateNote={handleDuplicateNote}
      onToggleFavorite={handleToggleFavorite}
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={isLoading}
    />
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h1 className="text-xl font-bold">Bloco de Notas</h1>
            <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                {NotesListComponent}
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <div className="w-72 lg:w-80 flex-shrink-0">
              {NotesListComponent}
            </div>
          )}

          {/* Editor */}
          <NoteEditor
            note={selectedNote}
            updateNote={updateNote}
            onExportPDF={handleExportPDF}
            onExportTXT={handleExportTXT}
          />
        </div>
      </div>

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
    </DashboardLayout>
  );
}
