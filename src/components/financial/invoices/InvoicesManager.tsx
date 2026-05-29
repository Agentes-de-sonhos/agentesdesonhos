import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Download, Link as LinkIcon, Trash2, DollarSign, Send } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { RegisterPaymentDialog } from "./RegisterPaymentDialog";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import {
  INVOICE_STATUS_LABELS, type Invoice, type InvoiceStatus,
} from "@/types/invoice";
import { useToast } from "@/hooks/use-toast";

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

export function InvoicesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { invoices, isLoading, getInvoiceDetail, deleteInvoice, updateInvoiceStatus } = useInvoices();
  const [openForm, setOpenForm] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const filtered = invoices.filter(i =>
    !query ||
    i.invoice_number.toLowerCase().includes(query.toLowerCase()) ||
    i.client_name.toLowerCase().includes(query.toLowerCase()) ||
    (i.destination || "").toLowerCase().includes(query.toLowerCase()),
  );

  const publicUrl = (inv: Invoice) =>
    inv.public_access_code && inv.agency_slug
      ? `${window.location.origin}/fatura/${inv.agency_slug}/${inv.public_access_code}`
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
          <p>Nenhuma fatura ainda. Clique em "Nova fatura" para começar.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{inv.invoice_number}</span>
                    <Badge className={STATUS_COLOR[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
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
          ))}
        </div>
      )}

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
}