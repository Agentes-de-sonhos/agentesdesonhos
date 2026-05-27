import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClients, useOpportunities } from "@/hooks/useCRM";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/lib/validators";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddClientDialog({ open, onOpenChange }: Props) {
  const { clients, createClient } = useClients();
  const { createOpportunity } = useOpportunities();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDup, setConfirmDup] = useState<{ msg: string } | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSubmitting(false);
    setConfirmDup(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const findDuplicate = () => {
    const emailNorm = email.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");
    return clients.find((c) => {
      if (emailNorm && c.email && c.email.toLowerCase() === emailNorm) return true;
      if (phoneDigits && c.phone && c.phone.replace(/\D/g, "") === phoneDigits) return true;
      return false;
    });
  };

  const doCreate = async () => {
    setSubmitting(true);
    try {
      const client = await createClient({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status: "lead",
      });
      if (!client?.id) throw new Error("Falha ao criar cliente");
      await createOpportunity({
        client_id: client.id,
        destination: "A definir",
        passengers_count: 1,
        adults_count: 1,
        children_count: 0,
        estimated_value: 0,
      });
      toast({ title: "Cliente adicionado ao funil" });
      handleClose(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, phone });
    if (!parsed.success) {
      toast({
        title: "Dados inválidos",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }
    const dup = findDuplicate();
    if (dup) {
      setConfirmDup({
        msg: `Já existe um cliente (${dup.name}) com este e-mail ou telefone. Deseja continuar mesmo assim?`,
      });
      return;
    }
    await doCreate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar novo cliente</DialogTitle>
            <DialogDescription>
              Cadastro rápido. O cliente entra direto no funil em "Novo Contato".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qac-name">Nome *</Label>
              <Input
                id="qac-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente"
                autoFocus
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qac-phone">WhatsApp / Telefone</Label>
              <Input
                id="qac-phone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qac-email">E-mail</Label>
              <Input
                id="qac-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                maxLength={255}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Adicionar ao funil
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDup} onOpenChange={(o) => !o && setConfirmDup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possível duplicidade</AlertDialogTitle>
            <AlertDialogDescription>{confirmDup?.msg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmDup(null);
                await doCreate();
              }}
            >
              Continuar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
