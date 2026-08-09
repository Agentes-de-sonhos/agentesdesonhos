import { Link } from "react-router-dom";
import { MessageCircle, MapPin, Menu, X, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";
import {
  EDITORIAL_ROOT_CLASS,
  isEditorialTheme,
  siteContainer,
} from "@/lib/agencySiteTheme";

export const NAV_LINKS = [
  { label: "Início", to: "/" },
  { label: "Solicitações", to: "/#solicitacoes" },
  { label: "Experiências", to: "/#campanhas" },
  { label: "Ofertas", to: "/ofertas" },
  { label: "Sobre", to: "/#sobre" },
  { label: "Atendimento", to: "/#atendimento" },
  { label: "Área do Cliente", to: "/area-do-cliente" },
];

export function AgencyBrandBar({ info }: { info: AgencyDomainInfo }) {
  const [open, setOpen] = useState(false);
  const name = agencyDisplayName(info);
  const editorial = isEditorialTheme(info.hostname);
  const wa = agencyWhatsappNumber(info);

  if (editorial) {
    const mainLinks = NAV_LINKS.filter((l) => l.to !== "/area-do-cliente");
    return (
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className={`${siteContainer(true)} flex h-20 items-center justify-between gap-6`}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            {info.logo_url ? (
              <img
                src={info.logo_url}
                alt={`Logo ${name}`}
                className="h-12 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-foreground text-lg font-bold text-background">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight text-foreground md:text-xl">
              <BrandText>{name}</BrandText>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {mainLinks.map((l) => (
              <a
                key={l.to}
                href={l.to}
                className="text-[15px] font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <a
              href="/area-do-cliente"
              className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Área do Cliente
            </a>
            {wa && (
              <Button asChild size="lg" className="h-11 rounded-lg px-5">
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Atendimento
                </a>
              </Button>
            )}
          </div>

          <button
            type="button"
            className="-mr-2 rounded-lg p-3 text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <nav className={`${siteContainer(true)} flex flex-col py-2`}>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.to}
                  href={l.to}
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] py-3.5 text-[15px] font-medium text-foreground/80"
                >
                  {l.label}
                </a>
              ))}
              {wa && (
                <Button asChild size="lg" className="my-3 h-12 rounded-lg">
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Atendimento
                  </a>
                </Button>
              )}
            </nav>
          </div>
        )}
      </header>
    );
  }

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
  const editorial = isEditorialTheme(info.hostname);

  if (editorial) {
    const navLinks = NAV_LINKS.filter((l) => l.to !== "/" && l.to !== "/area-do-cliente");
    const legalLinks = [
      { label: "Política de Privacidade", to: "/politicasdeprivacidade" },
      { label: "Termos de Uso", to: "/termosdeuso" },
    ];
    return (
      <footer id="rodape" className="border-t border-border/70 bg-[hsl(var(--wl-sand))] text-foreground">
        <div className={`${siteContainer(true)} grid gap-12 py-16 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] md:gap-10`}>
          <div>
            {info.logo_url ? (
              <span className="inline-flex rounded-lg bg-card p-3 shadow-[0_1px_2px_hsl(220_12%_10%/0.08)]">
                <img
                  src={info.logo_url}
                  alt={`Logo ${name}`}
                  loading="lazy"
                  className="h-12 w-auto max-w-[200px] object-contain"
                />
              </span>
            ) : (
              <p className="text-lg font-bold tracking-tight text-foreground">
                <BrandText>{name}</BrandText>
              </p>
            )}
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Consultoria de viagens com acompanhamento do primeiro contato ao retorno.
            </p>
            {location && (
              <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {location}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Navegação</p>
            <ul className="mt-5 space-y-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={l.to}
                    className="inline-block py-0.5 text-[15px] text-foreground/75 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Atendimento</p>
            <ul className="mt-5 space-y-3">
              {wa ? (
                <li>
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-0.5 text-[15px] text-foreground/75 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Falar no WhatsApp
                  </a>
                </li>
              ) : null}
              {info.phone ? (
                <li className="flex items-center gap-2 text-[15px] text-foreground/75">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {info.phone}
                </li>
              ) : null}
              <li>
                <a
                  href="/area-do-cliente"
                  className="inline-flex items-center gap-2 py-0.5 text-[15px] text-foreground/75 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Área do Cliente
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Legal</p>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={l.to}
                    className="inline-block py-0.5 text-[15px] text-foreground/75 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-foreground/10">
          <div className={`${siteContainer(true)} py-6 text-xs text-muted-foreground`}>
            © {new Date().getFullYear()} <BrandText>{name}</BrandText>. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    );
  }

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
  const editorial = isEditorialTheme(info.hostname);
  return (
    <div className={`min-h-screen bg-background ${editorial ? EDITORIAL_ROOT_CLASS : ""}`}>
      <AgencyBrandBar info={info} />
      <main>{children}</main>
      <AgencyFooter info={info} />
    </div>
  );
}