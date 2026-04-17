import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";

interface CreateSupplierAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  onSuccess?: () => void;
}

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  const rnd = new Uint32Array(length);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < length; i++) result += chars[rnd[i] % chars.length];
  return result;
}

export function CreateSupplierAccountDialog({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  onSuccess,
}: CreateSupplierAccountDialogProps) {
  const [email, setEmail] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-link-supplier-account", {
        body: {
          operator_id: operatorId,
          email: email.trim().toLowerCase(),
          password,
          responsible_name: responsibleName.trim() || operatorName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Conta de fornecedor criada e vinculada!");
      setCreatedCredentials({ email: email.trim().toLowerCase(), password });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `Olá! Sua conta de fornecedor em Agentes de Sonhos foi criada.\n\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}\n\nAcesse: https://app.agentesdesonhos.com.br/auth\nApós entrar, você será direcionado para editar o perfil da empresa.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credenciais copiadas!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setEmail("");
    setResponsibleName("");
    setPassword(generatePassword());
    setCreatedCredentials(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar acesso de fornecedor</DialogTitle>
          <DialogDescription>
            Vincular uma nova conta à operadora <strong>{operatorName}</strong>. O fornecedor poderá editar apenas o próprio perfil.
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" /> Conta criada com sucesso
              </div>
              <div><span className="text-muted-foreground">E-mail:</span> <span className="font-mono">{createdCredentials.email}</span></div>
              <div><span className="text-muted-foreground">Senha:</span> <span className="font-mono">{createdCredentials.password}</span></div>
            </div>
            <Button onClick={handleCopyCredentials} className="w-full" variant="secondary">
              {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar mensagem para enviar"}
            </Button>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier-email">E-mail de acesso *</Label>
              <Input
                id="supplier-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="supplier-name">Nome do responsável (opcional)</Label>
              <Input
                id="supplier-name"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder={operatorName}
              />
            </div>
            <div>
              <Label htmlFor="supplier-password">Senha *</Label>
              <div className="flex gap-2">
                <Input
                  id="supplier-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres. Você poderá copiar e enviar ao fornecedor.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar e vincular
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
