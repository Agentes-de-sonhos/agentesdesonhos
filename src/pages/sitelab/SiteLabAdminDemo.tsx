import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Inbox, Settings2, Users } from "lucide-react";
import {
  DEMO_KPIS,
  DEMO_REQUESTS,
  DEMO_TRIPS,
  formatDemoDate,
} from "@/pages/sitelab/sitelabFixtures";

/** Gestão administrativa demonstrativa — fixtures isoladas, nenhum dado real. */
export default function SiteLabAdminDemo() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-primary)]">
          Gestão
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Painel da agência</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral de solicitações, vendas e próximas viagens.
        </p>
      </header>

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

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: Inbox, label: "Solicitações" },
          { icon: Users, label: "Clientes" },
          { icon: BarChart3, label: "Financeiro" },
          { icon: Settings2, label: "Configurações" },
        ].map(({ icon: Icon, label }) => (
          <Button
            key={label}
            variant="outline"
            className="h-auto justify-start gap-3 border-[var(--brand-border)] bg-[var(--brand-tertiary)] py-4"
          >
            <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
            {label}
          </Button>
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
