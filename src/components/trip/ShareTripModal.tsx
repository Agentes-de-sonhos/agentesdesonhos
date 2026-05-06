import { useState } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { buildCarteiraLink } from "@/lib/carteira-domain";
import { Copy, Check, Link, Share2, Eye, EyeOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Trip } from "@/types/trip";

interface ShareTripModalProps {
  trip: Trip & { public_access_code?: string | null };
  agencyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTripModal({ trip, agencyName, open, onOpenChange }: ShareTripModalProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const origin = PUBLIC_DOMAIN;
  
  // New format link (for trips with public_access_code)
  const newFormatLink = (trip.public_access_code && agencyName)
    ? buildCarteiraLink(agencyName, trip.public_access_code)
    : null;
  
  // Legacy links
  const slugLink = trip.slug ? `${origin}/c/${trip.slug}` : null;
  const shortLink = trip.short_code ? `${origin}/v/${trip.short_code}` : null;
  const legacyLink = trip.share_token ? `${origin}/viagem/${trip.share_token}` : null;

  const primaryLink = newFormatLink || slugLink || legacyLink || "";
  const displayShortLink = shortLink || "";

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareMessage = `Olá, ${trip.client_name}! 👋\n\nSua carteira digital de viagem para ${trip.destination} está pronta. ✈️\n\n🔗 Acesse pelo link:\n${primaryLink}\n\n🔒 Senha de acesso:\n${trip.access_password ?? ""}\n\nQualquer dúvida, estou à disposição!`;

  const handleCopyAll = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedAll(true);
    toast({ title: "Mensagem copiada!", description: "Cole no WhatsApp ou onde preferir para enviar ao cliente." });
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartilhar Carteira
          </DialogTitle>
          <DialogDescription>
            Envie o link e a senha para o seu cliente acessar a carteira de viagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              ✓ Carteira Publicada
            </Badge>
            <span className="text-xs text-muted-foreground">{trip.client_name} • {trip.destination}</span>
          </div>

          {/* Primary link */}
          {primaryLink && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Link className="h-3 w-3" /> Link Principal
              </label>
              <code className="block bg-muted px-3 py-2 rounded-md text-sm font-mono break-all select-all">
                {primaryLink}
              </code>
            </div>
          )}

          {/* Password */}
          {trip.access_password && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">🔒 Senha do Cliente</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono tracking-wider select-all">
                  {showPassword ? trip.access_password : "••••••••"}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {primaryLink && (
            <Button
              type="button"
              className="w-full"
              onClick={handleCopyAll}
              disabled={!trip.access_password}
            >
              {copiedAll ? (
                <>
                  <Check className="h-4 w-4 mr-2" /> Mensagem copiada!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Copiar mensagem para o cliente
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
