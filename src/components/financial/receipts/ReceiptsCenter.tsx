import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Download, Eye, Plus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInvoices } from "@/hooks/useInvoices";
import { RegisterPaymentDialog } from "@/components/financial/invoices/RegisterPaymentDialog";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";
import { INVOICE_PAYMENT_METHODS, type Invoice, type InvoicePayment } from "@/types/invoice";
import { isInMonth } from "@/utils/monthFilter";
import { useToast } from "@/hooks/use-toast";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type ReceiptRow = InvoicePayment & {
  invoice_number?: string | null;
  client_name?: string | null;
  destination?: string | null;
};

/**
 * Aba "Recibos": histórico de recibos gerados a partir de invoice_payments.
 * Não existe recibo avulso — todo recibo nasce do registro de um pagamento
 * em uma fatura com saldo, pelo RegisterPaymentDialog já existente.
 */
export function ReceiptsCenter({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { invoices } = useInvoices();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<ReceiptRow | null>(null);

  const { data: receipts = [], refetch } = useQuery({
    queryKey: ["invoice-receipts", user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoice_payments")
        .select("*, invoices(invoice_number, client_name, destination)")
        .eq("user_id", user!.id)
        .order("payment_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return ((data || []) as any[]).map((p) => ({
        ...p,
        invoice_number: p.invoices?.invoice_number ?? null,
        client_name: p.invoices?.client_name ?? null,
        destination: p.invoices?.destination ?? null,
      })) as ReceiptRow[];
    },
  });

  // Faturas com saldo em aberto: única origem permitida para um novo recibo.
  const openInvoices = useMemo(
    () => invoices.filter((i) => i.balance > 0 && i.status !== "cancelled"),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts.filter((r) => {
      const inPeriod = !viewMonth || !viewYear || isInMonth(r.payment_date, viewMonth, viewYear);
      if (!inPeriod) return false;
      if (!q) return true;
      return (
        (r.receipt_number || "").toLowerCase().includes(q) ||
        (r.client_name || "").toLowerCase().includes(q) ||
        (r.invoice_number || "").toLowerCase().includes(q)
      );
    });
  }, [receipts, query, viewMonth, viewYear]);

  // Recarrega a lista quando um pagamento acaba de ser registrado.
  useEffect(() => {
    if (!payingInvoice) void refetch();
  }, [payingInvoice]);

  const handleDownload = (r: ReceiptRow) => {
    generateReceiptPdf({
      agencyName: "",
      clientName: r.client_name || "—",
      tripName: r.destination || `Fatura ${r.invoice_number || "—"}`,
      services: [
        {
          type: "outro",
          description: `Recibo ${r.receipt_number} • Fatura ${r.invoice_number || "—"}`,
          salePrice: r.amount,
        },
      ],
      totalAmount: r.amount,
      paymentMethod: INVOICE_PAYMENT_METHODS[r.method] || r.method,
      paymentStatus: "pago",
    });
  };

  const handleNew = () => {
    if (openInvoices.length === 0) {
      toast({
        title: "Nenhuma fatura com saldo em aberto",
        description: "Emita uma fatura em Faturas antes de registrar o pagamento e gerar o recibo.",
        variant: "destructive",
      });
      return;
    }
    setPickerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Recibos</h2>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" /> Registrar pagamento / Gerar recibo
        </Button>
      </div>

      <Input
        placeholder="Buscar por recibo, cliente ou fatura..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum recibo no período.</p>
            <p className="text-xs mt-1">
              O recibo é gerado automaticamente ao registrar o pagamento de uma fatura com saldo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[12rem]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.receipt_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {INVOICE_PAYMENT_METHODS[r.method] || r.method}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {r.client_name || "—"} • Fatura {r.invoice_number || "—"} •{" "}
                    {r.payment_date.split("-").reverse().join("/")}
                  </div>
                </div>
                <div className="font-semibold text-emerald-600">{fmt(r.amount)}</div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setViewing(r)} title="Visualizar">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(r)} title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Seleção obrigatória de fatura com saldo */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecione a fatura</DialogTitle>
            <DialogDescription>
              O recibo é emitido a partir do pagamento de uma fatura com saldo em aberto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {openInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => { setPickerOpen(false); setPayingInvoice(inv); }}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="font-medium">{inv.invoice_number} — {inv.client_name}</div>
                <div className="text-xs text-muted-foreground">Saldo: {fmt(inv.balance)}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {payingInvoice && (
        <RegisterPaymentDialog
          invoice={payingInvoice}
          open={!!payingInvoice}
          onOpenChange={(o) => !o && setPayingInvoice(null)}
        />
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recibo {viewing?.receipt_number}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-1.5 text-sm">
              <p><span className="text-muted-foreground">Cliente:</span> {viewing.client_name || "—"}</p>
              <p><span className="text-muted-foreground">Fatura:</span> {viewing.invoice_number || "—"}</p>
              <p><span className="text-muted-foreground">Data:</span> {viewing.payment_date.split("-").reverse().join("/")}</p>
              <p><span className="text-muted-foreground">Forma:</span> {INVOICE_PAYMENT_METHODS[viewing.method] || viewing.method}</p>
              <p><span className="text-muted-foreground">Valor:</span> {fmt(viewing.amount)}</p>
              {viewing.notes && <p><span className="text-muted-foreground">Obs.:</span> {viewing.notes}</p>}
              <Button className="mt-3" variant="outline" onClick={() => handleDownload(viewing)}>
                <Download className="h-4 w-4 mr-1" /> Baixar recibo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
