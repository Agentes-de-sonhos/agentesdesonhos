import { Pencil, PencilOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditMode } from "@/contexts/EditModeContext";

export function EditModeToggle() {
  const { editMode, toggleEditMode } = useEditMode();

  return (
    <Button
      onClick={toggleEditMode}
      variant={editMode ? "default" : "outline"}
      className="rounded-xl gap-2 transition-all"
      size="sm"
    >
      {editMode ? (
        <>
          <PencilOff className="h-4 w-4" />
          Modo edição ON
        </>
      ) : (
        <>
          <Pencil className="h-4 w-4" />
          Modo edição OFF
        </>
      )}
    </Button>
  );
}
