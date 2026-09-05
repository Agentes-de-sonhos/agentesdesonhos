import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOperationTimeline } from "@/hooks/useOperations";

interface QuickOperationNoteDialogProps {
  operationId: string;
  /** Viagem/cliente exibido como contexto discreto. */
  contextLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pop-up focado para adicionar UMA anotação à operação.
 * Reutiliza useOperationTimeline/addNote (event_type "manual_note"),
 * então a anotação entra na timeline/histórico da operação automaticamente.
 */
export function QuickOperationNoteDialog({
  operationId,
  contextLabel,
  open,
  onOpenChange,
}: QuickOperationNoteDialogProps) {
  const { events, addNote } = useOperationTimeline(open ? operationId : null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    const text = content.trim();
    if (!text || isSaving) return;

    const isDuplicate = events.some(
      (ev) => ev.event_type === "manual_note" && (ev.description || "").trim() === text
    );
    if (isDuplicate) {
      toast.error("Esta anotação já foi registrada nesta operação.");
      return;
    }

    setIsSaving(true);
    try {
      await addNote(text);
      toast.success("Anotação registrada");
      setContent("");
      onOpenChange(false);
    } catch (e: any) {
      // mantém o pop-up aberto e o texto digitado
      toast.error(e?.message || "Não foi possível salvar a anotação");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Criar anotação</DialogTitle>
          {contextLabel && (
            <DialogDescription className="break-words">{contextLabel}</DialogDescription>
          )}
        </DialogHeader>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Digite sua anotação..."
          rows={5}
          disabled={isSaving}
          className="resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {isSaving ? "Salvando..." : "Salvar anotação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
