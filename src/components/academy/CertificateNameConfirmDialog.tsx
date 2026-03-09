import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Loader2 } from "lucide-react";

interface CertificateNameConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onConfirm: (name: string) => Promise<void>;
}

export function CertificateNameConfirmDialog({
  open,
  onOpenChange,
  defaultName,
  onConfirm,
}: CertificateNameConfirmDialogProps) {
  const [name, setName] = useState(defaultName);
  const [generating, setGenerating] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    try {
      await onConfirm(name.trim());
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Gerar Certificado
          </DialogTitle>
          <DialogDescription>
            Confirme o nome completo que aparecerá no seu certificado. Você pode editar caso queira ajustar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="cert-name">Nome completo no certificado</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="mt-1"
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={generating || !name.trim()}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Gerar Certificado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
