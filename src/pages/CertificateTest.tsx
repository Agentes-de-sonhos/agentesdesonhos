import { useEffect, useState } from "react";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function CertificateTest() {
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templateUrl =
    "https://mlwwpckahhfsixplxwif.supabase.co/storage/v1/object/public/academy-files/certificate-templates/1773094853829_Certificado_de_Especialista__6_.png";

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const blob = await generateCertificatePdf({
        templateUrl,
        agentName: "Fernando Serro Azul Nobre",
        completionDate: "09 de março de 2026",
        certificateNumber: "EA-2026-000001",
      });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = "Certificado_Teste_Fernando.pdf";
      a.click();
    } catch (e: any) {
      setError(e.message || "Erro ao gerar certificado");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <h1 className="text-2xl font-bold">Teste de Certificado</h1>
      <p className="text-muted-foreground">Nome: Fernando Serro Azul Nobre</p>

      <Button onClick={handleGenerate} disabled={generating} size="lg">
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Gerar Certificado de Teste
          </>
        )}
      </Button>

      {error && <p className="text-destructive">{error}</p>}

      {pdfUrl && (
        <div className="w-full max-w-4xl">
          <iframe src={pdfUrl} className="w-full h-[600px] border rounded-lg" />
          <Button className="mt-4" onClick={() => {
            const a = document.createElement("a");
            a.href = pdfUrl;
            a.download = "Certificado_Teste_Fernando.pdf";
            a.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Baixar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
