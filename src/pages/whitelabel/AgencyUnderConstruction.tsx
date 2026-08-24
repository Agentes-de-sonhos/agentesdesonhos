import { useEffect } from "react";
import { MapPin, MessageCircle } from "lucide-react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
  formatCnpj,
} from "@/lib/agencyDomains";
import { configuredCnpj, resolveConstructionVariant } from "@/lib/agencySiteStatus";
import DestinosComAJuComingSoon from "@/pages/whitelabel/DestinosComAJuComingSoon";

/** Só aceita cores simples e seguras vindas do cadastro (hex). */
function safeAccent(color?: string | null): string | null {
  const value = (color || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : null;
}

/**
 * Página temporária ("site em construção") do domínio de uma agência.
 * Usa exclusivamente a identidade da agência — nunca a marca da plataforma.
 */
export default function AgencyUnderConstruction({ info }: { info: AgencyDomainInfo }) {
  const name = agencyDisplayName(info);
  const wa = agencyWhatsappNumber(info);
  const location = [info.city, info.state].filter(Boolean).join(" / ");
  const cnpj = formatCnpj(info.cnpj) ?? formatCnpj(configuredCnpj(info.hostname));
  const accent = safeAccent(info.primary_color);
  const year = new Date().getFullYear();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${name} — Novo site em construção`;

    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;
    description?.setAttribute(
      "content",
      `${name} está preparando uma nova experiência online. Fale com a nossa equipe enquanto o novo site é finalizado.`,
    );

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
      robots.remove();
    };
  }, [name]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(40_30%_98%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.07]"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${accent ?? "hsl(var(--primary))"}, transparent)` }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {info.logo_url ? (
          <img
            src={info.logo_url}
            alt={`Logo ${name}`}
            className="h-20 w-auto max-w-[240px] object-contain sm:h-24"
          />
        ) : (
          <span
            className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-bold text-white shadow-sm"
            style={{ backgroundColor: accent ?? "hsl(var(--foreground))" }}
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}

        <span
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent ?? "hsl(var(--primary))" }}
            aria-hidden="true"
          />
          Site em construção
        </span>

        <h1 className="mt-6 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Estamos preparando uma nova experiência para você.
        </h1>

        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          Em breve, o novo site da <BrandText>{name}</BrandText> estará no ar.
        </p>

        <div
          className="mt-8 h-px w-24"
          style={{ backgroundColor: accent ?? "hsl(var(--border))" }}
          aria-hidden="true"
        />

        {location && (
          <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {location}
          </p>
        )}

        {cnpj && (
          <p className="mt-2 text-sm text-muted-foreground">CNPJ {cnpj}</p>
        )}

        {wa && (
          <Button
            asChild
            size="lg"
            className="mt-10 h-12 w-full rounded-xl px-6 sm:w-auto"
            style={accent ? { backgroundColor: accent, color: "#fff" } : undefined}
          >
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Falar com a agência
            </a>
          </Button>
        )}
      </main>

      <footer className="relative border-t border-border/60 py-6">
        <p className="mx-auto max-w-2xl px-6 text-center text-xs text-muted-foreground">
          © {year} <BrandText>{name}</BrandText>
          {cnpj ? ` · CNPJ ${cnpj}` : ""}
        </p>
      </footer>
    </div>
  );
}
