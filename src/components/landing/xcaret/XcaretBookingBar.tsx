import { useMemo, useState } from "react";
import { ArrowRight, BedDouble, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TripDatePicker } from "@/components/whitelabel/TripDatePicker";
import { AgencyQuoteJourney } from "@/components/whitelabel/AgencyQuoteJourney";
import type { ServiceValues } from "@/lib/agencySiteRequests";

/** Hotéis do complexo Xcaret oferecidos na solicitação rápida. */
export const XCARET_HOTEL_OPTIONS = [
  { value: "Hotel Xcaret México", note: "Para famílias, com espaços para todas as idades.", kidsAllowed: true },
  { value: "Hotel Xcaret Arte", note: "Recebe visitantes a partir de 16 anos.", kidsAllowed: false },
  { value: "La Casa de la Playa", note: "Boutique exclusivo para adultos.", kidsAllowed: false },
  { value: "Ainda não decidi, quero uma recomendação", note: "A Ju indica o hotel que combina com a sua viagem.", kidsAllowed: true },
] as const;

const DESTINATION = "Riviera Maya, México";

type Errors = Partial<Record<"hotel" | "periodo" | "adultos", string>>;

/**
 * Solicitação de reserva de hospedagem dos Hotéis Xcaret, exibida logo abaixo da
 * primeira dobra. Coleta hotel, período e viajantes e abre a jornada de
 * solicitação já preenchida, que faz o envio para o CRM da agência.
 */
export function XcaretBookingBar({ hostname, agencyName }: { hostname: string; agencyName: string }) {
  const [hotel, setHotel] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [errors, setErrors] = useState<Errors>({});
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => XCARET_HOTEL_OPTIONS.find((item) => item.value === hotel) ?? null,
    [hotel],
  );
  const kidsCount = Math.max(0, Math.min(12, Number(children) || 0));
  const ageWarning = !!selected && !selected.kidsAllowed && kidsCount > 0;

  const quickValues: ServiceValues = useMemo(
    () => ({
      destino: DESTINATION,
      check_in: checkIn,
      check_out: checkOut,
      adultos: String(Math.max(1, Number(adults) || 1)),
      criancas: String(kidsCount),
      quartos: "1",
      tipo_hospedagem: "Resort",
      observacoes: hotel ? `Hotel de interesse: ${hotel}.` : "",
    }),
    [checkIn, checkOut, adults, kidsCount, hotel],
  );

  function start() {
    const next: Errors = {};
    if (!hotel) next.hotel = "Escolha um hotel ou peça uma recomendação.";
    if (!checkIn || !checkOut) next.periodo = "Informe a data de entrada e de saída.";
    if (!adults || Number(adults) < 1) next.adultos = "Informe pelo menos um adulto.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setOpen(true);
  }

  return (
    <section id="reservar" className="relative z-20 scroll-mt-24 bg-transparent pb-12 pt-10 md:pb-16 lg:-mt-[104px] lg:pt-0">
      <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-[0_14px_40px_-28px_hsl(220_12%_10%/0.3)] md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <BedDouble className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">Solicite sua reserva nos Hotéis Xcaret</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Escolha o hotel, informe as datas e quem viaja. A Ju retorna com as opções e os valores disponíveis.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border/70 pt-5 lg:grid-cols-[1.4fr_1.3fr_auto_auto_auto] lg:items-end">
            <div>
              <Label htmlFor="xcaret-hotel" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hotel<span aria-hidden className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={hotel} onValueChange={(value) => setHotel(value)}>
                <SelectTrigger id="xcaret-hotel" aria-invalid={!!errors.hotel} className="mt-1.5 h-12 rounded-lg">
                  <SelectValue placeholder="Selecione o hotel" />
                </SelectTrigger>
                <SelectContent>
                  {XCARET_HOTEL_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.hotel ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.hotel}</p>
              ) : selected ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{selected.note}</p>
              ) : null}
            </div>

            <TripDatePicker
              id="xcaret-periodo"
              label="Entrada e saída"
              mode="range"
              start={checkIn}
              end={checkOut}
              editorial
              required
              error={errors.periodo}
              triggerClassName="h-12 rounded-lg"
              onChange={({ start: s, end: e }) => { setCheckIn(s); setCheckOut(e); }}
            />

            <div className="lg:w-28">
              <Label htmlFor="xcaret-adultos" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Adultos<span aria-hidden className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="xcaret-adultos"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={adults}
                aria-invalid={!!errors.adultos}
                onChange={(event) => setAdults(event.target.value)}
                className="mt-1.5 h-12 rounded-lg"
              />
              {errors.adultos && <p className="mt-1.5 text-xs text-destructive">{errors.adultos}</p>}
            </div>

            <div className="lg:w-28">
              <Label htmlFor="xcaret-criancas" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Crianças
              </Label>
              <Input
                id="xcaret-criancas"
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                value={children}
                onChange={(event) => setChildren(event.target.value)}
                className="mt-1.5 h-12 rounded-lg"
              />
            </div>

            <Button
              size="lg"
              onClick={start}
              className="h-12 w-full rounded-lg text-[13px] font-semibold lg:w-auto"
            >
              Consultar disponibilidade <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>

          {ageWarning && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {selected?.value === "Hotel Xcaret Arte"
                ? "O Hotel Xcaret Arte recebe visitantes a partir de 16 anos. Se as crianças forem mais novas, a Ju sugere o Hotel Xcaret México."
                : "La Casa de la Playa é um hotel somente para adultos. A Ju pode indicar o Hotel Xcaret México para viagens em família."}
            </p>
          )}

          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Não é uma reserva automática nem uma confirmação de preço: a Ju analisa o seu pedido e retorna com as opções e condições disponíveis.
          </p>
        </div>
      </div>

      <AgencyQuoteJourney
        hostname={hostname}
        agencyName={agencyName}
        open={open}
        onOpenChange={setOpen}
        primaryService="hospedagem"
        quickValues={quickValues}
      />
    </section>
  );
}
