import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Receipt, Download } from "lucide-react";
import { Booking, BookingDocument } from "@/hooks/useBookings";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  documents: BookingDocument[];
  booking: Booking;
}

const docTypeLabels: Record<string, string> = { recibo: "Recibo", contrato: "Contrato" };
const docTypeIcons: Record<string, typeof FileText> = { recibo: Receipt, contrato: FileText };

export function BookingDocuments({ bookingId, documents, booking }: Props) {
  const handleGenerate = (type: "recibo" | "contrato") => {
    toast.info(`Geração de ${docTypeLabels[type]} será implementada em breve.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleGenerate("recibo")}>
          <Receipt className="h-4 w-4" /> Gerar Recibo
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleGenerate("contrato")}>
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
