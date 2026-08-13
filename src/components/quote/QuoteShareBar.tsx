import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileText, Link as LinkIcon, MessageCircle } from "lucide-react";
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
 * Linha única de ações do orçamento publicado:
 * "Criar mensagem" | URL pública completa | copiar (ícone) | "Gerar orçamento PDF".
 */
export function QuoteShareBar({ publicUrl, message, onGeneratePDF, className }: QuoteShareBarProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const composedMessage = useMemo(
    () => buildPublicShareMessage({ type: "quote", publicUrl, ...message }),
    [publicUrl, message],
  );

  // Ao abrir, inicializa com a mensagem gerada pelo sistema (edições ficam locais).
  useEffect(() => {
    if (open) setDraft(composedMessage);
  }, [open, composedMessage]);

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

  return (
    <TooltipProvider delayDuration={150}>
      <div className={"flex w-full min-w-0 flex-wrap items-center gap-2 " + (className || "")}>
        <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Criar mensagem
        </Button>

        <div className="flex min-w-0 flex-1 basis-[220px] items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 break-all text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">
            {publicUrl}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              aria-label="Copiar link do orçamento"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copiar link do orçamento</TooltipContent>
        </Tooltip>

        <Button size="sm" variant="outline" className="shrink-0" onClick={onGeneratePDF}>
          <FileText className="mr-1.5 h-4 w-4" />
          Gerar orçamento PDF
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
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
              ref={textareaRef}
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
