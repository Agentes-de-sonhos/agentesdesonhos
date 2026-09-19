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
  type PublicShareType,
} from "@/lib/public-share-message";

interface PublicShareBarProps {
  type: PublicShareType;
  publicUrl?: string | null;
  message: Omit<PublicShareMessageInput, "type" | "publicUrl">;
  onGeneratePDF: () => void;
  pdfLabel: string;
  subjectLabel: string;
  description: string;
  className?: string;
}

export function PublicShareBar({
  type,
  publicUrl,
  message,
  onGeneratePDF,
  pdfLabel,
  subjectLabel,
  description,
  className,
}: PublicShareBarProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [draft, setDraft] = useState("");
  const hasPublicUrl = Boolean(publicUrl);

  const composedMessage = useMemo(
    () => publicUrl ? buildPublicShareMessage({ type, publicUrl, ...message }) : "",
    [type, publicUrl, message],
  );

  const handleOpenDialog = () => {
    if (!hasPublicUrl) return;
    setDraft(composedMessage);
    setOpen(true);
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
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
    if (ok) toast.success("Mensagem copiada!");
    else toast.error("Não foi possível copiar automaticamente. Tente novamente.");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className={"flex w-full items-center gap-2 overflow-x-auto " + (className || "")}>
        <div className="flex h-9 w-[360px] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border bg-background pl-2.5">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span
            title={publicUrl || "Link público indisponível"}
            className="min-w-0 flex-1 truncate whitespace-nowrap text-xs leading-4 text-muted-foreground"
          >
            {publicUrl || "Link público indisponível"}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 shrink-0 p-0"
              aria-label={`Copiar link ${subjectLabel}`}
              disabled={!hasPublicUrl}
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{`Copiar link ${subjectLabel}`}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 shrink-0 p-0"
              aria-label={`Abrir ${subjectLabel} em nova aba`}
              disabled={!hasPublicUrl}
              onClick={() => publicUrl && window.open(publicUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{`Abrir ${subjectLabel} em nova aba`}</TooltipContent>
        </Tooltip>

        <Button
          size="sm"
          onClick={handleOpenDialog}
          disabled={!hasPublicUrl}
          className="shrink-0 bg-[#25D366] text-white shadow-sm shadow-[#25D366]/30 hover:bg-[#1fb857]"
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Criar mensagem
        </Button>

        <Button size="sm" className="shrink-0" onClick={onGeneratePDF}>
          <FileText className="mr-1.5 h-4 w-4" />
          {pdfLabel}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => (next ? handleOpenDialog() : setOpen(false))}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Mensagem pronta para envio</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${type}-share-message`}>Mensagem</Label>
            <Textarea
              id={`${type}-share-message`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[220px] text-sm sm:min-h-[260px]"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
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