import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Link, QrCode, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Trip } from "@/types/trip";

interface ShareTripModalProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTripModal({ trip, open, onOpenChange }: ShareTripModalProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const origin = PUBLIC_DOMAIN;
  const slugLink = trip.slug ? `${origin}/c/${trip.slug}` : null;
  const shortLink = trip.short_code ? `${origin}/v/${trip.short_code}` : null;
  const legacyLink = trip.share_token ? `${origin}/viagem/${trip.share_token}` : null;

  const primaryLink = slugLink || legacyLink || "";
  const displayShortLink = shortLink || "";

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
    setTimeout(() => setCopiedField(null), 2000);
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
            Envie o link ou QR Code para o seu cliente acessar a carteira de viagem.
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
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all select-all">
                  {primaryLink}
                </code>
                <CopyButton text={primaryLink} field="primary" />
              </div>
            </div>
          )}

          {/* Short link */}
          {displayShortLink && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Link Curto
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all select-all">
                  {displayShortLink}
                </code>
                <CopyButton text={displayShortLink} field="short" />
              </div>
            </div>
          )}

          {/* Password */}
          {trip.access_password && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">🔒 Senha do Cliente</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono tracking-wider select-all">
                  {trip.access_password}
                </code>
                <CopyButton text={trip.access_password} field="password" />
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <QrCode className="h-3 w-3" /> QR Code da Viagem
            </label>
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <QRCodeSVG
                value={displayShortLink || primaryLink}
                size={180}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              O cliente pode escanear para acessar a carteira
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
