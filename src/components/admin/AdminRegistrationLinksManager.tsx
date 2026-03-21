import { useState } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Copy, Loader2, Link2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AdminRegistrationLinksManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newLink, setNewLink] = useState({
    plan: "profissional",
    role: "agente",
    max_uses: 1,
    expires_at: "",
    notes: "",
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["registration-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        plan: newLink.plan,
        role: newLink.role,
        max_uses: newLink.max_uses,
        notes: newLink.notes || null,
        created_by: user?.id,
      };
      if (newLink.expires_at) {
        payload.expires_at = new Date(newLink.expires_at).toISOString();
      }
      const { error } = await supabase.from("registration_links").insert([payload as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-links"] });
      toast({ title: "Link gerado com sucesso!" });
      setShowForm(false);
      setNewLink({ plan: "profissional", role: "agente", max_uses: 1, expires_at: "", notes: "" });
    },
    onError: () => {
      toast({ title: "Erro ao gerar link", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registration_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-links"] });
      toast({ title: "Link removido" });
    },
  });

  function getStatus(link: { uses_count: number; max_uses: number; expires_at: string | null }) {
    if (link.uses_count >= link.max_uses) return { label: "Utilizado", variant: "secondary" as const };
    if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: "Expirado", variant: "destructive" as const };
    return { label: "Ativo", variant: "default" as const };
  }

  function copyLink(token: string) {
    const url = `${PUBLIC_DOMAIN}/cadastro/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  }

  const planLabels: Record<string, string> = {
    profissional: "Fundador",
    essencial: "Essencial",
    educa_pass: "Educa Pass",
    cartao_digital: "Cartão Digital",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Links de Cadastro Manual
          </CardTitle>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Gerar Link
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Plano</label>
                    <Select value={newLink.plan} onValueChange={(v) => setNewLink({ ...newLink, plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profissional">Plano Fundador</SelectItem>
                        <SelectItem value="essencial">Plano Essencial</SelectItem>
                        <SelectItem value="educa_pass">Educa Pass</SelectItem>
                        <SelectItem value="cartao_digital">Cartão Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo de Acesso</label>
                    <Select value={newLink.role} onValueChange={(v) => setNewLink({ ...newLink, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agente">Agente</SelectItem>
                        <SelectItem value="promotor">Promotor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Limite de usos</label>
                    <Input
                      type="number"
                      min={1}
                      value={newLink.max_uses}
                      onChange={(e) => setNewLink({ ...newLink, max_uses: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expira em (opcional)</label>
                    <Input
                      type="datetime-local"
                      value={newLink.expires_at}
                      onChange={(e) => setNewLink({ ...newLink, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Observações (opcional)</label>
                  <Input
                    value={newLink.notes}
                    onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
                    placeholder="Ex: Pagamento via PIX - Cliente João"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Gerar Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !links?.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhum link gerado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const status = getStatus(link);
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{planLabels[link.plan] || link.plan}</TableCell>
                      <TableCell className="capitalize">{link.role}</TableCell>
                      <TableCell>{link.uses_count}/{link.max_uses}</TableCell>
                      <TableCell>{format(new Date(link.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {link.expires_at
                          ? format(new Date(link.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{link.notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyLink(link.token)}
                            disabled={status.label !== "Ativo"}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(link.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
