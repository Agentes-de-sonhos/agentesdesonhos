import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommissionReceivable } from "@/hooks/useCommissionsReceivable";
import { Trophy, TrendingUp, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  fmt, isActive, isOverdue, isReceived, PRODUCT_LABEL, requiresInvoicePending,
} from "./utils";

interface SupplierAgg {
  name: string;
  totalVendido: number;
  comissaoPrevista: number;
  comissaoRecebida: number;
  comissaoPendente: number;
  qtdVendas: number;
  qtdProdutos: number;
  qtdAtrasados: number;
  valorAtrasado: number;
  qtdNFPendente: number;
  avgPrazoDias: number;
  items: CommissionReceivable[];
}

function aggregate(commissions: CommissionReceivable[]): SupplierAgg[] {
  const map = new Map<string, SupplierAgg>();
  const sales = new Map<string, Set<string>>();
  const prazos = new Map<string, number[]>();

  commissions.filter(isActive).forEach(c => {
    const name = c.supplier_name || "Sem fornecedor";
    if (!map.has(name)) {
      map.set(name, {
        name, totalVendido: 0, comissaoPrevista: 0, comissaoRecebida: 0, comissaoPendente: 0,
        qtdVendas: 0, qtdProdutos: 0, qtdAtrasados: 0, valorAtrasado: 0, qtdNFPendente: 0,
        avgPrazoDias: 0, items: [],
      });
      sales.set(name, new Set());
      prazos.set(name, []);
    }
    const agg = map.get(name)!;
    agg.totalVendido += Number(c.sale_price) || 0;
    agg.comissaoPrevista += c.commission_amount;
    if (isReceived(c)) {
      agg.comissaoRecebida += c.commission_amount;
      if (c.sale_date && c.received_date) {
        const diff = (new Date(c.received_date + "T00:00:00").getTime() - new Date(c.sale_date + "T00:00:00").getTime()) / 86400000;
        if (diff >= 0) prazos.get(name)!.push(diff);
      }
    }
    agg.qtdProdutos += 1;
    if (isOverdue(c)) { agg.qtdAtrasados += 1; agg.valorAtrasado += c.commission_amount; }
    if (requiresInvoicePending(c)) agg.qtdNFPendente += 1;
    sales.get(name)!.add(c.sale_id);
    agg.items.push(c);
  });

  map.forEach((agg, name) => {
    agg.qtdVendas = sales.get(name)!.size;
    agg.comissaoPendente = Math.max(agg.comissaoPrevista - agg.comissaoRecebida, 0);
    const p = prazos.get(name)!;
    agg.avgPrazoDias = p.length ? Math.round(p.reduce((s, x) => s + x, 0) / p.length) : 0;
  });

  return Array.from(map.values());
}

export function SuppliersRanking({ commissions }: { commissions: CommissionReceivable[] }) {
  const [selected, setSelected] = useState<SupplierAgg | null>(null);
  const aggs = useMemo(() => aggregate(commissions), [commissions]);

  // Exclui agregados sem comissão para não poluir o ranking de Top Fornecedores
  const topComissao = [...aggs].filter(a => a.comissaoPrevista > 0).sort((a, b) => b.comissaoPrevista - a.comissaoPrevista).slice(0, 10);
  const topVendas = [...aggs].filter(a => a.totalVendido > 0).sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 10);
  const topAtraso = [...aggs].filter(a => a.qtdAtrasados > 0).sort((a, b) => b.valorAtrasado - a.valorAtrasado).slice(0, 10);
  const topNF = [...aggs].filter(a => a.qtdNFPendente > 0).sort((a, b) => b.qtdNFPendente - a.qtdNFPendente).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingCard icon={Trophy} color="text-amber-600" title="Maiores Comissões Previstas" rows={topComissao}
          valueFn={(a) => `R$ ${fmt(a.comissaoPrevista)}`} onSelect={setSelected}
          emptyMsg="Cadastre vendas com fornecedores para visualizar o ranking." />
        <RankingCard icon={TrendingUp} color="text-emerald-600" title="Maior Volume de Vendas" rows={topVendas}
          valueFn={(a) => `R$ ${fmt(a.totalVendido)}`} onSelect={setSelected}
          emptyMsg="Nenhuma venda registrada ainda." />
        <RankingCard icon={AlertTriangle} color="text-red-600" title="Mais Recebimentos Atrasados" rows={topAtraso}
          valueFn={(a) => `${a.qtdAtrasados} (R$ ${fmt(a.valorAtrasado)})`} onSelect={setSelected}
          emptyMsg="Nenhum fornecedor com recebimentos em atraso." />
        <RankingCard icon={FileText} color="text-blue-600" title="Mais Notas Fiscais Pendentes" rows={topNF}
          valueFn={(a) => `${a.qtdNFPendente} pendente(s)`} onSelect={setSelected}
          emptyMsg="Nenhuma nota fiscal pendente." />
      </div>

      {selected && (
        <SupplierDetailDialog agg={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function RankingCard({ icon: Icon, color, title, rows, valueFn, onSelect, emptyMsg }: {
  icon: any; color: string; title: string;
  rows: SupplierAgg[];
  valueFn: (a: SupplierAgg) => string;
  onSelect: (a: SupplierAgg) => void;
  emptyMsg?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`h-4 w-4 ${color}`} />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyMsg || "Sem dados"}</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((a, i) => (
              <button key={a.name} onClick={() => onSelect(a)}
                className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition-colors text-left">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] w-6 justify-center">{i + 1}</Badge>
                  <span className="truncate">{a.name}</span>
                </span>
                <span className={`text-xs font-semibold ${color} whitespace-nowrap ml-2`}>{valueFn(a)}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierDetailDialog({ agg, onClose }: { agg: SupplierAgg; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {agg.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Stat label="Total Vendido" value={`R$ ${fmt(agg.totalVendido)}`} />
          <Stat label="Comissão Prevista" value={`R$ ${fmt(agg.comissaoPrevista)}`} />
          <Stat label="Comissão Recebida" value={`R$ ${fmt(agg.comissaoRecebida)}`} color="text-emerald-600" />
          <Stat label="Comissão Pendente" value={`R$ ${fmt(agg.comissaoPendente)}`} color="text-amber-600" />
          <Stat label="Vendas" value={`${agg.qtdVendas}`} />
          <Stat label="Produtos" value={`${agg.qtdProdutos}`} />
          <Stat label="Prazo Médio" value={agg.avgPrazoDias > 0 ? `${agg.avgPrazoDias} dias` : "—"} />
          <Stat label="Atrasados" value={`${agg.qtdAtrasados}`} color={agg.qtdAtrasados ? "text-red-600" : ""} />
        </div>
        <div>
          <h5 className="font-semibold text-sm mb-2">Histórico</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Produto</th>
                  <th className="text-right p-2">Comissão</th>
                  <th className="text-left p-2">Previsão</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {agg.items.map(c => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2">{c.client_name}</td>
                    <td className="p-2">{PRODUCT_LABEL[c.product_type] || c.product_type}</td>
                    <td className="p-2 text-right">R$ {fmt(c.commission_amount)}</td>
                    <td className="p-2">{c.expected_date ? format(new Date(c.expected_date + "T00:00:00"), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-2 capitalize">{(c.status || "").replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${color || ""}`}>{value}</p>
    </div>
  );
}