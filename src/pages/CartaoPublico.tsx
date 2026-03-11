import { useParams } from "react-router-dom";
import { usePublicBusinessCard, generateVCard, SocialLinks } from "@/hooks/useBusinessCard";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import {
  Phone, Mail, Globe, Download, MessageCircle, ExternalLink,
  Instagram, Facebook, Linkedin, Twitter, Youtube,
} from "lucide-react";

const PUBLIC_DOMAIN = "https://contato.tur.br";

const SOCIAL_META: Record<keyof SocialLinks, { icon: React.ComponentType<any>; label: string }> = {
  instagram: { icon: Instagram, label: "Instagram" },
  facebook: { icon: Facebook, label: "Facebook" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  twitter: { icon: Twitter, label: "X" },
  youtube: { icon: Youtube, label: "YouTube" },
  tiktok: { icon: Youtube, label: "TikTok" },
};

export default function CartaoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const { data: card, isLoading } = usePublicBusinessCard(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Cartão não encontrado</h1>
          <p className="text-gray-500">Verifique a URL e tente novamente.</p>
        </div>
      </div>
    );
  }

  const trackClick = (eventType: string, data?: Record<string, string>) => {
    supabase.from("business_card_stats").insert({
      card_id: card.id,
      event_type: eventType,
      event_data: data || {},
    }).then();
  };

  const handleDownloadVCard = () => {
    trackClick("vcard_download");
    const vcf = generateVCard(card);
    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.name || "contato"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const primaryColor = card.primary_color || "#0284c7";
  const secondaryColor = card.secondary_color || "#f97316";
  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;
  const activeSocials = Object.entries(card.social_links).filter(([, v]) => !!v) as [keyof SocialLinks, string][];

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center">
      <div className="w-full max-w-md mx-auto bg-white min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-2xl sm:my-8 overflow-hidden">
        {/* Cover */}
        <div
          className="h-40 relative flex items-end justify-center"
          style={{
            background: card.cover_url
              ? `url(${card.cover_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
        >
          {/* Photo overlay */}
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
            {card.photo_url ? (
              <img
                src={card.photo_url}
                alt={card.name}
                className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div
                className="h-28 w-28 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-3xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {card.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="pt-16 pb-8 px-6 text-center space-y-6">
          {/* Name & title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{card.name}</h1>
            {card.title && <p className="text-gray-500 mt-1">{card.title}</p>}
            {card.agency_name && (
              <p className="text-sm font-medium mt-1" style={{ color: primaryColor }}>
                {card.agency_name}
              </p>
            )}
          </div>

          {/* Logos */}
          {card.logos.length > 0 && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {card.logos.map((url, i) => (
                <img key={i} src={url} alt="Logo" className="h-24 object-contain" />
              ))}
            </div>
          )}

          {/* Quick contact */}
          <div className="flex justify-center gap-3">
            {card.whatsapp && (
              <a
                href={`https://wa.me/${card.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick("whatsapp_click")}
                className="flex items-center justify-center h-12 w-12 rounded-full text-white shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                onClick={() => trackClick("phone_click")}
                className="flex items-center justify-center h-12 w-12 rounded-full text-white shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: primaryColor }}
              >
                <Phone className="h-5 w-5" />
              </a>
            )}
            {card.email && (
              <a
                href={`mailto:${card.email}`}
                onClick={() => trackClick("email_click")}
                className="flex items-center justify-center h-12 w-12 rounded-full text-white shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: primaryColor }}
              >
                <Mail className="h-5 w-5" />
              </a>
            )}
            {card.website && (
              <a
                href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick("website_click")}
                className="flex items-center justify-center h-12 w-12 rounded-full text-white shadow-md transition-transform hover:scale-110"
                style={{ backgroundColor: primaryColor }}
              >
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>

          {/* Save contact */}
          <button
            onClick={handleDownloadVCard}
            className="w-full py-3 rounded-xl font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: primaryColor }}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Salvar Contato
          </button>

          {/* Action buttons */}
          {card.buttons.length > 0 && (
            <div className="space-y-3">
              {card.buttons.map((btn, i) => (
                <a
                  key={i}
                  href={btn.url.startsWith("http") ? btn.url : `https://${btn.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("button_click", { button_text: btn.text, button_url: btn.url })}
                  className="block w-full py-3 px-4 rounded-xl font-medium border-2 text-center transition-all hover:shadow-md"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  <ExternalLink className="h-4 w-4 inline mr-2" />
                  {btn.text}
                </a>
              ))}
            </div>
          )}

          {/* Social links */}
          {activeSocials.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Siga-me nas redes</p>
              <div className="flex justify-center gap-3">
                {activeSocials.map(([key, url]) => {
                  const meta = SOCIAL_META[key];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <a
                      key={key}
                      href={url.startsWith("http") ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick("social_click", { network: key })}
                      className="flex items-center justify-center h-11 w-11 rounded-full text-white transition-transform hover:scale-110 shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="pt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Escaneie para salvar</p>
            <div className="bg-white p-3 rounded-xl shadow-inner border">
              <QRCodeSVG value={publicUrl} size={120} fgColor={primaryColor} />
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-300 pt-4">Agentes de Sonhos</p>
        </div>
      </div>
    </div>
  );
}
