import { Link } from "react-router-dom";
import { MessageCircle, MapPin, Menu, X, Phone, UserRound, Mail, Instagram } from "lucide-react";
import { useState } from "react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";
import {
  isEditorialTheme,
  isLuxuryTheme,
  siteContainer,
  siteThemeRootClass,
} from "@/lib/agencySiteTheme";
import { useAgencySiteThemeOnBody } from "@/lib/agencySitePortalTheme";
import {
  logoIncludesWordmark,
  resolveAgencyHeaderBrandPreset,
  resolveAgencyLogoUrl,
} from "@/lib/agencySiteBrand";
import { resolveSiteContacts } from "@/lib/agencySiteContacts";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { sectionOverrideEnabled } from "@/lib/agencySiteConfig";
import { agencyContextHref, agencySiteHref } from "@/lib/agencyContextLink";
import { useAgencyBrowserTitle } from "@/hooks/useAgencyBrowserTitle";

export const NAV_LINKS = [
  { label: "Início", to: "/" },
  { label: "Solicitações", to: "/#solicitacoes" },
  { label: "Experiências", to: "/#campanhas" },
  { label: "Ofertas", to: "/ofertas" },
  { label: "Sobre", to: "/#sobre" },
  { label: "Atendimento", to: "/#atendimento" },
  { label: "Área do Cliente", to: "/area-do-cliente" },
];

/**
 * Navegação efetiva do hostname: quando o perfil desativa a seção de ofertas,
 * o link "/ofertas" também sai do menu (config declarativa, sem condicional
 * por agência). Nenhum tenant atual é afetado — o default mantém o link.
 */
export function siteNavLinks(hostname?: string | null) {
  const profile = resolveSiteProfile(hostname);
  if (profile.nav?.length) return profile.nav;
  const offersEnabled = sectionOverrideEnabled(profile.sections?.offers);
  return NAV_LINKS.filter((l) => offersEnabled || l.to !== "/ofertas");
}

