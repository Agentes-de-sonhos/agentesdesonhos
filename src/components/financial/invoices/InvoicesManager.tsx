import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FileText, Download, Link as LinkIcon, Trash2, DollarSign, Send,
  AlertCircle, CheckCircle2, Wallet, Receipt,
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { RegisterPaymentDialog } from "./RegisterPaymentDialog";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import {
  INVOICE_STATUS_LABELS, INVOICE_PAYMENT_METHODS,
  type Invoice, type InvoiceStatus, type InvoicePayment,
} from "@/types/invoice";
import { useToast } from "@/hooks/use-toast";
import { useAgencyCustomDomain } from "@/hooks/useAgencyCustomDomain";
import { isInMonth } from "@/utils/monthFilter";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export function InvoicesManager({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { customDomain } = useAgencyCustomDomain();
  const { invoices: allInvoices, isLoading, getInvoiceDetail, deleteInvoice, updateInvoiceStatus } = useInvoices();
  const invoices = useMemo(() => {
    if (!viewMonth || !viewYear) return allInvoices;
    return allInvoices.filter(i =>
      isInMonth(i.issue_date, viewMonth, viewYear) ||
      isInMonth(i.due_date, viewMonth, viewYear)
    );
  }, [allInvoices, viewMonth, viewYear]);
  const [openForm, setOpenForm] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [subtab, setSubtab] = useState<"faturas" | "cobrancas" | "recibos">("faturas");
  const [recentPayments, setRecentPayments] = useState<Array<InvoicePayment & { invoice_number?: string; client_name?: string }>>([]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalOpen = 0, totalPaid = 0, totalOverdue = 0;
    let countOpen = 0, countOverdue = 0, countPaid = 0;
    for (const i of invoices) {
      if (i.status === "cancelled") continue;
      totalPaid += i.paid_amount || 0;
      if (i.balance > 0) {
        totalOpen += i.balance;
        countOpen++;
        if (i.due_date && i.due_date < today) {
          totalOverdue += i.balance;
          countOverdue++;
        }
      } else if (i.status === "paid") {
        countPaid++;
      }
    }
    return { totalOpen, totalPaid, totalOverdue, countOpen, countOverdue, countPaid };
  }, [invoices]);

  // Load recent payments when entering "recibos" subtab
  useEffect(() => {
    if (subtab !== "recibos" || !user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("invoice_payments")
        .select("*, invoices(invoice_number, client_name)")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false })
        .limit(100);
      setRecentPayments((data || []).map((p: any) => ({
        ...p,
        invoice_number: p.invoices?.invoice_number,
        client_name: p.invoices?.client_name,
      })));
    })();
  }, [subtab, user, invoices.length]);

  const today = new Date().toISOString().slice(0, 10);
  const baseList = invoices.filter(i =>
    !query ||
    i.invoice_number.toLowerCase().includes(query.toLowerCase()) ||
    i.client_name.toLowerCase().includes(query.toLowerCase()) ||
    (i.destination || "").toLowerCase().includes(query.toLowerCase()),
  );
  const filtered = subtab === "cobrancas"
    ? baseList.filter(i => i.balance > 0 && i.status !== "cancelled")
    : baseList;

  const publicUrl = (inv: Invoice) =>
    inv.public_access_code && inv.agency_slug
      ? (customDomain
          ? `https://${customDomain}/fatura/${inv.public_access_code}`
          : `${window.location.origin}/fatura/${inv.agency_slug}/${inv.public_access_code}`)
      : null;

  const handleDownloadPdf = async (inv: Invoice) => {
    const full = await getInvoiceDetail(inv.id);
    if (!full) return;
    let agency: any = {};
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("name, agency_name, phone, agency_logo_url")
        .eq("user_id", user.id).maybeSingle();
      agency = {
        name: (p as any)?.agency_name || (p as any)?.name,
        phone: (p as any)?.phone,
      };
    }
    await generateInvoicePdf(full, agency, publicUrl(inv) || undefined);
  };

  const handleCopyLink = (inv: Invoice) => {
    const url = publicUrl(inv);
    if (!url) { toast({ title: "Publique a fatura primeiro", variant: "destructive" }); return; }
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  };

  const handlePublish = async (inv: Invoice) => {
    if (inv.status === "draft") {
      await updateInvoiceStatus.mutateAsync({ id: inv.id, status: "sent" });
      toast({ title: "Fatura enviada" });
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="A receber" value={fmt(kpis.totalOpen)} hint={`${kpis.countOpen} fatura(s)`} tone="amber" />
        <KpiCard icon={AlertCircle} label="Em atraso" value={fmt(kpis.totalOverdue)} hint={`${kpis.countOverdue} vencida(s)`} tone="rose" />
        <KpiCard icon={CheckCircle2} label="Recebido" value={fmt(kpis.totalPaid)} hint={`${kpis.countPaid} paga(s)`} tone="emerald" />
        <KpiCard icon={FileText} label="Total emitido" value={String(invoices.length)} hint="faturas no histórico" tone="slate" />
      </div>

      <Tabs value={subtab} onValueChange={(v) => setSubtab(v as any)}>
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          <TabsTrigger value="cobrancas">
            Cobranças
            {kpis.countOpen > 0 && (
              <span className="ml-1.5 bg-amber-200 text-amber-900 rounded-full px-1.5 text-[10px] font-bold">
                {kpis.countOpen}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recibos">Recibos</TabsTrigger>
        </TabsList>

        <TabsContent value="faturas" className="space-y-4 pt-4">
          {renderInvoiceList()}
        </TabsContent>

        <TabsContent value="cobrancas" className="space-y-4 pt-4">
          <p className="text-xs text-muted-foreground">
            Faturas com saldo em aberto. Vencidas aparecem destacadas em vermelho.
          </p>
          {renderInvoiceList()}
        </TabsContent>

        <TabsContent value="recibos" className="space-y-2 pt-4">
          {recentPayments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum recibo registrado ainda.</p>
            </CardContent></Card>
          ) : (
            recentPayments.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.receipt_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {INVOICE_PAYMENT_METHODS[p.method] || p.method}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">
                      {p.client_name || "—"} • Fatura {p.invoice_number || "—"} • {p.payment_date.split("-").reverse().join("/")}
                    </div>
                  </div>
                  <div className="text-right font-semibold text-emerald-600">{fmt(p.amount)}</div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <InvoiceFormDialog open={openForm} onOpenChange={setOpenForm} />

      {payingInvoice && (
        <RegisterPaymentDialog
          invoice={payingInvoice}
          open={!!payingInvoice}
          onOpenChange={(o) => !o && setPayingInvoice(null)}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Pagamentos e parcelas serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmDelete) deleteInvoice.mutate(confirmDelete);
              setConfirmDelete(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderInvoiceList() {
    return (
      <>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por número, cliente ou destino..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex-1" />
        <Button onClick={() => setOpenForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova fatura
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>
            {subtab === "cobrancas"
              ? "Nenhuma cobrança em aberto."
              : 'Nenhuma fatura ainda. Clique em "Nova fatura" para começar.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const isOverdue = inv.due_date && inv.due_date < today && inv.balance > 0 && inv.status !== "cancelled";
            return (
            <Card key={inv.id} className={isOverdue ? "border-rose-300" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{inv.invoice_number}</span>
                    <Badge className={STATUS_COLOR[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    {isOverdue && (
                      <Badge className="bg-rose-100 text-rose-700">Vencida</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {inv.client_name}
                    {inv.destination ? ` • ${inv.destination}` : ""}
                    {inv.due_date ? ` • venc. ${inv.due_date.split("-").reverse().join("/")}` : ""}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="font-semibold">{fmt(inv.total_amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    Saldo: {fmt(inv.balance)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {inv.status === "draft" && (
                    <Button variant="outline" size="sm" onClick={() => handlePublish(inv)} title="Enviar">
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setPayingInvoice(inv)} title="Registrar pagamento">
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv)} title="PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopyLink(inv)} title="Link público">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(inv.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
      </>
    );
  }
}

function KpiCard({
  icon: Icon, label, value, hint, tone,
}: {
  icon: any; label: string; value: string; hint: string;
  tone: "amber" | "rose" | "emerald" | "slate";
}) {
  const toneMap = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
  };
  const iconTone = {
    amber: "text-amber-600",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    slate: "text-slate-600",
  };
  return (
    <Card className={`border ${toneMap[tone]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
          <Icon className={`h-4 w-4 ${iconTone[tone]}`} />
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[11px] opacity-70 mt-0.5">{hint}</div>
      </CardContent>
    </Card>
  );
}