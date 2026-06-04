import { Card, CardContent } from "@/components/ui/card";
import { CommissionReceivable } from "@/hooks/useCommissionsReceivable";
import {
  DollarSign, CheckCircle, Clock, AlertTriangle, FileText, CalendarClock,
} from "lucide-react";
import {
  fmt, isActive, isOverdue, isDueWithin, requiresInvoicePending,
} from "./utils";

export function EnhancedSummary({ commissions }: { commissions: CommissionReceivable[] }) {
  const active = commissions.filter(isActive);

  const prevista = active.reduce((s, c) => s + c.commission_amount, 0);
  const recebida = active.reduce((s, c) => s + (Number(c.received_amount) || 0), 0);
  const pendente = Math.max(prevista - recebida, 0);

  const atrasadas = active.filter(isOverdue);
  const atrasadasValor = atrasadas.reduce((s, c) => s + c.commission_amount, 0);

  const nfPendentes = active.filter(requiresInvoicePending);
  const due7 = active.filter(c => isDueWithin(c, 7));
  const due15 = active.filter(c => isDueWithin(c, 15));
  const due30 = active.filter(c => isDueWithin(c, 30));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI icon={DollarSign} color="text-violet-600 dark:text-violet-400" label="Comissão Prevista" value={`R$ ${fmt(prevista)}`} />
        <KPI icon={CheckCircle} color="text-emerald-600 dark:text-emerald-400" label="Comissão Recebida" value={`R$ ${fmt(recebida)}`} />
        <KPI icon={Clock} color="text-blue-600 dark:text-blue-400" label="Comissão Pendente" value={`R$ ${fmt(pendente)}`} />
        <KPI icon={AlertTriangle} color="text-red-600 dark:text-red-400" label="Atrasados" value={`R$ ${fmt(atrasadasValor)}`} hint={`${atrasadas.length} recebimentos`} />
        <KPI icon={FileText} color="text-amber-600 dark:text-amber-400" label="NF Pendentes" value={`${nfPendentes.length}`} hint="Aguardando emissão/envio" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Recebimentos Próximos</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ProximoBlock label="Próximos 7 dias" items={due7} />
            <ProximoBlock label="Próximos 15 dias" items={due15} />
            <ProximoBlock label="Próximos 30 dias" items={due30} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, color, label, value, hint }: { icon: any; color: string; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ProximoBlock({ label, items }: { label: string; items: CommissionReceivable[] }) {
  const total = items.reduce((s, c) => s + c.commission_amount, 0);
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-bold text-foreground mt-1">R$ {fmt(total)}</p>
      <p className="text-[11px] text-muted-foreground">{items.length} recebimento(s)</p>
    </div>
  );
}