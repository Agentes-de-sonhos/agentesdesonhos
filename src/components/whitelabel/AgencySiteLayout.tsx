import { Link } from "react-router-dom";
import { MessageCircle, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";

export const NAV_LINKS = [
  { label: "Início", to: "/" },
  { label: "Serviços", to: "/#servicos" },
  { label: "Ofertas", to: "/ofertas" },
  { label: "Sobre", to: "/#sobre" },
  { label: "Atendimento", to: "/#atendimento" },
  { label: "Área do Cliente", to: "/area-do-cliente" },
];

export function AgencyBrandBar({ info }: { info: AgencyDomainInfo }) {
  const [open, setOpen] = useState(false);
  const name = agencyDisplayName(info);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          {info.logo_url ? (
            <img src={info.logo_url} alt={`Logo ${name}`} className="h-10 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-semibold">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-semibold text-foreground">
            <BrandText>{name}</BrandText>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="md:hidden rounded-lg p-2 text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-foreground/80"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function AgencyFooter({ info }: { info: AgencyDomainInfo }) {
  const name = agencyDisplayName(info);
  const wa = agencyWhatsappNumber(info);
  const location = [info.city, info.state].filter(Boolean).join(" · ");

  return (
    <footer id="rodape" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          {info.logo_url ? (
            <img src={info.logo_url} alt={`Logo ${name}`} className="h-10 w-auto max-w-[160px] object-contain" />
          ) : null}
          <p className="text-sm font-semibold text-foreground">
            <BrandText>{name}</BrandText>
          </p>
          {location && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {location}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Atendimento</p>
          {wa ? (
            <Button asChild variant="outline" size="sm">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Solicite seu atendimento pelo formulário de contato.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            <a className="hover:text-foreground" href="/area-do-cliente">Área do Cliente</a>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Institucional</p>
          <p className="text-sm text-muted-foreground">
            <a className="hover:text-foreground" href="/politicasdeprivacidade">Política de Privacidade</a>
          </p>
          <p className="text-sm text-muted-foreground">
            <a className="hover:text-foreground" href="/termosdeuso">Termos de Uso</a>
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} <BrandText>{name}</BrandText>. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export function AgencySiteLayout({
  info,
  children,
}: {
  info: AgencyDomainInfo;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AgencyBrandBar info={info} />
      <main>{children}</main>
      <AgencyFooter info={info} />
    </div>
  );
}