import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, TrainFront, FileText,
  LogIn, LogOut, CalendarClock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TripService, TripServiceType } from "@/types/trip";

type EventKind =
  | "transfer" | "flight" | "train" | "cruise"
  | "hotel_checkin" | "hotel_checkout" | "attraction"
  | "car_pickup" | "car_dropoff" | "other";

interface Appointment {
  when: Date;
  hasTime: boolean;
  kind: EventKind;
  title: string;
  subtitle?: string;
  service: TripService;
}

const PRIORITY: Record<EventKind, number> = {
  transfer: 1,
  flight: 2,
  train: 3,
  cruise: 4,
  hotel_checkin: 5,
  hotel_checkout: 6,
  attraction: 7,
  car_pickup: 8,
  car_dropoff: 9,
  other: 10,
};

const ICON_FOR: Record<EventKind, any> = {
  transfer: Bus,
  flight: Plane,
  train: TrainFront,
  cruise: Ship,
  hotel_checkin: LogIn,
  hotel_checkout: LogOut,
  attraction: Ticket,
  car_pickup: Car,
  car_dropoff: Car,
  other: FileText,
};

const LABEL_FOR: Record<EventKind, string> = {
  transfer: "Transfer",
  flight: "Voo",
  train: "Trem",
  cruise: "Cruzeiro",
  hotel_checkin: "Check-in",
  hotel_checkout: "Check-out",
  attraction: "Atração",
  car_pickup: "Retirada do veículo",
  car_dropoff: "Devolução do veículo",
  other: "Compromisso",
};

function parseDateTime(dateStr?: string, timeStr?: string): { d: Date; hasTime: boolean } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, da = Number(m[3]);
  let hh = 0, mm = 0, hasTime = false;
  if (timeStr && typeof timeStr === "string") {
    const t = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (t) { hh = Number(t[1]); mm = Number(t[2]); hasTime = true; }
  }
  const d = new Date(y, mo, da, hh, mm, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return { d, hasTime };
}

function buildAppointments(services: TripService[]): Appointment[] {
  const out: Appointment[] = [];
  for (const s of services) {
    const data = (s.service_data || {}) as any;
    switch (s.service_type as TripServiceType) {
      case "flight": {
        const segs: any[] = Array.isArray(data.segments) ? data.segments : [];
        if (segs.length > 0) {
          segs.forEach((seg: any) => {
            const p = parseDateTime(seg.flight_date, seg.departure_time);
            if (!p) return;
            const title = `${seg.origin_city || data.origin_city || ""} → ${seg.destination_city || data.destination_city || ""}`.trim();
            const sub = [seg.flight_number || data.main_airline, seg.origin_airport].filter(Boolean).join(" • ");
            out.push({ when: p.d, hasTime: p.hasTime, kind: "flight", title: title || "Voo", subtitle: sub || undefined, service: s });
          });
        } else {
          const p = parseDateTime(data.departure_date, data.departure_time);
          if (p) out.push({ when: p.d, hasTime: p.hasTime, kind: "flight", title: `${data.origin_city || ""} → ${data.destination_city || ""}`.trim() || "Voo", subtitle: data.main_airline, service: s });
        }
        break;
      }
      case "hotel": {
        const ci = parseDateTime(data.check_in, data.check_in_time);
        const co = parseDateTime(data.check_out, data.check_out_time);
        if (ci) out.push({ when: ci.d, hasTime: ci.hasTime, kind: "hotel_checkin", title: data.hotel_name || "Hospedagem", subtitle: data.city, service: s });
        if (co) out.push({ when: co.d, hasTime: co.hasTime, kind: "hotel_checkout", title: data.hotel_name || "Hospedagem", subtitle: data.city, service: s });
        break;
      }
      case "car_rental": {
        const pu = parseDateTime(data.pickup_date, data.pickup_time);
        const dr = parseDateTime(data.dropoff_date, data.dropoff_time);
        if (pu) out.push({ when: pu.d, hasTime: pu.hasTime, kind: "car_pickup", title: data.rental_company || "Locação de veículo", subtitle: data.pickup_location, service: s });
        if (dr) out.push({ when: dr.d, hasTime: dr.hasTime, kind: "car_dropoff", title: data.rental_company || "Locação de veículo", subtitle: data.dropoff_location || data.pickup_location, service: s });
        break;
      }
      case "transfer": {
        const p = parseDateTime(data.date, data.time);
        if (!p) break;
        const typeMap: Record<string, string> = { arrival: "Transfer IN", departure: "Transfer OUT", inter_hotel: "Inter-hotel" };
        const route = data.origin_location && data.destination_location
          ? `${data.origin_location} → ${data.destination_location}` : data.location || "";
        out.push({ when: p.d, hasTime: p.hasTime, kind: "transfer", title: typeMap[data.transfer_type] || "Transfer", subtitle: route, service: s });
        break;
      }
      case "attraction": {
        const p = parseDateTime(data.date, data.entry_time);
        if (!p) break;
        out.push({ when: p.d, hasTime: p.hasTime, kind: "attraction", title: data.name || "Atração", subtitle: data.city, service: s });
        break;
      }
      case "cruise": {
        const p = parseDateTime(data.start_date);
        if (!p) break;
        out.push({ when: p.d, hasTime: p.hasTime, kind: "cruise", title: data.ship_name || "Cruzeiro", subtitle: data.embarkation_port, service: s });
        break;
      }
      case "train": {
        const p = parseDateTime(data.travel_date, data.departure_time);
        if (!p) break;
        out.push({ when: p.d, hasTime: p.hasTime, kind: "train", title: `${data.origin_city || ""} → ${data.destination_city || ""}`.trim() || "Trem", subtitle: data.train_company, service: s });
        break;
      }
      case "other": {
        const p = parseDateTime(data.date, data.time);
        if (!p) break;
        out.push({ when: p.d, hasTime: p.hasTime, kind: "other", title: data.service_name || "Compromisso", subtitle: data.city || data.location_name, service: s });
        break;
      }
      case "insurance":
      default:
        break;
    }
  }
  return out;
}

