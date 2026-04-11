import { useState } from "react";
import { BusinessCardCapture } from "./card-capture/BusinessCardCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Loader2, CreditCard, List, Plus, Trash2, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  agente_viagens: "Agente de viagens",
  fornecedor: "Fornecedor",
  cliente: "Cliente",
  outro: "Outro",
};

const TEMP_LABELS: Record<string, string> = {
  quente: "🔥 Quente",
  morno: "🟡 Morno",
  frio: "🧊 Frio",
};

export function AdminCardCaptureManager() {
  const [tokenHours, setTokenHours] = useState("24");

  // Fetch tokens
  const { data: tokens, refetch: refetchTokens } = useQuery({
    queryKey: ["admin-quick-tokens"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_quick_access_tokens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Fetch recent captures
  const { data: captures } = useQuery({
    queryKey: ["admin-card-captures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_card_captures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const generateToken = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const hours = parseInt(tokenHours) || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("admin_quick_access_tokens").insert({
      user_id: user.user.id,
      expires_at: expiresAt,
    });

    if (error) {
      toast.error("Erro ao gerar token");
      return;
    }

    toast.success("Token gerado com sucesso!");
    refetchTokens();
  };

  const deleteToken = async (id: string) => {
    await supabase.from("admin_quick_access_tokens").delete().eq("id", id);
    refetchTokens();
    toast.success("Token removido");
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/captura-cartao/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="capture">
        <TabsList>
          <TabsTrigger value="capture" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Capturar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <List className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="quick-access" className="gap-2">
            <Link2 className="h-4 w-4" />
            Acesso Rápido
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capture" className="mt-4">
          <BusinessCardCapture />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Capturas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!captures || captures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma captura registrada ainda
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Temp.</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {captures.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.person_name || "—"}</TableCell>
                          <TableCell>{c.company_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {CONTACT_TYPE_LABELS[c.contact_type] || c.contact_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.lead_temperature ? TEMP_LABELS[c.lead_temperature] || c.lead_temperature : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM/yy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-access" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gerar Link de Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gere um link temporário para capturar cartões durante eventos sem precisar fazer login toda hora.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Validade (horas)</Label>
                  <Select value={tokenHours} onValueChange={setTokenHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 horas</SelectItem>
                      <SelectItem value="8">8 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateToken} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Gerar Token
                </Button>
              </div>
            </CardContent>
          </Card>

          {tokens && tokens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tokens Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tokens.map((t: any) => {
                    const expired = new Date(t.expires_at) < new Date();
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono truncate text-muted-foreground">
                            {t.token.substring(0, 16)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expira: {format(new Date(t.expires_at), "dd/MM/yy HH:mm")}
                            {expired && <Badge variant="destructive" className="ml-2 text-[10px]">Expirado</Badge>}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!expired && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(t.token)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/captura-cartao/${t.token}`, "_blank")}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteToken(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
