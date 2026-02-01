import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface FeatureLimitDialogProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
}

export function FeatureLimitDialog({
  open,
  onClose,
  featureName,
}: FeatureLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-warning/20">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle>Limite Atingido</DialogTitle>
              <DialogDescription>
                Modo demonstração concluído
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground">
            A funcionalidade <strong>{featureName}</strong> já foi utilizada nesta apresentação.
          </p>
          <p className="text-muted-foreground mt-2">
            No modo demonstração, cada ferramenta pode ser usada apenas uma vez por apresentação.
          </p>
        </div>

        <Button onClick={onClose} className="w-full">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
