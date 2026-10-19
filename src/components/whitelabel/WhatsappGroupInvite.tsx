import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

/** Link do grupo de oportunidades declarado no perfil do site (opt-in por agência). */
export function whatsappGroupUrlFor(hostname?: string | null): string | null {
  const url = resolveSiteProfile(hostname ?? "").inspirationDialog?.groupUrl?.trim();
  return url && /^https:\/\/chat\.whatsapp\.com\//i.test(url) ? url : null;
}

/** Convite exibido após qualquer solicitação enviada; nada aparece sem link configurado. */
export function WhatsappGroupInvite({ hostname, className = "" }: { hostname?: string | null; className?: string }) {
  const url = whatsappGroupUrlFor(hostname);
  if (!url) return null;
  return (
    <div className={`mt-6 rounded-2xl border border-border bg-muted/40 p-5 text-center ${className}`} data-testid="wl-whatsapp-group-invite">
      <p className="text-sm font-semibold text-foreground">Quer receber oportunidades e dicas de viagem?</p>
      <p className="mt-1 text-sm text-muted-foreground">Entre no nosso grupo VIP no WhatsApp.</p>
      <Button asChild className="wl-visa-cta mt-4">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Entrar no grupo VIP
        </a>
      </Button>
    </div>
  );
}
