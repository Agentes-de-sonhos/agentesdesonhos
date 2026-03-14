import { Phone, Mail, Globe, MessageCircle, ExternalLink, Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";
import { CardButton, SocialLinks } from "@/hooks/useBusinessCard";

const SOCIAL_ICONS: Record<string, React.ComponentType<any>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Youtube,
};

interface CardPreviewProps {
  name: string;
  title: string;
  agency_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  photo_url: string | null;
  cover_url: string | null;
  logos: string[];
  primary_color: string;
  secondary_color: string;
  buttons: CardButton[];
  social_links: SocialLinks;
}

export function CardPreview(props: CardPreviewProps) {
  const {
    name, title, agency_name, phone, whatsapp, email, website,
    photo_url, cover_url, logos, primary_color, secondary_color,
    buttons, social_links,
  } = props;

  const pc = primary_color || "#0284c7";
  const sc = secondary_color || "#f97316";
  const activeSocials = Object.entries(social_links).filter(([, v]) => !!v);

  return (
    <div className="sticky top-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
        Pré-visualização
      </p>
      <div className="w-full max-w-[320px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-border">
        {/* Cover */}
        <div
          className="h-24 relative"
          style={{
            background: cover_url
              ? `url(${cover_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${pc}, ${sc})`,
          }}
        >
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            {photo_url ? (
              <img src={photo_url} alt={name} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md" />
            ) : (
              <div
                className="h-16 w-16 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: pc }}
              >
                {name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        <div className="pt-10 pb-5 px-4 text-center space-y-3">
          <div>
            <p className="text-sm font-bold text-gray-900 truncate">{name || "Seu Nome"}</p>
            {title && <p className="text-xs text-gray-500 truncate">{title}</p>}
            {agency_name && <p className="text-xs font-medium truncate" style={{ color: pc }}>{agency_name}</p>}
          </div>

          {/* Quick icons */}
          <div className="flex justify-center gap-2">
            {whatsapp && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: "#25D366" }}>
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
            )}
            {phone && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: pc }}>
                <Phone className="h-3.5 w-3.5" />
              </div>
            )}
            {email && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: pc }}>
                <Mail className="h-3.5 w-3.5" />
              </div>
            )}
            {website && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: pc }}>
                <Globe className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Buttons */}
          {buttons.filter(b => b.text).length > 0 && (
            <div className="space-y-1.5">
              {buttons.filter(b => b.text).map((btn, i) => (
                <div
                  key={i}
                  className="py-1.5 px-3 rounded-lg border text-xs font-medium text-center truncate"
                  style={{ borderColor: pc, color: pc }}
                >
                  <ExternalLink className="h-3 w-3 inline mr-1" />
                  {btn.text}
                </div>
              ))}
            </div>
          )}

          {/* Social */}
          {activeSocials.length > 0 && (
            <div className="flex justify-center gap-1.5 pt-1">
              {activeSocials.map(([key]) => {
                const Icon = SOCIAL_ICONS[key] || Globe;
                return (
                  <div
                    key={key}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: pc }}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Logo */}
          {logos.length > 0 && (
            <div className="pt-2">
              <img src={logos[0]} alt="Logo" className="max-h-[40px] max-w-[100px] object-contain mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
