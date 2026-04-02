import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Eye, Copy, Share2, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBusinessCard } from "@/hooks/useBusinessCard";
import { generateBusinessCardPdf } from "@/lib/generateBusinessCardPdf";

const PUBLIC_DOMAIN = "https://contato.tur.br";

interface WizardCompleteProps {
  slug: string;
  onRestart: () => void;
}

export function WizardComplete({ slug, onRestart }: WizardCompleteProps) {
  const { card } = useBusinessCard();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const publicUrl = `${PUBLIC_DOMAIN}/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meu Cartão Virtual", url: publicUrl });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const handleGeneratePdf = async () => {
    if (!card) {
      toast.error("Cartão não encontrado.");
      return;
    }
    setGeneratingPdf(true);
    try {
      await generateBusinessCardPdf(card);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-8 pb-8 text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Seu cartão virtual está pronto! 🎉</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Compartilhe com seus clientes e comece a receber contatos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a href={`/${slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-1" /> Visualizar cartão
            </a>
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1" /> Copiar link do cartão
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" /> Compartilhar cartão
          </Button>
          <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
            {generatingPdf ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1" />
            )}
            Gerar PDF
          </Button>
        </div>

        <Button variant="link" onClick={onRestart} className="text-sm">
          Editar cartão novamente
        </Button>
      </CardContent>
    </Card>
  );
}
