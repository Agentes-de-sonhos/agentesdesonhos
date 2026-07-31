import { useState } from "react";
import { MessageCircle, Phone, Mail, MapPin, Clock } from "lucide-react";
import { FOOTER_COPY, type AgencyConfig } from "./content";
import { LegalDocumentModal } from "@/components/landing/legal/LegalDocumentModal";
import { useLandingLegalDocuments } from "@/components/landing/legal/useLandingLegalDocuments";

export function Footer({ agency }: { agency: AgencyConfig }) {
  const initial = agency.name.charAt(0).toUpperCase();
  const [openDoc, setOpenDoc] = useState<"privacy" | "terms" | null>(null);
  const { privacy, terms } = useLandingLegalDocuments(agency, "Transamerica Comandatuba");
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              {agency.logoUrl ? (
                <img src={agency.logoUrl} alt={agency.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: agency.primaryColor }}
                  aria-hidden
                >
                  {initial}
                </div>
              )}
              <div className="leading-tight">
                <p className="font-display text-[15px] font-bold text-slate-900">{agency.name}</p>
                <p className="text-[11px] text-slate-500">{FOOTER_COPY.tagline}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-[13.5px] text-slate-600">
            <p className="font-semibold text-slate-800">Fale conosco</p>
            <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: agency.primaryColor }} /> WhatsApp: +{agency.whatsapp}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: agency.primaryColor }} /> {agency.phone}</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: agency.primaryColor }} /> {agency.email}</p>
          </div>

          <div className="space-y-3 text-[13.5px] text-slate-600">
            <p className="font-semibold text-slate-800">Atendimento</p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: agency.primaryColor }} />
              {agency.city ? `${agency.city} • Atendimento on-line` : "Atendimento on-line"}
            </p>
            {agency.hours ? (
              <p className="flex items-center gap-2"><Clock className="h-4 w-4" style={{ color: agency.primaryColor }} /> {agency.hours}</p>
            ) : null}
          </div>

          <div className="space-y-2 text-[13.5px] text-slate-600">
            <p className="font-semibold text-slate-800">Institucional</p>
            <button type="button" onClick={() => setOpenDoc("privacy")} className="block text-left hover:underline">
              Política de privacidade
            </button>
            <button type="button" onClick={() => setOpenDoc("terms")} className="block text-left hover:underline">
              Termos de uso
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto max-w-[1280px] space-y-2 px-5 py-4 text-center text-[11.5px] text-slate-400 sm:px-8">
          <p className="leading-relaxed">{FOOTER_COPY.legal}</p>
          <p>© {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.</p>
        </div>
      </div>

      <LegalDocumentModal
        doc={privacy}
        open={openDoc === "privacy"}
        onOpenChange={(o) => setOpenDoc(o ? "privacy" : null)}
        accentColor={agency.primaryColor}
      />
      <LegalDocumentModal
        doc={terms}
        open={openDoc === "terms"}
        onOpenChange={(o) => setOpenDoc(o ? "terms" : null)}
        accentColor={agency.primaryColor}
      />
    </footer>
  );
}