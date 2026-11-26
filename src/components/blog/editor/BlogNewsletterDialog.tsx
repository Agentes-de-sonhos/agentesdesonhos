import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail } from "lucide-react";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/types/crm";

const ORDER: ClientStatus[] = ["fidelizado", "cliente_ativo", "em_negociacao", "lead"];

interface Preview {
  counts: Record<ClientStatus, number>;
  sender: string;
  own_domain: boolean;
  has_site: boolean;
  previous: { statuses: string[]; sent: number; created_at: string }[];
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("blog-newsletter", { body });
  if (error) {
    let msg = "Não foi possível concluir agora.";
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json())?.error ?? msg; } catch { /* mantém padrão */ }
    }
    throw new Error(msg);
  }
  return data;
}

export function BlogNewsletterDialog({ postId, title, open, onOpenChange }: { postId: string; title: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<ClientStatus[]>(["fidelizado", "cliente_ativo"]);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setSubject(`Novo no blog: ${title}`.slice(0, 150));
    call({ mode: "preview", post_id: postId }).then(setPreview).catch((e) => { toast.error(e.message); onOpenChange(false); });
  }, [open, postId, title, onOpenChange]);

  const total = preview ? selected.reduce((n, s) => n + (preview.counts[s] ?? 0), 0) : 0;
  const toggle = (s: ClientStatus) => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const send = async () => {
    setBusy(true);
    try {
      const r = await call({ mode: "send", post_id: postId, statuses: selected, subject });
      toast.success(`E-mail enviado para ${r.sent} cliente(s).`);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar artigo aos clientes</DialogTitle>
          <DialogDescription>Os clientes recebem um e-mail com o título, o resumo e o botão para ler o artigo no site.</DialogDescription>
        </DialogHeader>
        {!preview ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Quem vai receber</Label>
              {ORDER.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox checked={selected.includes(s)} onCheckedChange={() => toggle(s)} />
                  <span className="flex-1 text-sm">{CLIENT_STATUS_LABELS[s]}</span>
                  <span className="text-xs text-muted-foreground">{preview.counts[s] ?? 0} com e-mail</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-subject">Assunto</Label>
              <Input id="nl-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Remetente: <strong>{preview.sender}</strong>
              {!preview.own_domain && " — quando o domínio da agência for verificado para envio, o e-mail passa a sair por ele automaticamente."}
              {" "}As respostas chegam no e-mail da agência.
            </p>
            {!preview.has_site && <p className="text-xs text-destructive">A agência precisa de um site ativo para o link do artigo.</p>}
            {preview.previous.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Já enviado: {preview.previous.map((p) => `${new Date(p.created_at).toLocaleDateString("pt-BR")} (${p.sent})`).join(", ")}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={send} disabled={!preview || busy || total === 0 || !preview.has_site || !subject.trim()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Enviar para {total} cliente(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
