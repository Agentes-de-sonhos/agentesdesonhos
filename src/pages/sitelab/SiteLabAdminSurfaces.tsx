/**
 * Superfícies demonstrativas da Gestão do Site Lab.
 *
 * Cada categoria do menu tem o SEU formato visual (cabeçalho, toolbar, tabs,
 * cards, tabela, funil, editor), sem uma única tela genérica para tudo.
 * Todos os dados vêm de fixtures locais: nenhuma consulta, gravação, mensagem,
 * upload ou automação real acontece no laboratório.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Download, FlaskConical, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS } from "@/lib/agencyAdminMenu";
import { sitelabAdminHref, type SiteLabSurfaceKind } from "@/lib/sitelabAdminNav";
import {
  DEMO_AGENDA,
  DEMO_BOOKINGS,
  DEMO_CLIENTS,
  DEMO_FINANCIAL_ROWS,
  DEMO_KANBAN,
  DEMO_KPIS,
  DEMO_PROJECTS,
  DEMO_REQUESTS,
  DEMO_TRIPS,
  formatDemoDate,
} from "@/pages/sitelab/sitelabFixtures";

/** Nota discreta: reforça que nada é gravado ou enviado. */
export function DemoNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-xs text-[var(--agency-primary)]",
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" /> Demonstração: nenhum dado é
      consultado, gravado ou enviado.
    </p>
  );
}

function Toolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input readOnly placeholder="Buscar" className="pl-9" />
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="h-4 w-4" /> Filtros
      </Button>
      {children}
    </div>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                {columns.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function HomeSurface() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--agency-primary)]">{kpi.value}</p>
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
      <DemoNote />
    </div>
  );
}

function ProjectsSurface({ tab }: { tab: string }) {
  const items = DEMO_PROJECTS[tab] ?? [];
  return (
    <div className="space-y-4" data-demo-surface="projects">
      {/* Abas do grupo, derivadas da fonte única do menu */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {PROJECTS_ITEMS.map((item) => {
          const itemTab = new URLSearchParams(item.to.split("?")[1] ?? "").get("tab") ?? "orcamentos";
          const active = itemTab === tab;
          return (
            <Button
              key={item.label}
              asChild
              size="sm"
              variant={active ? "default" : "ghost"}
              aria-current={active ? "page" : undefined}
            >
              <Link to={sitelabAdminHref(item)}>{item.label}</Link>
            </Button>
          );
        })}
      </div>
      <Toolbar>
        <Button type="button" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </Toolbar>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{p.client}</p>
              <p className="text-xs">Atualizado em {formatDemoDate(p.updated)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <DemoNote />
    </div>
  );
}

function KanbanSurface() {
  return (
    <div className="space-y-4" data-demo-surface="kanban">
      <Toolbar />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEMO_KANBAN.map((col) => (
          <div key={col.stage} className="rounded-xl border bg-card p-3">
            <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {col.stage}
              <span className="rounded-full bg-muted px-2 py-0.5">{col.cards.length}</span>
            </p>
            <div className="space-y-2">
              {col.cards.map((card) => (
                <div key={card.id} className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.client}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--agency-primary)]">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <DemoNote />
    </div>
  );
}

function ClientsSurface() {
  return (
    <div className="space-y-4" data-demo-surface="clients">
      <Toolbar>
        <Button type="button" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </Toolbar>
      <DataTable
        columns={["Cliente", "Contato", "Viagens"]}
        rows={DEMO_CLIENTS.map((c) => ({
          id: c.id,
          cells: [
            <span className="font-medium">{c.name}</span>,
            <span className="text-muted-foreground">
              {c.email} · {c.phone}
            </span>,
            <Badge variant="outline">{c.trips}</Badge>,
          ],
        }))}
      />
      <DemoNote />
    </div>
  );
}

function BookingsSurface() {
  return (
    <div className="space-y-4" data-demo-surface="bookings">
      <Toolbar />
      <DataTable
        columns={["Código", "Cliente", "Serviço", "Data", "Status"]}
        rows={DEMO_BOOKINGS.map((b) => ({
          id: b.id,
          cells: [
            <span className="font-medium">{b.code}</span>,
            b.client,
            b.service,
            formatDemoDate(b.date),
            <Badge variant="secondary">{b.status}</Badge>,
          ],
        }))}
      />
      <DemoNote />
    </div>
  );
}

function FinancialSurface() {
  return (
    <div className="space-y-4" data-demo-surface="financial">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Entradas do mês", value: "R$ 6.200" },
          { label: "Despesas do mês", value: "R$ 620" },
          { label: "Resultado", value: "R$ 5.580" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-semibold text-[var(--agency-primary)]">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Toolbar>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </Toolbar>
      <DataTable
        columns={["Lançamento", "Data", "Tipo", "Valor"]}
        rows={DEMO_FINANCIAL_ROWS.map((r) => ({
          id: r.id,
          cells: [
            <span className="font-medium">{r.description}</span>,
            formatDemoDate(r.date),
            <Badge variant="outline">{r.kind}</Badge>,
            r.amount,
          ],
        }))}
      />
      <DemoNote />
    </div>
  );
}

function AgendaSurface() {
  return (
    <div className="space-y-4" data-demo-surface="agenda">
      <Toolbar />
      <Card>
        <CardContent className="divide-y p-0">
          {DEMO_AGENDA.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--agency-primary)]" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatDemoDate(a.date)} · {a.time}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <DemoNote />
    </div>
  );
}

function EditorSurface({ label }: { label: string }) {
  const steps = ["Cliente", "Viajantes", "Serviços", "Condições", "Revisão"];
  return (
    <div className="space-y-4" data-demo-surface="editor">
      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              i === 0 ? "font-semibold" : "text-muted-foreground",
            )}
            style={
              i === 0
                ? {
                    backgroundColor: "var(--agency-primary-soft)",
                    color: "var(--agency-primary)",
                    borderColor: "var(--agency-primary)",
                  }
                : undefined
            }
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{label} — etapa 1 de {steps.length}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input readOnly placeholder="Cliente" />
          <Input readOnly placeholder="Título" />
          <Input readOnly placeholder="Destino" />
          <Input readOnly placeholder="Período" />
        </CardContent>
      </Card>
      <DemoNote />
    </div>
  );
}

function AccountSurface({ label }: { label: string }) {
  return (
    <div className="space-y-4" data-demo-surface="account">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input readOnly placeholder="Nome" />
          <Input readOnly placeholder="E-mail" />
          <Input readOnly placeholder="Telefone" />
          <Input readOnly placeholder="Cidade" />
        </CardContent>
      </Card>
      <DemoNote />
    </div>
  );
}

/** Seleciona a superfície demonstrativa correspondente à categoria. */
export function SiteLabAdminSurface({
  kind,
  label,
  projectsTab,
}: {
  kind: SiteLabSurfaceKind;
  label: string;
  projectsTab: string | null;
}) {
  switch (kind) {
    case "projects":
      return <ProjectsSurface tab={projectsTab ?? "orcamentos"} />;
    case "kanban":
      return <KanbanSurface />;
    case "clients":
      return <ClientsSurface />;
    case "bookings":
      return <BookingsSurface />;
    case "financial":
      return <FinancialSurface />;
    case "agenda":
      return <AgendaSurface />;
    case "editor":
      return <EditorSurface label={label} />;
    case "account":
      return <AccountSurface label={label} />;
    default:
      return <HomeSurface />;
  }
}
