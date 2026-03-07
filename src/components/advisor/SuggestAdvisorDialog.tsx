import { useState } from "react";
import { PlusCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitAdvisorSuggestion, AdvisorType } from "@/hooks/useAdvisorSuggestions";
import { toast } from "sonner";

const LABELS: Record<AdvisorType, { title: string; namePlaceholder: string; successMsg: string }> = {
  dining: {
    title: "Sugerir novo restaurante",
    namePlaceholder: "Ex: Peter Luger Steak House",
    successMsg: "Sugestão de restaurante enviada para análise!",
  },
  attraction: {
    title: "Sugerir nova atração",
    namePlaceholder: "Ex: Top of the Rock",
    successMsg: "Sugestão de atração enviada para análise!",
  },
  shopping: {
    title: "Sugerir nova opção de compras",
    namePlaceholder: "Ex: Woodbury Common Premium Outlets",
    successMsg: "Sugestão de compras enviada para análise!",
  },
  experience: {
    title: "Sugerir nova experiência",
    namePlaceholder: "Ex: Passeio de helicóptero sobre Manhattan",
    successMsg: "Sugestão de experiência enviada para análise!",
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorType: AdvisorType;
}

export function SuggestAdvisorDialog({ open, onOpenChange, advisorType }: Props) {
  const labels = LABELS[advisorType];
  const [form, setForm] = useState({
    name: "",
    destination: "",
    city: "",
    neighborhood: "",
    category: "",
    reason: "",
  });
  const submit = useSubmitAdvisorSuggestion();

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.destination.trim() || !form.reason.trim()) {
      toast.error("Preencha ao menos o nome, destino e motivo.");
      return;
    }
    submit.mutate(
      {
        advisorType,
        name: form.name.trim(),
        destination: form.destination.trim(),
        city: form.city.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        category: form.category.trim() || undefined,
        reason: form.reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success(labels.successMsg);
          setForm({ name: "", destination: "", city: "", neighborhood: "", category: "", reason: "" });
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao enviar sugestão."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            {labels.title}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo. Sua sugestão será analisada pelo administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={labels.namePlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label>Destino *</Label>
              <Input value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Ex: New York" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Ex: New York" />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro / Localização</Label>
              <Input value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="Ex: Manhattan" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Ex: Museu, Steakhouse, Outlet..." />
          </div>
          <div className="space-y-1.5">
            <Label>Por que você recomenda? *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Compartilhe sua experiência e motivos para adicionar..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Enviando..." : "Enviar sugestão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
