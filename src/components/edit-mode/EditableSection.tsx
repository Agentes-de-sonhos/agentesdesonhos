import { useState, type ReactNode } from "react";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditMode } from "@/contexts/EditModeContext";
import { cn } from "@/lib/utils";

interface EditableSectionProps {
  children: ReactNode | ((startEditing: () => void) => ReactNode);
  editForm: ReactNode;
  onSave: () => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function EditableSection({
  children,
  editForm,
  onSave,
  onCancel,
  className,
}: EditableSectionProps) {
  const { editMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => setIsEditing(true);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("relative rounded-2xl ring-2 ring-primary/30 p-1", className)}>
        {editForm}
        <div className="flex justify-end gap-2 p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      {typeof children === "function" ? children(startEditing) : children}
      {editMode && (
        <button
          onClick={startEditing}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-primary/20"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </button>
      )}
    </div>
  );
}
