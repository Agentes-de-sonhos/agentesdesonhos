import { Home, LogOut, MapPinned, MessageCircle, FileText, UserRound } from "lucide-react";
import { BrandText } from "@/components/ui/brand-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import { CLIENT_AREA_NAV, type ClientAreaView } from "@/lib/clientAreaNav";

const ICONS: Record<ClientAreaView, typeof Home> = {
  inicio: Home,
  viagens: MapPinned,
  documentos: FileText,
  perfil: UserRound,
  atendimento: MessageCircle,
};

interface ShellProps {
  info: AgencyDomainInfo;
  view: ClientAreaView;
  onChangeView: (view: ClientAreaView) => void;
  clientName: string | null;
  clientEmail: string;
  onLogout: () => void;
  children: React.ReactNode;
}

/**
 * Casca autenticada da Área do Cliente: cabeçalho compacto da agência,
 * navegação lateral no desktop e barra inferior no celular. Toda a identidade
 * vem dos tokens do tema White Label — nenhuma cor é fixada em código.
 */
export function ClientAreaShell({
  info, view, onChangeView, clientName, clientEmail, onLogout, children,
}: ShellProps) {
  const name = agencyDisplayName(info);
  const initial = (clientName || clientEmail).trim().slice(0, 1).toUpperCase();

  return (
    <div className="min-h-[70vh] bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-6 md:pb-16 md:pt-10">
        {/* Cabeçalho da área autenticada */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            {info.logo_url ? (
              <img
                src={info.logo_url}
                alt={`Logotipo da ${name}`}
                className="h-10 w-auto max-w-[140px] object-contain md:h-12 md:max-w-[180px]"
                loading="lazy"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground md:text-base">
                <BrandText>{name}</BrandText>
              </span>
              <span className="block text-xs text-muted-foreground">Área do Cliente</span>
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden items-center gap-2 sm:flex">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              >
                {initial}
              </span>
              <span className="max-w-[180px] truncate text-sm text-muted-foreground">
                {clientName || clientEmail}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sair
            </Button>
          </div>
        </header>

        <div className="mt-6 gap-6 md:flex md:items-start">
          {/* Navegação desktop/tablet */}
          <nav
            aria-label="Seções da Área do Cliente"
            className="hidden w-60 shrink-0 flex-col gap-1 rounded-3xl border border-border/60 bg-card p-3 shadow-sm md:flex"
          >
            {CLIENT_AREA_NAV.map((item) => {
              const Icon = ICONS[item.view];
              const active = item.view === view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onChangeView(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground/75 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>

      {/* Navegação inferior no celular */}
      <nav
        aria-label="Navegação da Área do Cliente"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {CLIENT_AREA_NAV.filter((i) => i.mobileBar).map((item) => {
            const Icon = ICONS[item.view];
            const active = item.view === view;
            return (
              <li key={item.view} className="flex-1">
                <button
                  type="button"
                  onClick={() => onChangeView(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