function pickNext(items: Appointment[], now: Date): Appointment | null {
  // For all-day events (hasTime=false), treat them as the end of that day so
  // a check-in scheduled today still counts as "upcoming" until tomorrow.
  const future = items.filter((a) => {
    const end = a.hasTime ? a.when : new Date(a.when.getFullYear(), a.when.getMonth(), a.when.getDate(), 23, 59, 59);
    return end.getTime() >= now.getTime();
  });
  if (future.length === 0) return null;
  future.sort((a, b) => {
    const da = a.when.getTime() - b.when.getTime();
    if (da !== 0) return da;
    return PRIORITY[a.kind] - PRIORITY[b.kind];
  });
  return future[0];
}

function formatRemaining(target: Date, hasTime: boolean, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) {
    if (!hasTime) {
      // Same day, all-day event — still "hoje".
      const sameDay = target.toDateString() === now.toDateString();
      if (sameDay) return "hoje";
    }
    return "agora";
  }
  const min = Math.floor(ms / 60000);
  if (min < 60) return `em ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    const rm = min % 60;
    return rm > 0 ? `em ${hours}h ${rm}min` : `em ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rh = hours % 24;
  if (days < 7) return rh > 0 ? `em ${days}d ${rh}h` : `em ${days} ${days === 1 ? "dia" : "dias"}`;
  const weeks = Math.floor(days / 7);
  const rd = days % 7;
  if (weeks < 5) return rd > 0 ? `em ${weeks} sem ${rd}d` : `em ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const months = Math.round(days / 30);
  return `em ~${months} ${months === 1 ? "mês" : "meses"}`;
}

export function NextAppointmentCard({
  services,
  onOpenService,
}: {
  services: TripService[];
  onOpenService: (service: TripService) => void;
}) {
  const appointments = useMemo(() => buildAppointments(services), [services]);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(() => pickNext(appointments, now), [appointments, now]);

  return (
    <section
      aria-label="Próximo serviço contratado"
      className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      style={{ borderColor: "hsl(var(--wallet-brand) / 0.18)" }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2.5 border-b"
        style={{
          background: "hsl(var(--wallet-brand) / 0.08)",
          borderColor: "hsl(var(--wallet-brand) / 0.15)",
        }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "hsl(var(--wallet-brand) / 0.15)" }}>
          <CalendarClock className="h-4 w-4" style={{ color: "hsl(var(--wallet-brand))" }} />
        </div>
        <h3
          className="text-[13px] font-bold uppercase tracking-wider"
          style={{ color: "hsl(var(--wallet-brand))" }}
        >
          Próximo serviço contratado
        </h3>
      </div>

      {!next ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum serviço futuro na sua agenda.
          </p>
          <p className="text-[12px] text-muted-foreground/80 mt-1">
            Quando houver um próximo serviço programado, ele aparecerá aqui.
          </p>
        </div>
      ) : (() => {
        const Icon = ICON_FOR[next.kind];
        const dateLabel = format(next.when, "EEE, dd 'de' MMM", { locale: ptBR });
        const timeLabel = next.hasTime ? format(next.when, "HH:mm", { locale: ptBR }) : null;
        const remaining = formatRemaining(next.when, next.hasTime, now);
        const kindLabel = LABEL_FOR[next.kind];

        return (
          <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "hsl(var(--wallet-brand-soft))" }}
              >
                <Icon className="h-6 w-6" style={{ color: "hsl(var(--wallet-brand))" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "hsl(var(--wallet-brand-soft))", color: "hsl(var(--wallet-brand))" }}
                  >
                    {kindLabel}
                  </span>
                  <span className="text-[11px] font-medium text-foreground/70">{remaining}</span>
                </div>
                <p className="mt-1 font-semibold text-sm text-foreground leading-snug break-words">
                  {next.title}
                </p>
                {next.subtitle && (
                  <p className="text-[12px] text-muted-foreground leading-snug break-words">{next.subtitle}</p>
                )}
                <p className="text-[12px] text-foreground/80 mt-1 capitalize">
                  {dateLabel}{timeLabel ? ` • ${timeLabel}` : ""}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenService(next.service)}
              className={cn(
                "shrink-0 self-stretch sm:self-auto border-[hsl(var(--wallet-brand)/0.3)]",
                "hover:bg-[hsl(var(--wallet-brand-soft))] hover:text-[hsl(var(--wallet-brand))]"
              )}
            >
              Ver detalhes
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        );
      })()}
    </section>
  );
}

export default NextAppointmentCard;