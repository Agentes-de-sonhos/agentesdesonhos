import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BENEFIT_CATEGORIES } from "@/types/benefits";
import { useState } from "react";
import { RichContentEditor } from "@/components/operator/RichContentEditor";
import { DestinationCombobox } from "@/components/benefits/DestinationCombobox";

interface ShareBenefitDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ShareBenefitDialog({ open, onClose, onSubmit, isSubmitting }: ShareBenefitDialogProps) {
  const [form, setForm] = useState({
    company_name: "",
    title: "",
    destination: "",
    category: "outros",
    how_to_claim: "",
    tags: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.title.trim()) return;
    onSubmit({
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    });
    setForm({ company_name: "", title: "", destination: "", category: "outros", how_to_claim: "", tags: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Benefício</DialogTitle>
          <DialogDescription>Compartilhe um benefício ou desconto que você descobriu com a comunidade.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome da empresa *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BENEFIT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Título do benefício *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Destino</Label>
            <DestinationCombobox
              value={form.destination}
              onChange={(v) => setForm({ ...form, destination: v })}
            />
            <p className="text-[11px] text-muted-foreground">
              Digite para buscar destinos já cadastrados ou criar um novo.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Como solicitar</Label>
            <p className="text-xs text-muted-foreground">
              Use formatação livre: títulos, negrito, listas, cores, links e botões.
            </p>
            <div className="-mx-4">
              <RichContentEditor
                content={form.how_to_claim}
                onChange={(html) => setForm({ ...form, how_to_claim: html })}
                placeholder="💡 Cole uma URL sozinha em uma linha para virar um botão de acesso destacado."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cortesia, tarifa net, famtrip..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>Compartilhar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
