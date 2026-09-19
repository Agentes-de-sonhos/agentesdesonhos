import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileText, Link as LinkIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  buildPublicShareMessage,
  copyTextToClipboard,
  type PublicShareMessageInput,
} from "@/lib/public-share-message";

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
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [draft, setDraft] = useState("");

  const composedMessage = useMemo(
    () => buildPublicShareMessage({ type: "quote", publicUrl, ...message }),
    [publicUrl, message],
  );

  // A mensagem é inicializada SOMENTE na abertura do modal. Rerenders do pai
  // (autosave, status, novo objeto `message`) nunca sobrescrevem as edições locais.
  const handleOpenDialog = () => {
    setDraft(composedMessage);
    setOpen(true);
  };

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(publicUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), 2200);
    } else {
      toast.error("Não foi possível copiar automaticamente. Tente novamente.");
    }
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(draft);
    if (ok) {
      toast.success("Mensagem copiada!");
    } else {
      toast.error("Não foi possível copiar automaticamente. Tente novamente.");
    }
  };

  const handleOpenPublicUrl = () => {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className={"flex w-full min-w-0 flex-wrap items-center gap-2 " + (className || "")}>
        {/* 1. Campo com o link público */}
        <div className="flex h-9 min-w-0 flex-1 basis-[220px] items-center gap-1.5 overflow-hidden rounded-md border bg-background pl-2.5">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span
            title={publicUrl}
            className="min-w-0 flex-1 truncate whitespace-nowrap text-xs leading-4 text-muted-foreground"
          >
            {publicUrl}
          </span>
        </div>

        {/* 2. Copiar link (botão quadrado compacto) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 shrink-0 p-0"
              aria-label="Copiar link do orçamento"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copiar link do orçamento</TooltipContent>
        </Tooltip>

        {/* 3. Abrir orçamento em nova aba (botão quadrado compacto) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 shrink-0 p-0"
              aria-label="Abrir orçamento em nova aba"
              onClick={handleOpenPublicUrl}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir orçamento em nova aba</TooltipContent>
        </Tooltip>

        {/* 4. Criar mensagem */}
        <Button
          size="sm"
          onClick={handleOpenDialog}
          className="shrink-0 bg-[#25D366] text-white shadow-sm shadow-[#25D366]/30 hover:bg-[#1fb857]"
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Criar mensagem
        </Button>

        {/* 5. Gerar orçamento PDF */}
        <Button size="sm" className="shrink-0" onClick={onGeneratePDF}>
          <FileText className="mr-1.5 h-4 w-4" />
          Gerar orçamento PDF
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => (next ? handleOpenDialog() : setOpen(false))}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Mensagem pronta para envio</DialogTitle>
            <DialogDescription>
              Preparamos uma mensagem com os principais dados deste orçamento e o link de acesso. Você
              pode copiá-la e enviá-la pelo WhatsApp, e-mail ou pelo canal que preferir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="quote-share-message">Mensagem</Label>
            <Textarea
              id="quote-share-message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[220px] text-sm sm:min-h-[260px]"
            />
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleCopyMessage}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copiar mensagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
