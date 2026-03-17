import { MessageCircle, Phone, X } from "lucide-react";

interface ShowcaseFloatingCTAProps {
  phone: string | undefined | null;
  whatsappUrl: string;
  phoneUrl: string;
  contactOpen: boolean;
  onToggle: () => void;
}

export function ShowcaseFloatingCTA({ phone, whatsappUrl, phoneUrl, contactOpen, onToggle }: ShowcaseFloatingCTAProps) {
  if (!phone) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:translate-x-0 sm:right-6">
      {contactOpen && (
        <div className="mb-3 flex flex-col gap-2 animate-fade-in items-end">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[hsl(142,70%,45%)] text-white px-5 py-3 rounded-full shadow-lg hover:bg-[hsl(142,70%,38%)] transition-colors text-sm font-medium">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href={phoneUrl}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Phone className="h-4 w-4" /> Ligar
          </a>
        </div>
      )}
      <button onClick={onToggle}
        className="h-14 w-14 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-xl flex items-center justify-center hover:bg-[hsl(142,70%,38%)] hover:scale-105 transition-all">
        {contactOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
