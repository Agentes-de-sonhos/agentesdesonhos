import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Settings2, ExternalLink, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAgencySupplierTerms, type SupplierTerms } from "@/hooks/useAgencySupplierTerms";
import { SupplierTermsDialog } from "./SupplierTermsDialog";

type SupplierRow = {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  owner_agency_id: string | null;
};

const PAYMENT_RULE_LABELS: Record<string, string> = {
  after_sale: "Após a venda",
  after_travel: "Após a viagem",
  after_invoice_issued: "Após emissão NF",
  after_invoice_sent: "Após envio NF",
  manual: "Data manual",
};

function termsSummary(t?: SupplierTerms | null) {
  if (!t) return null;
  const parts: string[] = [];
  if (t.default_commission_type === "percentage" && t.default_commission_percent != null) {
    parts.push(`${t.default_commission_percent}%`);
  } else if (t.default_commission_type === "fixed" && t.default_commission_fixed != null) {
    parts.push(`R$ ${Number(t.default_commission_fixed).toFixed(2)}`);
  }
  if (t.payment_rule) parts.push(PAYMENT_RULE_LABELS[t.payment_rule] || t.payment_rule);
  if (t.requires_invoice) parts.push("NF obrigatória");
  return parts.join(" • ") || null;
}

export function SuppliersManager() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ operatorId: string; operatorName: string } | null>(null);

  const { data: termsData } = useAgencySupplierTerms();

  // Suppliers visible to this agency: global (owner null) + their own + any referenced via operator_id
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["my_suppliers", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // 1) suppliers the agency owns (any status — they see their own)
      const ownedQ = supabase
        .from("tour_operators")
        .select("id, name, category, logo_url, owner_agency_id")
        .eq("owner_agency_id", user!.id);

      // 2) suppliers referenced by this agency's sale_products
      const referencedQ = supabase
        .from("sale_products")
        .select("operator_id")
        .eq("user_id", user!.id)
        .not("operator_id", "is", null);

      // 3) suppliers with configured terms
      const termsQ = supabase
        .from("agency_supplier_terms")
        .select("operator_id")
        .eq("agency_id", user!.id);

      const [owned, refs, terms] = await Promise.all([ownedQ, referencedQ, termsQ]);
      if (owned.error) throw owned.error;
      if (refs.error) throw refs.error;
      if (terms.error) throw terms.error;

      const refIds = new Set<string>();
      (refs.data || []).forEach((r: any) => r.operator_id && refIds.add(r.operator_id));
      (terms.data || []).forEach((r: any) => r.operator_id && refIds.add(r.operator_id));
      // Remove already-owned ids
      (owned.data || []).forEach((r: any) => refIds.delete(r.id));

      let referenced: SupplierRow[] = [];
      if (refIds.size > 0) {
        const { data, error } = await supabase
          .from("tour_operators")
          .select("id, name, category, logo_url, owner_agency_id")
          .in("id", Array.from(refIds));
        if (error) throw error;
        referenced = (data || []) as SupplierRow[];
      }

      const combined: SupplierRow[] = [...(owned.data || []) as SupplierRow[], ...referenced];
      // Dedup
      const seen = new Set<string>();
      const dedup = combined.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
      dedup.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return dedup;
    },
  });

  const filtered = useMemo(() => {
    const list = suppliers || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q));
  }, [suppliers, search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Meus Fornecedores</h3>
              <p className="text-sm text-muted-foreground">
                Configure regras comerciais por fornecedor para auto-preencher a Gestão Financeira.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar fornecedor"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">Nenhum fornecedor encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vincule fornecedores ao cadastrar vendas, orçamentos ou serviços da Carteira Digital,
              ou cadastre seus próprios fornecedores no Mapa do Turismo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Regras configuradas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const terms = termsData?.byOperator.get(s.id) || null;
                  const isOwn = s.owner_agency_id === user?.id;
                  const summary = termsSummary(terms);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.logo_url ? (
                            <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-muted" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted" />
                          )}
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.category || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={isOwn ? "secondary" : "outline"} className="text-xs">
                          {isOwn ? "Minha agência" : "Global"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {terms ? (
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-muted-foreground">{summary || "Configurado"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Não configurado
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/mapa-turismo/operadora/${s.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant={terms ? "outline" : "default"}
                            size="sm"
                            onClick={() => setEditing({ operatorId: s.id, operatorName: s.name })}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            {terms ? "Editar regras" : "Configurar regras"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editing && (
        <SupplierTermsDialog
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          operatorId={editing.operatorId}
          operatorName={editing.operatorName}
          existing={termsData?.byOperator.get(editing.operatorId) || null}
        />
      )}
    </div>
  );
}