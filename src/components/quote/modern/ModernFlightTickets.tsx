import { Plane, Luggage } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function parseLocal(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function toMin(t?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? +m[1] * 60 + +m[2] : null;
}

export function flightDuration(dep?: string, arr?: string): string | null {
  const a = toMin(dep), b = toMin(arr);
  if (a == null || b == null) return null;
  let d = b - a;
  if (d <= 0) d += 24 * 60;
  const h = Math.floor(d / 60), m = d % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}

type Leg = Record<string, any>;

function Ticket({ label, legs, fallbackDate, airline, baggage }: { label: string; legs: Leg[]; fallbackDate?: string; airline?: string; baggage: boolean }) {
  if (!legs.length) return null;
  const first = legs[0], last = legs[legs.length - 1];
  const date = parseLocal(first.leg_date || fallbackDate);
  const stops = legs.length - 1;
  const dur = legs.length === 1 ? flightDuration(first.departure_time, last.arrival_time) : null;
  const numbers = legs.map((l) => l.flight_number).filter(Boolean).join(" · ");
  const code = (c?: string, city?: string) => (c || city || "—").toUpperCase().slice(0, c ? 4 : 14);
  return (
    <div className="relative rounded-2xl border border-border/50 bg-muted/30 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">{label}</span>
        {date && <span className="font-mono text-sm text-muted-foreground">{format(date, "EEE, dd MMM yyyy", { locale: ptBR })}</span>}
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <div className="min-w-0">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">{code(first.airport_origin, first.origin_city)}</div>
          <div className="mt-1 font-mono text-lg font-semibold text-foreground">{first.departure_time || "—"}</div>
          <div className="truncate text-sm text-muted-foreground">{first.origin_city}</div>
        </div>
        <div className="flex flex-col items-center pt-3 text-center">
          <div className="flex items-center gap-1 text-primary/60">
            <span className="hidden sm:block w-8 border-t-2 border-dashed border-primary/40" />
            <Plane className="h-5 w-5 text-primary" />
            <span className="hidden sm:block w-8 border-t-2 border-dashed border-primary/40" />
          </div>
          {dur && <div className="mt-1 font-mono text-xs text-muted-foreground">{dur}</div>}
          <div className={`mt-1 text-xs font-semibold ${stops ? "text-muted-foreground" : "text-success"}`}>
            {stops ? `${stops} ${stops > 1 ? "conexões" : "conexão"}` : "voo direto"}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">{code(last.airport_destination, last.destination_city)}</div>
          <div className="mt-1 font-mono text-lg font-semibold text-foreground">{last.arrival_time || "—"}</div>
          <div className="truncate text-sm text-muted-foreground">{last.destination_city}</div>
        </div>
      </div>
      {stops > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Conexão em {legs.slice(0, -1).map((l) => l.airport_destination || l.destination_city).filter(Boolean).join(", ")}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-sm text-foreground/80">
        <Luggage className="h-4 w-4 text-primary" />
        {baggage ? "Bagagem despachada inclusa" : "Bagagem despachada não inclusa"}
      </div>
      <div className="my-4 border-t-2 border-dashed border-border" />
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Operado por <span className="font-semibold text-foreground">{airline || "Companhia aérea"}</span></span>
        {numbers && <span className="font-mono text-muted-foreground">Voo {numbers}</span>}
      </div>
    </div>
  );
}

export function ModernFlightTickets({ data, outbound, return_, internal }: { data: any; outbound: Leg[]; return_: Leg[]; internal: Leg[] }) {
  const hasReturn = !data.is_one_way && return_.length > 0;
  const baggage = !!data.includes_baggage;
  return (
    <div className="space-y-4" data-modern-flight="true">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plane className="h-5 w-5" /></div>
        <div>
          <div className="text-xl font-semibold text-foreground">Voos</div>
          <div className="text-sm text-muted-foreground">{data.airline || "Companhia aérea"} · {hasReturn ? "ida e volta" : "somente ida"}</div>
        </div>
      </div>
      <div className={`grid gap-4 ${hasReturn ? "md:grid-cols-2" : ""}`}>
        <Ticket label="Ida" legs={outbound} fallbackDate={data.departure_date} airline={data.airline} baggage={baggage} />
        {hasReturn && <Ticket label="Volta" legs={return_} fallbackDate={data.return_date} airline={data.airline} baggage={baggage} />}
      </div>
      {internal.length > 0 && <Ticket label="Trecho interno" legs={internal} airline={data.airline} baggage={baggage} />}
    </div>
  );
}
