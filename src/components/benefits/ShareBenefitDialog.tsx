import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BENEFIT_CATEGORIES, BENEFIT_DESTINATIONS } from "@/types/benefits";
import { useState } from "react";
import { RichContentEditor } from "@/components/operator/RichContentEditor";

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
    short_description: "",
    full_description: "",
    destination: "",
    category: "outro",
    requirements: "",
    how_to_claim: "",
    official_link: "",
    tags: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.title.trim()) return;
    onSubmit({
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    });
    setForm({ company_name: "", title: "", short_description: "", full_description: "", destination: "", category: "outro", requirements: "", how_to_claim: "", official_link: "", tags: "" });
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
            <Label>Descrição curta</Label>
            <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={form.destination} onValueChange={(v) => setForm({ ...form, destination: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {BENEFIT_DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link oficial</Label>
              <Input value={form.official_link} onChange={(e) => setForm({ ...form, official_link: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Requisitos</Label>
            <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Ex: Cadastur ativo, IATA válida..." />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo do benefício</Label>
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
