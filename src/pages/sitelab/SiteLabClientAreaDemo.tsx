import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText, MapPin, Users, Wallet } from "lucide-react";
import {
  DEMO_CLIENT,
  DEMO_DOCUMENTS,
  DEMO_TRIPS,
  formatDemoDate,
} from "@/pages/sitelab/sitelabFixtures";

/** Área do cliente demonstrativa — 100% fixtures, sem login real adicional. */
export default function SiteLabClientAreaDemo() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-primary)]">
          Área do cliente
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {DEMO_CLIENT.name}</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas viagens, documentos e a carteira digital em um só lugar.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MapPin, label: "Viagens ativas", value: "2" },
          { icon: FileText, label: "Documentos", value: String(DEMO_DOCUMENTS.length) },
          { icon: Wallet, label: "Carteira digital", value: "Disponível" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-[var(--brand-border)] bg-[var(--brand-tertiary)]">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-full bg-white/70 p-2 text-[var(--brand-primary)]">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span className="block text-base font-semibold">{value}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Minhas viagens</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_TRIPS.map((trip) => (
            <Card key={trip.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{trip.title}</CardTitle>
                  <Badge variant="secondary">{trip.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {trip.destination}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> {formatDemoDate(trip.start)} — {formatDemoDate(trip.end)}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> {trip.travelers} viajantes
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  Ver detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {DEMO_DOCUMENTS.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.trip}</p>
                </div>
                <Badge variant="outline">{doc.kind}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
