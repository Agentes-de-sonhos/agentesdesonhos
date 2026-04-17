import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { slug: string; label: string }) => void;
  isPending: boolean;
}

export function CreateCardDialog({ open, onOpenChange, onCreate, isPending }: Props) {
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");

  const handleSubmit = () => {
    const cleanLabel = label.trim();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();

    if (!cleanLabel) {
      toast.error("Informe uma etiqueta para identificar o cartão.");
      return;
    }
    if (cleanLabel.length > 60) {
      toast.error("A etiqueta deve ter no máximo 60 caracteres.");
      return;
    }
    if (!cleanSlug || cleanSlug.length < 3) {
      toast.error("O endereço deve ter pelo menos 3 caracteres.");
      return;
    }

    onCreate({ slug: cleanSlug, label: cleanLabel });
  };

  // reset when closing
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setLabel("");
      setSlug("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo cartão</DialogTitle>
          <DialogDescription>
            Dê uma identificação ao cartão e escolha um endereço único.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-label">Etiqueta do cartão</Label>
            <Input
              id="card-label"
              placeholder="Ex: Cartão principal, Corporativo, Cruzeiros..."
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Apenas para você identificar o cartão na listagem.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-slug">Endereço público</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                contato.tur.br/
              </span>
              <Input
                id="card-slug"
                placeholder="seu-nome"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
              </>
            ) : (
              "Criar cartão"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
