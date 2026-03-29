import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ship, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CompanhiaMaritima, Regiao, PerfilCliente } from "@/types/cruises";

const TIPOS = ["Oceanico", "Fluvial", "Expedicao"];
const CATEGORIAS = ["Luxo", "Premium", "Contemporaneo"];

export function AdminCruisesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanhiaMaritima | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Oceanico");
  const [categoria, setCategoria] = useState("Contemporaneo");
  const [subtipo, setSubtipo] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedRegioes, setSelectedRegioes] = useState<string[]>([]);
  const [selectedPerfis, setSelectedPerfis] = useState<string[]>([]);
  const [newRegiaoName, setNewRegiaoName] = useState("");
  const [newPerfilName, setNewPerfilName] = useState("");

  // Fetch all companies (including inactive for admin)
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-companhias-maritimas"],
    queryFn: async (): Promise<CompanhiaMaritima[]> => {
      const { data: comps, error } = await supabase
        .from("companhias_maritimas")
        .select("*")
        .order("nome");
      if (error) throw error;

      const { data: regLinks } = await supabase
        .from("companhias_maritimas_regioes")
        .select("companhia_id, regiao_id, regioes(id, nome, slug, ordem_exibicao, ativo)");
      const { data: profLinks } = await supabase
        .from("companhias_maritimas_perfis")
        .select("companhia_id, perfil_id, perfis_cliente(id, nome, slug, ordem_exibicao, ativo)");

      const regMap = new Map<string, Regiao[]>();
      (regLinks || []).forEach((l: any) => {
        if (!l.regioes) return;
        const arr = regMap.get(l.companhia_id) || [];
        arr.push(l.regioes);
        regMap.set(l.companhia_id, arr);
      });

      const profMap = new Map<string, PerfilCliente[]>();
      (profLinks || []).forEach((l: any) => {
        if (!l.perfis_cliente) return;
        const arr = profMap.get(l.companhia_id) || [];
        arr.push(l.perfis_cliente);
        profMap.set(l.companhia_id, arr);
      });

      return (comps || []).map((c: any) => ({
        ...c,
        regioes: regMap.get(c.id) || [],
        perfis: profMap.get(c.id) || [],
      }));
    },
  });

  const { data: regioes = [] } = useQuery({
    queryKey: ["regioes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regioes").select("*").order("ordem_exibicao");
      if (error) throw error;
      return data as Regiao[];
    },
  });

  const { data: perfis = [] } = useQuery({
    queryKey: ["perfis-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfis_cliente").select("*").order("ordem_exibicao");
      if (error) throw error;
      return data as PerfilCliente[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const companyData = { nome, tipo, categoria, subtipo: subtipo || null, website: website || null };

      let companyId = editing?.id;
      if (companyId) {
        const { error } = await supabase.from("companhias_maritimas").update(companyData).eq("id", companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("companhias_maritimas").insert(companyData).select("id").single();
        if (error) throw error;
        companyId = data.id;
      }

      // Sync relations
      await supabase.from("companhias_maritimas_regioes").delete().eq("companhia_id", companyId!);
      if (selectedRegioes.length > 0) {
        await supabase.from("companhias_maritimas_regioes")
          .insert(selectedRegioes.map((r) => ({ companhia_id: companyId!, regiao_id: r })));
      }
      await supabase.from("companhias_maritimas_perfis").delete().eq("companhia_id", companyId!);
      if (selectedPerfis.length > 0) {
        await supabase.from("companhias_maritimas_perfis")
          .insert(selectedPerfis.map((p) => ({ companhia_id: companyId!, perfil_id: p })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companhias-maritimas"] });
      queryClient.invalidateQueries({ queryKey: ["companhias-maritimas"] });
      toast.success(editing ? "Companhia atualizada!" : "Companhia criada!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companhias_maritimas").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companhias-maritimas"] });
      queryClient.invalidateQueries({ queryKey: ["companhias-maritimas"] });
      toast.success("Companhia desativada!");
    },
  });

  const addRegiaoMutation = useMutation({
    mutationFn: async () => {
      const slug = newRegiaoName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("regioes").insert({ nome: newRegiaoName, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regioes-all"] });
      queryClient.invalidateQueries({ queryKey: ["regioes"] });
      setNewRegiaoName("");
      toast.success("Região adicionada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addPerfilMutation = useMutation({
    mutationFn: async () => {
      const slug = newPerfilName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("perfis_cliente").insert({ nome: newPerfilName, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-all"] });
      queryClient.invalidateQueries({ queryKey: ["perfis-cliente"] });
      setNewPerfilName("");
      toast.success("Perfil adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditing(null);
    setNome("");
    setTipo("Oceanico");
    setCategoria("Contemporaneo");
    setSubtipo("");
    setWebsite("");
    setSelectedRegioes([]);
    setSelectedPerfis([]);
    setDialogOpen(false);
  };

  const openEdit = (c: CompanhiaMaritima) => {
    setEditing(c);
    setNome(c.nome);
    setTipo(c.tipo);
    setCategoria(c.categoria);
    setSubtipo(c.subtipo || "");
    setWebsite(c.website || "");
    setSelectedRegioes(c.regioes.map((r) => r.id));
    setSelectedPerfis(c.perfis.map((p) => p.id));
    setDialogOpen(true);
  };

  const activeCompanies = companies.filter((c) => c.ativo);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ship className="h-5 w-5" />
          Companhias Marítimas ({activeCompanies.length})
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Companhia</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Companhia" : "Nova Companhia Marítima"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: MSC Cruzeiros" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t === "Expedicao" ? "Expedição" : t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c === "Contemporaneo" ? "Contemporâneo" : c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subtipo</Label>
                  <Input value={subtipo} onChange={(e) => setSubtipo(e.target.value)} placeholder="Ex: Boutique" />
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>

              {/* Regiões */}
              <div>
                <Label className="mb-2 block">Regiões</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {regioes.map((r) => {
                    const selected = selectedRegioes.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRegioes((prev) => selected ? prev.filter((id) => id !== r.id) : [...prev, r.id])}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border transition-all",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:border-border"
                        )}
                      >
                        {r.nome} {selected && <X className="h-3 w-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input value={newRegiaoName} onChange={(e) => setNewRegiaoName(e.target.value)} placeholder="Nova região..." className="flex-1 h-8 text-sm" />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addRegiaoMutation.mutate()} disabled={!newRegiaoName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Perfis */}
              <div>
                <Label className="mb-2 block">Perfis de Cliente</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {perfis.map((p) => {
                    const selected = selectedPerfis.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPerfis((prev) => selected ? prev.filter((id) => id !== p.id) : [...prev, p.id])}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border transition-all",
                          selected ? "bg-accent text-accent-foreground border-accent" : "bg-muted text-muted-foreground border-transparent hover:border-border"
                        )}
                      >
                        {p.nome} {selected && <X className="h-3 w-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input value={newPerfilName} onChange={(e) => setNewPerfilName(e.target.value)} placeholder="Novo perfil..." className="flex-1 h-8 text-sm" />
                  <Button size="sm" variant="outline" className="h-8" onClick={() => addPerfilMutation.mutate()} disabled={!newPerfilName.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={!nome.trim() || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? "Salvar Alterações" : "Criar Companhia"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {activeCompanies.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <Ship className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.nome}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.categoria}</Badge>
                    {c.regioes.slice(0, 3).map((r) => (
                      <Badge key={r.id} variant="secondary" className="text-[10px]">{r.nome}</Badge>
                    ))}
                    {c.regioes.length > 3 && <Badge variant="secondary" className="text-[10px]">+{c.regioes.length - 3}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
