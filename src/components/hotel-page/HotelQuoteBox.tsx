import { useState } from "react";
import { z } from "zod";
import { Bed, CalendarDays, CheckCircle2, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { HotelQuoteRequest } from "./types";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  whatsapp: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, "Informe um WhatsApp válido com DDD."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
});

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-card">
        <button type="button" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-full w-10 place-items-center text-primary disabled:opacity-40">
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex-1 border-x border-border text-center font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-full w-10 place-items-center text-primary disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function HotelQuoteBox({
  hotelSlug, hotelName, onSubmit, previewMode,
}: {
  hotelSlug: string;
  hotelName: string;
  /** Envio para o CRM da agência. Na página modelo, nada é enviado. */
  onSubmit?: (req: HotelQuoteRequest) => Promise<void>;
  previewMode?: boolean;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [ages, setAges] = useState<(number | "")[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState({ name: "", whatsapp: "", email: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const today = todayIso();

  function setChildren(n: number) {
    setAges((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
  }

  function start() {
    if (!checkIn || !checkOut) return setError("Informe a data de entrada e de saída.");
    if (checkOut <= checkIn) return setError("A saída deve ser posterior à entrada.");
    if (ages.some((a) => a === "")) return setError("Informe a idade de cada criança.");
    setError(null);
    setStatus("idle");
    setOpen(true);
  }

  async function confirm() {
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      return setContactErrors(errs);
    }
    setContactErrors({});
    setStatus("sending");
    try {
      const req: HotelQuoteRequest = {
        hotelSlug, hotelName, checkIn, checkOut, adults,
        childrenAges: ages as number[],
        contact: parsed.data as HotelQuoteRequest["contact"],
      };
      if (onSubmit) await onSubmit(req);
      else await new Promise((r) => setTimeout(r, 600));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const nights = checkIn && checkOut && checkOut > checkIn
    ? Math.round((new Date(checkOut + "T00:00").getTime() - new Date(checkIn + "T00:00").getTime()) / 86400000)
    : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <Bed className="mt-0.5 h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-xl font-bold text-foreground">Solicite seu orçamento</h2>
          <p className="text-sm text-muted-foreground">Informe o período da hospedagem e quem vai viajar.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr_150px_150px_auto] lg:items-end">
        <div>
          <Label htmlFor="hq-in" className="text-sm font-medium">Entrada</Label>
          <div className="relative mt-1.5">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="hq-in" type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && checkOut <= e.target.value) setCheckOut(""); }} className="h-11 bg-card pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="hq-out" className="text-sm font-medium">Saída</Label>
          <div className="relative mt-1.5">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="hq-out" type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-11 bg-card pl-9" />
          </div>
        </div>
        <Stepper label="Adultos" value={adults} min={1} max={10} onChange={setAdults} />
        <Stepper label="Crianças" value={ages.length} min={0} max={6} onChange={setChildren} />
        <Button onClick={start} size="lg" className="col-span-2 h-11 w-full lg:col-span-1 lg:w-auto">Solicitar orçamento</Button>
      </div>

      {ages.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {ages.map((a, i) => (
            <div key={i} className="w-32">
              <Label htmlFor={`hq-age-${i}`} className="text-xs text-muted-foreground">Idade da criança {i + 1}</Label>
              <select
                id={`hq-age-${i}`}
                value={a}
                onChange={(e) => setAges((prev) => prev.map((v, k) => (k === i ? (e.target.value === "" ? "" : Number(e.target.value)) : v)))}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-2 text-sm"
              >
                <option value="">Selecione</option>
                {Array.from({ length: 18 }, (_, n) => (
                  <option key={n} value={n}>{n === 0 ? "Menos de 1 ano" : `${n} ${n === 1 ? "ano" : "anos"}`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {status === "done" ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <DialogTitle className="mt-3 text-xl">Solicitação recebida!</DialogTitle>
              <DialogDescription className="mt-2">
                {previewMode
                  ? "Prévia: nesta página modelo nada foi enviado. No site da agência, a solicitação entra no CRM e o consultor retorna em breve."
                  : "Nosso consultor vai retornar em breve com as opções e valores."}
              </DialogDescription>
              <Button className="mt-5" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <>
              <DialogTitle>Quase lá!</DialogTitle>
              <DialogDescription>Confira sua viagem e informe como podemos falar com você.</DialogDescription>
              <div className="rounded-xl bg-muted p-3 text-sm">
                <p className="font-semibold text-foreground">{hotelName}</p>
                <p className="text-muted-foreground">
                  {checkIn && fmt(checkIn)} a {checkOut && fmt(checkOut)} · {nights} {nights === 1 ? "noite" : "noites"}
                </p>
                <p className="text-muted-foreground">
                  {adults} {adults === 1 ? "adulto" : "adultos"}
                  {ages.length > 0 && ` · ${ages.length} ${ages.length === 1 ? "criança" : "crianças"} (${ages.join(", ")} anos)`}
                </p>
              </div>
              <div className="space-y-3">
                {([
                  ["name", "Nome completo", "text", "name"],
                  ["whatsapp", "WhatsApp", "tel", "tel"],
                  ["email", "E-mail", "email", "email"],
                ] as const).map(([key, label, type, ac]) => (
                  <div key={key}>
                    <Label htmlFor={`hq-${key}`}>{label}</Label>
                    <Input
                      id={`hq-${key}`} type={type} autoComplete={ac} className="mt-1.5 h-11"
                      value={contact[key]} maxLength={key === "email" ? 255 : 100}
                      onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                    />
                    {contactErrors[key] && <p className="mt-1 text-xs text-destructive">{contactErrors[key]}</p>}
                  </div>
                ))}
              </div>
              {status === "error" && <p className="text-sm text-destructive">Não foi possível enviar agora. Tente novamente.</p>}
              <Button onClick={confirm} disabled={status === "sending"} size="lg" className="w-full">
                {status === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar solicitação
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
