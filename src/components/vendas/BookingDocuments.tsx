import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Receipt, Download, Loader2 } from "lucide-react";
import { Booking, BookingDocument, BookingService, BookingPayment, SERVICE_TYPES, PAYMENT_METHODS } from "@/hooks/useBookings";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateReceiptPdf, ReceiptData } from "@/lib/generateReceiptPdf";
import { generateContractPdf, ContractData } from "@/lib/generateContractPdf";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  bookingId: string;
  documents: BookingDocument[];
  booking: Booking;
  services: BookingService[];
  payments: BookingPayment[];
}

const docTypeLabels: Record<string, string> = { recibo: "Recibo", contrato: "Contrato" };
const docTypeIcons: Record<string, typeof FileText> = { recibo: Receipt, contrato: FileText };

export function BookingDocuments({ bookingId, documents, booking, services, payments }: Props) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const handleGenerateReceipt = async () => {
    setGenerating(true);
    try {
      // Fetch agent profile for agency info
      let agencyName = "";
      let agencyPhone = "";
      let agencyEmail = "";
      let agencyCnpj = "";

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone, agency_name, city, state")
          .eq("user_id", user.id)
          .maybeSingle();

        agencyName = profile?.agency_name || profile?.name || "Agência";
        agencyPhone = profile?.phone || "";
        agencyEmail = user.email || "";
      }

      // Determine dominant payment method
      const paidPayments = payments.filter((p) => p.status === "pago");
      const allPayments = payments.length > 0 ? payments : [];
      const methodCounts: Record<string, number> = {};
      allPayments.forEach((p) => {
        methodCounts[p.payment_method] = (methodCounts[p.payment_method] || 0) + 1;
      });
      const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const paymentMethodLabel = topMethod ? (PAYMENT_METHODS[topMethod] || topMethod) : undefined;

      const totalPaid = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
      const paymentStatus = totalPaid >= Number(booking.total_amount) ? "pago" : "pendente";

      const receiptData: ReceiptData = {
        agencyName,
        agencyCnpj: agencyCnpj || undefined,
        agencyEmail: agencyEmail || undefined,
        agencyPhone: agencyPhone || undefined,
        clientName: booking.client?.name || "Cliente",
        tripName: booking.trip_name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        services: services.map((s) => ({
          type: s.service_type,
          description: s.description,
          salePrice: Number(s.sale_price),
        })),
        totalAmount: Number(booking.total_amount),
        paymentMethod: paymentMethodLabel,
        paymentStatus,
      };

      generateReceiptPdf(receiptData);
      toast.success("Recibo gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar recibo");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateContract = () => {
    toast.info("Geração de Contrato será implementada em breve.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleGenerateReceipt}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
          Gerar Recibo
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerateContract}>
          <FileText className="h-4 w-4" /> Gerar Contrato
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Nenhum documento gerado ainda.
          </CardContent>
        </Card>
      ) : (
        documents.map((doc) => {
          const Icon = docTypeIcons[doc.doc_type] || FileText;
          return (
            <Card key={doc.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-foreground">{docTypeLabels[doc.doc_type] || doc.doc_type}</span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                {doc.file_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
