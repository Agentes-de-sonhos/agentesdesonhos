import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, RefreshCw, Send, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SupplierCombobox } from "./SupplierCombobox";

const CATEGORIES = [
  "Promocional",
  "Operadoras de turismo",
  "Companhias aéreas",
  "Hospedagem",
  "Cruzeiros",
  "Receptivos",
  "Parques e atrações",
  "Seguros viagem",
];

interface PendingChat {
  chat_id: number;
  chat_title: string | null;
  chat_type: string | null;
  message_count: number;
  last_seen_at: string;
}

interface Channel {
  id: string;
  chat_id: number;
  chat_title: string | null;
  supplier_id: string;
  category_default: string;
  is_active: boolean;
  created_at: string;
  tour_operators?: { name: string; logo_url: string | null } | null;
}

export function AdminTelegramManager() {
  const qc = useQueryClient();
  const [setupLoading, setSetupLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  const { data: pending = [] } = useQuery({
    queryKey: ["telegram-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_pending_chats")
        .select("*")
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PendingChat[];
    },
    refetchInterval: 10000,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["telegram-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_supplier_channels")
        .select("*, tour_operators(name, logo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Channel[];
    },
  });

  const callSetup = async (action: "register" | "info" | "delete" | "me") => {
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-setup", {
        body: { action },
      });
      if (error) throw error;
      if (action === "info" || action === "me") setWebhookInfo(data);
      if (action === "register") {
        toast.success("Webhook registrado no Telegram");
        setWebhookInfo(data);
      }
      if (action === "delete") {
        toast.success("Webhook removido");
        setWebhookInfo(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao configurar Telegram");
    } finally {
      setSetupLoading(false);
    }
  };

  const linkPending = useMutation({
    mutationFn: async ({ chat_id, chat_title, supplier_id, category_default }: {
      chat_id: number; chat_title: string | null; supplier_id: string; category_default: string;
    }) => {
      const { error } = await supabase.from("telegram_supplier_channels").insert({
        chat_id, chat_title, supplier_id, category_default,
      });
      if (error) throw error;
      await supabase.from("telegram_pending_chats").delete().eq("chat_id", chat_id);
    },
    onSuccess: () => {
      toast.success("Canal vinculado ao fornecedor");
      qc.invalidateQueries({ queryKey: ["telegram-pending"] });
      qc.invalidateQueries({ queryKey: ["telegram-channels"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao vincular"),
  });

  const updateChannel = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Channel>) => {
      const { error } = await supabase.from("telegram_supplier_channels").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-channels"] }),
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("telegram_supplier_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canal removido");
      qc.invalidateQueries({ queryKey: ["telegram-channels"] });
    },
  });

  const dismissPending = useMutation({
    mutationFn: async (chat_id: number) => {
      const { error } = await supabase.from("telegram_pending_chats").delete().eq("chat_id", chat_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-pending"] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Canais Telegram → Galeria de Materiais
          </CardTitle>
          <CardDescription>
            Conecte canais e grupos do Telegram. Quando um fornecedor postar uma lâmina ou PDF,
            o material é salvo automaticamente na pasta correta da Galeria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p className="font-medium">Como configurar (passo a passo):</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Crie um bot no Telegram conversando com <strong>@BotFather</strong> e copie o token.</li>
              <li>Cole esse token na conexão "Telegram" do Lovable (já está conectada).</li>
              <li>Clique em <strong>"Registrar webhook"</strong> abaixo.</li>
              <li>Adicione o bot como <strong>administrador</strong> em cada canal/grupo de fornecedor.</li>
              <li>Quando o fornecedor postar, o canal aparece em "Canais aguardando vínculo" — vincule-o ao fornecedor correto.</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => callSetup("register")} disabled={setupLoading}>
              {setupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              Registrar webhook
            </Button>
            <Button variant="outline" onClick={() => callSetup("info")} disabled={setupLoading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Verificar status
            </Button>
            <Button variant="outline" onClick={() => callSetup("me")} disabled={setupLoading}>
              Identificar bot
            </Button>
            <Button variant="ghost" onClick={() => callSetup("delete")} disabled={setupLoading}>
              Remover webhook
            </Button>
          </div>

          {webhookInfo && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
              {JSON.stringify(webhookInfo, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Canais aguardando vínculo
            {pending.length > 0 && <Badge variant="destructive">{pending.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Canais/grupos que enviaram mensagens mas ainda não foram vinculados a um fornecedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum canal pendente. Adicione o bot a um canal e poste uma mensagem para que ele apareça aqui.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <PendingChatRow
                  key={p.chat_id}
                  chat={p}
                  onLink={(supplier_id, category_default) =>
                    linkPending.mutate({
                      chat_id: p.chat_id,
                      chat_title: p.chat_title,
                      supplier_id,
                      category_default,
                    })
                  }
                  onDismiss={() => dismissPending.mutate(p.chat_id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Canais conectados ({channels.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum canal vinculado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.chat_title || `Chat ${c.chat_id}`}</div>
                      <div className="text-xs text-muted-foreground">ID: {c.chat_id}</div>
                    </TableCell>
                    <TableCell>{c.tour_operators?.name || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={c.category_default}
                        onValueChange={(v) => updateChannel.mutate({ id: c.id, category_default: v })}
                      >
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) => updateChannel.mutate({ id: c.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => deleteChannel.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingChatRow({
  chat, onLink, onDismiss,
}: {
  chat: PendingChat;
  onLink: (supplier_id: string, category_default: string) => void;
  onDismiss: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [category, setCategory] = useState("Promocional");

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{chat.chat_title || `Chat ${chat.chat_id}`}</div>
        <div className="text-xs text-muted-foreground">
          Tipo: {chat.chat_type || "—"} · {chat.message_count} mensagens · ID: {chat.chat_id}
        </div>
      </div>
      <div className="w-full md:w-64">
        <SupplierCombobox
          value={supplierId}
          supplierName={supplierName}
          onChange={(id, name) => { setSupplierId(id); setSupplierName(name); }}
        />
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        disabled={!supplierId}
        onClick={() => onLink(supplierId, category)}
      >
        Vincular
      </Button>
      <Button variant="ghost" size="icon" onClick={onDismiss}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}