/**
 * Gestão do Site Lab.
 *
 * O menu lateral (itens, ordem, rótulos, ícones, estados aberto/recolhido e
 * gaveta no celular) deriva da MESMA fonte única do painel real das agências
 * (`src/lib/agencyAdminMenu.ts`). Nenhuma navegação sai do laboratório: os
 * itens apenas selecionam a superfície demonstrativa em memória — sem consultas,
 * gravações, mensagens ou automações reais.
 */
import { useState } from "react";
import { FlaskConical, Menu as MenuIcon, PanelLeftClose, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { agencyDisplayName, type AgencyDomainInfo } from "@/lib/agencyDomains";
import {
  CREATE_ITEMS,
  MANAGEMENT_ITEMS,
  PROJECTS_ITEMS,
  USER_ITEMS,
  type MenuItemDef,
} from "@/lib/agencyAdminMenu";
import { useSidebarCollapsed } from "@/components/whitelabel/admin/AgencyAdminSidebar";
import {
  DEMO_KPIS,
  DEMO_REQUESTS,
  DEMO_TRIPS,
  formatDemoDate,
} from "@/pages/sitelab/sitelabFixtures";

const HOME_KEY = "__home__";

function DemoSurface({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Esta área existe no painel real da agência com os mesmos itens e a mesma
          ordem. No laboratório ela é apenas demonstrativa.
        </p>
        <p className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)]">
          <FlaskConical className="h-3 w-3" aria-hidden="true" /> Demonstração: nenhum dado
          é consultado ou gravado.
        </p>
      </CardContent>
    </Card>
  );
}

function AdminHomeDemo() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--brand-primary)]">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Solicitações recentes</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {DEMO_REQUESTS.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.client}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.service} · {formatDemoDate(r.created)}
                  </p>
                </div>
                <Badge variant="secondary">{r.stage}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximas viagens</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {DEMO_TRIPS.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.destination} · {formatDemoDate(t.start)}
                  </p>
                </div>
                <Badge variant="outline">{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SidebarNav({
  info,
  active,
  collapsed = false,
  onToggle,
  onSelect,
}: {
  info: AgencyDomainInfo;
  active: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onSelect: (key: string) => void;
}) {
  const agencyName = agencyDisplayName(info);

  const item = (entry: MenuItemDef) => {
    const Icon = entry.icon;
    const isActive = active === entry.label;
    return (
      <button
        key={entry.label}
        type="button"
        onClick={() => onSelect(entry.label)}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? entry.label : undefined}
        title={entry.label}
        className={cn(
          "group flex h-9 items-center rounded-[10px] text-sm transition-colors",
          collapsed ? "w-10 justify-center" : "w-full gap-2.5 px-3",
          isActive
            ? "font-medium"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
        )}
        style={
          isActive
            ? {
                backgroundColor: "var(--brand-tertiary)",
                color: "var(--brand-primary)",
              }
            : undefined
        }
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        {!collapsed && <span className="min-w-0 truncate">{entry.label}</span>}
      </button>
    );
  };

  const section = (label: string) =>
    collapsed ? (
      <div key={label} className="mx-auto my-1.5 h-px w-6 bg-border" />
    ) : (
      <p
        key={label}
        className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400"
      >
        {label}
      </p>
    );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border/70",
          collapsed ? "justify-between px-0.5" : "gap-2 px-3",
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(HOME_KEY)}
          className={cn(
            "flex min-w-0 flex-1 items-center rounded-[10px] p-1 hover:bg-slate-100/70",
            collapsed ? "justify-center" : "gap-2",
          )}
        >
          {info.logo_url ? (
            <img src={info.logo_url} alt={agencyName} className="h-8 w-auto max-w-[34px] shrink-0 object-contain" />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold"
              style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
            >
              {agencyName.charAt(0).toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="min-w-0 truncate text-sm font-medium text-slate-900">{agencyName}</span>
          )}
        </button>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-100 lg:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {section("Criar")}
        <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
          {CREATE_ITEMS.map(item)}
        </div>
        {section("Projetos")}
        <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
          {PROJECTS_ITEMS.map(item)}
        </div>
        {section("Gestão")}
        <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
          {MANAGEMENT_ITEMS.map(item)}
        </div>
        {section("Conta")}
        <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
          {USER_ITEMS.map(item)}
        </div>
      </nav>
    </div>
  );
}

export default function SiteLabAdminDemo({ info }: { info: AgencyDomainInfo }) {
  const [active, setActive] = useState<string>(HOME_KEY);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  const agencyName = agencyDisplayName(info);

  const select = (key: string) => {
    setActive(key);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-muted/40">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-[250px]",
        )}
      >
        <SidebarNav info={info} active={active} collapsed={collapsed} onToggle={toggle} onSelect={select} />
      </aside>

      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-card/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold">{agencyName}</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarNav info={info} active={active} onSelect={select} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 max-w-full space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-primary)]">
                Gestão
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {active === HOME_KEY ? "Painel da agência" : active}
              </h1>
            </div>
            <Button size="sm" className="gap-2" onClick={() => select("Novo orçamento")}>
              <Plus className="h-4 w-4" /> Criar novo
            </Button>
          </header>

          {active === HOME_KEY ? <AdminHomeDemo /> : <DemoSurface label={active} />}
        </main>
      </div>
    </div>
  );
}
