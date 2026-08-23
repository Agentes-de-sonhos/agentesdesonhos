import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandText } from "@/components/ui/brand-text";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import { agencyWhatsappLink } from "@/lib/clientAreaAccess";

export const SUPPORT_MESSAGE =
  "Olá! Estou acessando minha Área do Cliente e preciso de ajuda.";

/** Telefone legível a partir do que a agência cadastrou (sem inventar dígitos). */
function readablePhone(phone?: string | null): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return local.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (local.length === 10) return local.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return null;
}

/**
 * Atendimento humano da agência: exibe APENAS canais realmente configurados.
 * Sem WhatsApp, cai para telefone; sem nenhum canal, orienta sem botão quebrado.
 */
export function ClientAreaSupportCard({
  info,
  email,
  compact = false,
}: {
  info: AgencyDomainInfo;
  email?: string | null;
  compact?: boolean;
}) {
  const name = agencyDisplayName(info);
  const whatsapp = agencyWhatsappLink(info.phone, SUPPORT_MESSAGE);
  const phone = readablePhone(info.phone);
  const contactEmail = (email || "").trim() || null;

  return (
    <section
      aria-labelledby="ca-atendimento"
      className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8"
    >
      <h2 id="ca-atendimento" className="text-lg font-semibold text-foreground">
        Atendimento da <BrandText>{name}</BrandText>
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Aqui você fala com pessoas de verdade. Nossa equipe acompanha a sua viagem do
        início ao fim.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {whatsapp ? (
          <Button asChild size="lg" className="min-h-11">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
            </a>
          </Button>
        ) : phone ? (
          <Button asChild size="lg" className="min-h-11">
            <a href={`tel:+55${(info.phone || "").replace(/\D/g, "").slice(-11)}`}>
              <Phone className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
            </a>
          </Button>
        ) : contactEmail ? (
          <Button asChild size="lg" className="min-h-11">
            <a href={`mailto:${contactEmail}`}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Utilize o canal de atendimento informado pela sua agência.
          </p>
        )}
      </div>

      {!compact && (phone || contactEmail) && (
        <dl className="mt-6 grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
          {phone && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</dt>
              <dd className="mt-1 text-sm text-foreground">{phone}</dd>
            </div>
          )}
          {contactEmail && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</dt>
              <dd className="mt-1 break-all text-sm text-foreground">{contactEmail}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
