import { useEffect, useRef, useState } from "react";
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
import { useOpportunityNotes } from "@/hooks/useOpportunityExtras";

interface QuickOpportunityNoteDialogProps {
  opportunityId: string;
  /** Nome do cliente/oportunidade exibido como contexto discreto. */
  contextLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pop-up rápido para adicionar UMA anotação à oportunidade.
 * Reutiliza useOpportunityNotes/createNote (tabela opportunity_notes),
 * então a anotação entra na timeline e no contador do card automaticamente.
 */
export function QuickOpportunityNoteDialog({
  opportunityId,
  contextLabel,
  open,
  onOpenChange,
}: QuickOpportunityNoteDialogProps) {
  const { createNote } = useOpportunityNotes(open ? opportunityId : null);
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
    if (!canSave) return;
    setIsSaving(true);
    try {
      await createNote(content.trim());
      setContent("");
      onOpenChange(false);
    } catch {
      // erro já tratado (toast) pelo hook; mantém o pop-up aberto e o texto
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)}>
      <DialogContent
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Adicionar anotação</DialogTitle>
          {contextLabel && (
            <DialogDescription className="truncate">{contextLabel}</DialogDescription>
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
