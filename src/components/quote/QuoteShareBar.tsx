import { PublicShareBar } from "@/components/shared/PublicShareBar";
import type { PublicShareMessageInput } from "@/lib/public-share-message";

interface QuoteShareBarProps {
  publicUrl: string;
  message: Omit<PublicShareMessageInput, "type" | "publicUrl">;
  onGeneratePDF: () => void;
  className?: string;
}

/**
 * Faixa de ações do orçamento publicado, da esquerda para a direita:
 * link público | copiar (ícone) | abrir em nova aba (ícone) | "Criar mensagem" | "Gerar orçamento PDF".
 */
export function QuoteShareBar({ publicUrl, message, onGeneratePDF, className }: QuoteShareBarProps) {
  return (
    <PublicShareBar
      type="quote"
      publicUrl={publicUrl}
      message={message}
      onGeneratePDF={onGeneratePDF}
      pdfLabel="Gerar orçamento PDF"
      description="Preparamos uma mensagem com os principais dados deste orçamento e o link de acesso. Você pode copiá-la e enviá-la pelo WhatsApp, e-mail ou pelo canal que preferir."
      className={className}
    />
  );
}
