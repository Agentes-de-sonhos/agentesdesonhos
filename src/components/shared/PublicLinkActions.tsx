import { useMemo, useState } from "react";
import { MessageCircle, Copy, Share2, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildPublicShareMessage,
  canNativeShare,
  copyTextToClipboard,
  getPublicShareTitle,
  nativeShare,
  type PublicShareMessageInput,
  type PublicShareType,
} from "@/lib/public-share-message";

interface PublicLinkActionsProps {
  /** Content used to build the WhatsApp-friendly message. */
  message: Omit<PublicShareMessageInput, "type" | "publicUrl">;
  type: PublicShareType;
  publicUrl: string;
  /** Show the "Abrir" button that opens the URL in a new tab. */
  showOpen?: boolean;
  /** Layout size — "sm" for inline toolbars, "md" for standalone cards. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Standard "Copiar mensagem / Copiar link / Compartilhar / Abrir" toolbar
 * used across Orçamento, Roteiro and Carteira Digital public links.
 */
export function PublicLinkActions({
  message,
  type,
  publicUrl,
  showOpen = true,
  size = "sm",
  className,
}: PublicLinkActionsProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const nativeShareAvailable = useMemo(() => canNativeShare(), []);
  const btnSize = size === "sm" ? "sm" : "default";

  const composedMessage = useMemo(
    () => buildPublicShareMessage({ type, publicUrl, ...message }),
    [type, publicUrl, message],
  );

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(composedMessage);
    if (ok) {
      setCopiedMessage(true);
      toast.success("Mensagem copiada! Agora é só colar no WhatsApp.");
      setTimeout(() => setCopiedMessage(false), 2200);
    } else {
      toast.error("Não foi possível copiar automaticamente. Tente novamente.");
    }
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

  const handleShare = async () => {
    const ok = await nativeShare({
      title: getPublicShareTitle(type),
      text: composedMessage,
      url: publicUrl,
    });
    if (!ok) {
      // User cancelled or share failed silently — fall back to copying the message.
      await handleCopyMessage();
    }
  };

  return (
    <div className={"flex flex-wrap items-center gap-2 " + (className || "")}>
      <Button size={btnSize} onClick={handleCopyMessage}>
        {copiedMessage ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copiedMessage ? "Copiada!" : "Copiar mensagem"}
      </Button>
      <Button size={btnSize} variant="outline" onClick={handleCopyLink}>
        {copiedLink ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Copy className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copiedLink ? "Copiado!" : "Copiar link"}
      </Button>
      {nativeShareAvailable && (
        <Button size={btnSize} variant="outline" onClick={handleShare}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Compartilhar
        </Button>
      )}
      {showOpen && (
        <Button
          size={btnSize}
          variant="outline"
          onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Abrir
        </Button>
      )}
    </div>
  );
}