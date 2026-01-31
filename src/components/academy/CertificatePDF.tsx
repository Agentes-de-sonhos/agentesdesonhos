import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UserCertificate, LearningTrail } from "@/types/academy";

interface CertificatePDFProps {
  certificate: UserCertificate;
  trail: LearningTrail;
}

export function CertificatePDF({ certificate, trail }: CertificatePDFProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // In a production app, you'd use a library like html2pdf or react-pdf
    // For now, we'll use the browser's print functionality
    const printWindow = window.open("", "_blank");
    if (printWindow && certificateRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Certificado - ${trail.name}</title>
            <style>
              body { 
                margin: 0; 
                padding: 40px;
                font-family: 'Georgia', serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .certificate {
                background: white;
                padding: 60px;
                border-radius: 20px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 800px;
                text-align: center;
                border: 8px solid #667eea;
              }
              .logo { font-size: 48px; margin-bottom: 20px; }
              .title { font-size: 36px; color: #1a1a1a; margin-bottom: 10px; }
              .subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
              .recipient { font-size: 32px; color: #667eea; font-weight: bold; margin-bottom: 20px; }
              .trail-name { font-size: 24px; color: #333; margin-bottom: 10px; }
              .destination { font-size: 18px; color: #666; margin-bottom: 40px; }
              .date { font-size: 14px; color: #888; margin-top: 40px; }
              .cert-number { font-size: 12px; color: #aaa; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <div class="logo">🏆</div>
              <div class="title">Certificado de Conclusão</div>
              <div class="subtitle">Educa Travel Academy</div>
              <div>Certificamos que</div>
              <div class="recipient">${certificate.agent_name}</div>
              <div>concluiu com sucesso a trilha de aprendizado</div>
              <div class="trail-name">${trail.name}</div>
              <div class="destination">Destino: ${trail.destination}</div>
              <div class="date">Emitido em ${format(new Date(certificate.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
              <div class="cert-number">Nº ${certificate.certificate_number}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Certificate Preview */}
      <div
        ref={certificateRef}
        className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-xl border-4 border-primary/20"
      >
        <div className="bg-white rounded-lg p-8 text-center shadow-lg">
          <Award className="h-16 w-16 mx-auto text-primary mb-4" />
          
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Certificado de Conclusão
          </h2>
          <p className="text-muted-foreground mb-6">Educa Travel Academy</p>

          <p className="text-sm text-muted-foreground mb-2">Certificamos que</p>
          <h3 className="text-2xl font-bold text-primary mb-4">
            {certificate.agent_name}
          </h3>

          <p className="text-sm text-muted-foreground mb-2">
            concluiu com sucesso a trilha de aprendizado
          </p>
          <h4 className="text-xl font-semibold mb-1">{trail.name}</h4>
          <p className="text-muted-foreground mb-6">Destino: {trail.destination}</p>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Emitido em{" "}
              {format(new Date(certificate.issued_at), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Nº {certificate.certificate_number}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Certificado (PDF)
        </Button>
      </div>
    </div>
  );
}
