import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface CreateCustomTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, color: string) => void;
  isLoading?: boolean;
}

const colorPalette = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#78716c', // stone
];

export function CreateCustomTypeDialog({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: CreateCustomTypeDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colorPalette[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), selectedColor);
    setName("");
    setSelectedColor(colorPalette[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Criar Tipo de Evento</DialogTitle>
          <DialogDescription>
            Crie um tipo personalizado para seus eventos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="typeName">Nome do Tipo</Label>
            <Input
              id="typeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Capacitação, Webinar..."
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedColor === color
                      ? "border-foreground ring-2 ring-offset-2 ring-primary"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-sm font-medium">{name || "Novo Tipo"}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Tipo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