export function AgencyBrandBar({ info }: { info: AgencyDomainInfo }) {
  const [open, setOpen] = useState(false);
  const name = agencyDisplayName(info);
  const editorial = isEditorialTheme(info.hostname);
  const wa = agencyWhatsappNumber(info);
  const logoUrl = resolveAgencyLogoUrl(info);
  const headerBrand = resolveAgencyHeaderBrandPreset(info.hostname);
  const headerLogoUrl = headerBrand.logoUrl ?? logoUrl;
  const navAll = siteNavLinks(info.hostname);

  if (editorial) {
    const mainLinks = navAll.filter((l) => l.to !== "/area-do-cliente");
    return (
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div
          className={`${siteContainer(true)} flex items-center justify-between gap-6 ${headerBrand.headerClassName}`}
        >
          <Link to={agencyContextHref("/")} className="flex min-w-0 items-center gap-3">
            {headerLogoUrl ? (
              <img
                src={headerLogoUrl}
                alt={`Logo ${name}`}
                className={headerBrand.logoClassName}
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-foreground text-lg font-bold text-background">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            {/* Logotipos que já contêm o nome da marca não repetem o wordmark. */}
            {!headerBrand.logoOnly && !(headerLogoUrl && logoIncludesWordmark(info.hostname)) && (
              <span className="truncate text-lg font-bold tracking-tight text-foreground md:text-xl">
                <BrandText>{name}</BrandText>
              </span>
            )}
          </Link>


          <nav className={`hidden items-center lg:flex ${resolveSiteProfile(info.hostname).navDensity === "compact" ? "gap-4 xl:gap-5" : "gap-8"}`}>
            {mainLinks.map((l) => (
              <a
                key={l.to}
                href={agencySiteHref(l.to)}
                className="text-[15px] font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <a
              href={agencySiteHref("/area-do-cliente")}
              className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Área do Cliente
            </a>
            {wa && (
              <Button
                asChild
                size="lg"
                className="h-11 rounded-lg bg-[hsl(var(--wl-ink))] px-5 text-white hover:bg-[hsl(var(--wl-ink))]/90"
              >
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
              {navAll.map((l) => (
                <a
                  key={l.to}
                  href={agencySiteHref(l.to)}
                  onClick={() => setOpen(false)}
                  className="min-h-[52px] py-3.5 text-[15px] font-medium text-foreground/80"
                >
                  {l.label}
                </a>
              ))}
              {wa && (
                <Button
                  asChild
                  size="lg"
                  className="my-3 h-12 rounded-lg bg-[hsl(var(--wl-ink))] text-white hover:bg-[hsl(var(--wl-ink))]/90"
                >
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
      <div className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 ${headerBrand.headerClassName}`}>
        <Link to={agencyContextHref("/")} className="flex items-center gap-3 min-w-0">
          {headerLogoUrl ? (
            <img src={headerLogoUrl} alt={`Logo ${name}`} className={headerBrand.logoClassName} />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-semibold">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          {!headerBrand.logoOnly && (
            <span className="truncate text-base font-semibold text-foreground">
              <BrandText>{name}</BrandText>
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navAll.map((l) => (
            <a
              key={l.to}
              href={agencySiteHref(l.to)}
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
            {navAll.map((l) => (
              <a
                key={l.to}
                href={agencySiteHref(l.to)}
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
  const luxury = isLuxuryTheme(info.hostname);
  const logoUrl = resolveAgencyLogoUrl(info);
  /* Canais extras declarativos (e-mail público / Instagram) — vazio por padrão. */
  const contacts = resolveSiteContacts(info.hostname);
  const profile = resolveSiteProfile(info.hostname);
  const footer = profile.footer;
  const footerWhatsapp = footer?.whatsapp?.replace(/\D/g, "") || wa;
  const navAll = siteNavLinks(info.hostname);

  if (luxury) {
    const navLinks = navAll.filter((l) => l.to !== "/" && l.to !== "/area-do-cliente");
    const legalLinks = [
      { label: "Política de Privacidade", to: "/politicasdeprivacidade" },
      { label: "Termos de Uso", to: "/termosdeuso" },
    ];
    return (
      <footer id="rodape" className="wl-luxury-footer">
        <div className={`${siteContainer(true)} grid gap-12 py-16 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] md:gap-10`}>
          <div>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${name}`}
                loading="lazy"
                className="h-16 w-auto max-w-[260px] object-contain md:h-[72px] md:max-w-[300px]"
              />
            ) : (
              <p className="text-lg font-bold tracking-tight text-[hsl(var(--wl-ink))]">
                <BrandText>{name}</BrandText>
              </p>
            )}
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[hsl(var(--wl-ink)_/_0.85)]">
              Consultoria de viagens com acompanhamento do primeiro contato ao retorno.
            </p>
            {location && (
              <p className="mt-6 flex items-center gap-2 text-sm text-[hsl(var(--wl-ink)_/_0.85)]">
                <MapPin className="h-4 w-4 shrink-0 wl-accent-icon" aria-hidden="true" /> {location}
              </p>
            )}
          </div>

          <div>
            <p className="wl-footer-title text-[11px] font-bold uppercase tracking-[0.18em]">Navegação</p>
            <ul className="mt-5 space-y-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={agencySiteHref(l.to)}
                    className="inline-block py-0.5 text-[15px] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="wl-footer-title text-[11px] font-bold uppercase tracking-[0.18em]">Atendimento</p>
            <ul className="mt-5 space-y-3">
              {wa ? (
                <li>
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-0.5 text-[15px] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 wl-accent-icon" aria-hidden="true" /> Falar no WhatsApp
                  </a>
                </li>
              ) : null}
              {info.phone ? (
                <li className="flex items-center gap-2 text-[15px]">
                  <Phone className="h-4 w-4 shrink-0 wl-accent-icon" aria-hidden="true" /> {info.phone}
                </li>
              ) : null}
              <li>
                <a
                  href={agencySiteHref("/area-do-cliente")}
                  className="inline-flex items-center gap-2 py-0.5 text-[15px] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                >
                  <UserRound className="h-4 w-4 shrink-0 wl-accent-icon" aria-hidden="true" /> Área do Cliente
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="wl-footer-title text-[11px] font-bold uppercase tracking-[0.18em]">Legal</p>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={agencySiteHref(l.to)}
                    className="inline-block py-0.5 text-[15px] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="wl-footer-divider border-t">
          <div className={`${siteContainer(true)} py-6 text-xs wl-footer-copyright`}>
            © {new Date().getFullYear()} <BrandText>{name}</BrandText>. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    );
  }

  if (editorial) {
    const navLinks = navAll.filter((l) => l.to !== "/" && l.to !== "/area-do-cliente");
    const legalLinks = [
      { label: "Política de Privacidade", to: "/politicasdeprivacidade" },
      { label: "Termos de Uso", to: "/termosdeuso" },
    ];
    return (
      <footer id="rodape" className="bg-[var(--brand-tertiary,hsl(var(--wl-sand)))] text-[hsl(var(--wl-ink))]">
        <div className={`${siteContainer(true)} grid gap-12 py-16 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] md:gap-10`}>
          <div>
            {logoUrl ? (
              <span className="inline-flex rounded-lg bg-white p-3 shadow-[0_1px_2px_hsl(0_0%_0%/0.35)]">
                <img
                  src={logoUrl}
                  alt={`Logo ${name}`}
                  loading="lazy"
                  className="h-12 w-auto max-w-[200px] object-contain"
                />
              </span>

            ) : (
              <p className="text-lg font-bold tracking-tight text-[hsl(var(--wl-ink))]">
                <BrandText>{name}</BrandText>
              </p>
            )}
            <p className="mt-5 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-[hsl(var(--wl-ink)_/_0.75)]">
              {footer?.description ?? "Consultoria de viagens com acompanhamento do primeiro contato ao retorno."}
            </p>
            {(footer?.address || (footer?.showLocation !== false && location)) && (
              <p className="mt-6 flex items-center gap-2 text-sm text-[hsl(var(--wl-ink)_/_0.75)]">
                <MapPin className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" /> {footer?.address ?? location}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-ink)_/_0.7)]">Navegação</p>
            <ul className="mt-5 space-y-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={agencySiteHref(l.to)}
                    className="inline-block py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-ink)_/_0.7)]">Atendimento</p>
            <ul className="mt-5 space-y-3">
              {footerWhatsapp ? (
                <li>
                  <a
                    href={`https://wa.me/${footerWhatsapp.startsWith("55") ? footerWhatsapp : `55${footerWhatsapp}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" /> {footer?.whatsapp ? `WhatsApp ${footer.whatsapp}` : "Falar no WhatsApp"}
                  </a>
                </li>
              ) : null}
              {(footer?.phone || info.phone) ? (
                <li className="flex items-center gap-2 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)]">
                  <Phone className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" /> {footer?.phone ?? info.phone}
                </li>
              ) : null}
              {(footer?.email || contacts.email) ? (
                <li>
                  <a
                    href={`mailto:${footer?.email ?? contacts.email}`}
                    className="inline-flex items-center gap-2 py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" />
                    <span className="break-all">{footer?.email ?? contacts.email}</span>
                  </a>
                </li>
              ) : null}
              {(footer?.instagram || contacts.instagram) ? (
                <li>
                  <a
                    href={footer?.instagram ?? contacts.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    <Instagram className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" />
                    {footer?.instagramLabel ?? contacts.instagramLabel ?? "Instagram"}
                  </a>
                </li>
              ) : null}
              <li>
                <a
                  href={agencySiteHref("/area-do-cliente")}
                  className="inline-flex items-center gap-2 py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                >
                  <UserRound className="h-4 w-4 shrink-0 text-[hsl(var(--wl-ink)_/_0.7)]" aria-hidden="true" /> Área do Cliente
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--wl-ink)_/_0.7)]">Legal</p>
            <ul className="mt-5 space-y-3">
              {footer?.legalName && <li className="text-[15px] text-[hsl(var(--wl-ink)_/_0.8)]">{footer.legalName}</li>}
              {footer?.cnpj && <li className="text-[15px] text-[hsl(var(--wl-ink)_/_0.8)]">CNPJ {footer.cnpj}</li>}
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <a
                    href={agencySiteHref(l.to)}
                    className="inline-block py-0.5 text-[15px] text-[hsl(var(--wl-ink)_/_0.8)] transition-colors hover:text-[hsl(var(--wl-ink))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--wl-ink))]"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--brand-border,hsl(var(--wl-ink)_/_0.12))] bg-[var(--brand-tertiary,hsl(var(--wl-sand)))]">
          <div className={`${siteContainer(true)} py-6 text-xs text-[hsl(var(--wl-ink)_/_0.65)]`}>
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
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo ${name}`} className="h-10 w-auto max-w-[160px] object-contain" />
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
            <a className="hover:text-foreground" href={agencySiteHref("/area-do-cliente")}>Área do Cliente</a>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Institucional</p>
          <p className="text-sm text-muted-foreground">
            <a className="hover:text-foreground" href={agencySiteHref("/politicasdeprivacidade")}>Política de Privacidade</a>
          </p>
          <p className="text-sm text-muted-foreground">
            <a className="hover:text-foreground" href={agencySiteHref("/termosdeuso")}>Termos de Uso</a>
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
  // Propaga o tema do tenant para o `body`, para que Dialog/Popover/Select/
  // Calendar renderizados em portal herdem os tokens da agência.
  useAgencySiteThemeOnBody(info.hostname);
  useAgencyBrowserTitle(info.hostname);
  return (
    <div className={`min-h-screen bg-background ${siteThemeRootClass(info.hostname)}`}>
      <AgencyBrandBar info={info} />
      <main>{children}</main>
      <AgencyFooter info={info} />
    </div>
  );
}