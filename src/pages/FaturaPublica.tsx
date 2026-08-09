import { useNoindex } from "@/hooks/useNoindex";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { buildPixBrCode } from "@/lib/pixBrCode";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import {
  INVOICE_SERVICE_CATEGORIES, INVOICE_STATUS_LABELS, INVOICE_PAYMENT_METHODS,
  type Invoice, type InvoiceService, type InvoiceInstallment, type InvoicePayment,
} from "@/types/invoice";

const fmt = (v: number, c = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(v || 0);

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR");
};

export default function FaturaPublica({
  agencySlugOverride,
  codeOverride,
}: { agencySlugOverride?: string; codeOverride?: string } = {}) {
  useNoindex();
  const params = useParams();
  const agencySlug = agencySlugOverride ?? params.agencySlug;
  const code = codeOverride ?? params.code;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    invoice: Invoice; services: InvoiceService[];
    installments: InvoiceInstallment[]; payments: InvoicePayment[];
    agent_profile: any;
  } | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: resp, error: e } = await (supabase as any).rpc("get_invoice_by_public_code", {
        p_agency_slug: agencySlug, p_code: code,
      });
      if (e || resp?.error) {
        setError(resp?.error || "Fatura não encontrada");
      } else {
        setData(resp);
      }
      setLoading(false);
    })();
  }, [agencySlug, code]);

  useEffect(() => {
    (async () => {
      if (!data?.invoice?.pix_key || (data.invoice.balance ?? 0) <= 0) return;
      try {
        const payload = data.invoice.pix_qr_payload || buildPixBrCode({
          pixKey: data.invoice.pix_key,
          amount: data.invoice.balance,
          merchantName: data.agent_profile?.agency_name || "RECEBEDOR",
          merchantCity: "BRASIL",
          txid: data.invoice.invoice_number.replace(/[^A-Z0-9]/gi, "").slice(0, 25),
        });
        const url = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
        setPixPayload(payload);
        setPixQr(url);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [data?.invoice?.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <p>{error || "Fatura não encontrada"}</p>
    </div>
  );

  const { invoice, services, installments, payments, agent_profile } = data;

  const downloadPdf = () => {
    generateInvoicePdf(
      { ...invoice, services, installments, payments },
      { name: agent_profile?.agency_name, phone: agent_profile?.phone },
      window.location.href,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
            <div>
              <p className="text-xs opacity-70">FATURA</p>
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              <p className="text-sm opacity-80 mt-1">Emitida em {fmtDate(invoice.issue_date)}</p>
              {invoice.due_date && (
                <p className="text-sm opacity-80">Vencimento: {fmtDate(invoice.due_date)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold">{agent_profile?.agency_name}</p>
              <p className="text-xs opacity-80">{agent_profile?.phone}</p>
              <Badge className="mt-2">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Cliente</h2>
              <p className="font-medium">{invoice.client_name}</p>
              {(invoice.client_document || invoice.client_company) && (
                <p className="text-sm text-muted-foreground">
                  {[invoice.client_document, invoice.client_company].filter(Boolean).join(" • ")}
                </p>
              )}
              {(invoice.client_email || invoice.client_phone) && (
                <p className="text-sm text-muted-foreground">
                  {[invoice.client_email, invoice.client_phone].filter(Boolean).join(" • ")}
                </p>
              )}
            </section>

            {(invoice.destination || invoice.travel_start) && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Viagem</h2>
                <p>{invoice.destination}</p>
                {invoice.travel_start && (
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(invoice.travel_start)} → {fmtDate(invoice.travel_end)}
                  </p>
                )}
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Serviços</h2>
              <div className="divide-y">
                {services.map(s => (
                  <div key={s.id} className="py-2 flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{INVOICE_SERVICE_CATEGORIES[s.category]}</p>
                      <p className="text-sm">{s.description || "—"}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-semibold">{fmt(s.final_amount, invoice.currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
              <Row label="Subtotal" value={fmt(invoice.subtotal, invoice.currency)} />
              <Row label="Taxas" value={fmt(invoice.taxes_total, invoice.currency)} />
              {invoice.discount_total > 0 && (
                <Row label="Descontos" value={`- ${fmt(invoice.discount_total, invoice.currency)}`} />
              )}
              <div className="border-t pt-2 mt-2">
                <Row label="Valor total" value={fmt(invoice.total_amount, invoice.currency)} bold />
                <Row label="Recebido" value={fmt(invoice.paid_amount, invoice.currency)} muted />
                <Row label="Saldo em aberto" value={fmt(invoice.balance, invoice.currency)} highlight />
              </div>
            </section>

            {installments.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Parcelas</h2>
                <div className="space-y-2">
                  {installments.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white border rounded p-2 text-sm">
                      <span>{p.label}</span>
                      <span className="text-muted-foreground">{fmtDate(p.due_date)}</span>
                      <span className="font-semibold">{fmt(p.amount, invoice.currency)}</span>
                      <Badge variant={p.status === "paid" ? "default" : "outline"}>
                        {p.status === "paid" ? "Pago" : p.status === "overdue" ? "Vencido" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {payments.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Recibos</h2>
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white border rounded p-2 text-sm">
                      <div>
                        <p className="font-medium">{p.receipt_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(p.payment_date)} • {INVOICE_PAYMENT_METHODS[p.method] || p.method}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-600">{fmt(p.amount, invoice.currency)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {invoice.notes && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Observações</h2>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </section>
            )}

            {invoice.pix_key && (
              <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-emerald-800 mb-3">Pagar via PIX</h2>
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  {pixQr ? (
                    <img src={pixQr} alt="QR Code PIX" className="h-40 w-40 rounded bg-white p-2 border border-emerald-200" />
                  ) : (
                    <div className="h-40 w-40 rounded bg-white border border-emerald-200 flex items-center justify-center text-xs text-emerald-700">
                      Gerando QR...
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <p className="text-xs text-emerald-700">Chave PIX:</p>
                    <code className="text-sm break-all block bg-white border border-emerald-200 rounded p-2">{invoice.pix_key}</code>
                    {pixPayload && (
                      <>
                        <p className="text-xs text-emerald-700">PIX Copia e Cola:</p>
                        <code className="text-xs break-all block bg-white border border-emerald-200 rounded p-2 max-h-24 overflow-y-auto">{pixPayload}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                          onClick={() => {
                            navigator.clipboard.writeText(pixPayload);
                            toast({ title: "Código PIX copiado" });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar código PIX
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="flex justify-center pt-4">
              <Button onClick={downloadPdf}>
                <Download className="h-4 w-4 mr-2" /> Baixar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <FileText className="h-3 w-3 inline mr-1" /> Documento emitido digitalmente
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold, highlight, muted }: {
  label: string; value: string; bold?: boolean; highlight?: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : ""} ${highlight ? "text-rose-600 font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}