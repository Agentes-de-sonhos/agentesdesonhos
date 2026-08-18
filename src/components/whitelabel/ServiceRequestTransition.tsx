import { useEffect, useRef, useState } from "react";
import {
  Plane, BriefcaseBusiness, Car, CarFront, Ticket, ShieldCheck, Ship, Map as MapIcon,
  MapPin, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRANSITION_DURATION_MS, TRANSITION_MESSAGES, TRANSITION_SUBTITLE, TRANSITION_TITLE,
  messageIndexAt, transitionMotif, type TransitionMotif,
} from "@/lib/serviceRequestTransition";

const MOTIF_ICON: Record<TransitionMotif, LucideIcon> = {
  plane: Plane,
  stay: BriefcaseBusiness,
  car: Car,
  transfer: CarFront,
  ticket: Ticket,
  shield: ShieldCheck,
  ship: Ship,
  map: MapIcon,
};

export interface ServiceRequestTransitionProps {
  /** Overlay visível (só entre a validação da primeira etapa e a abertura do modal). */
  open: boolean;
  /** Categoria do serviço: define apenas o elemento animado. */
  serviceKey: string;
  /** Chamado ao término da transição — quem chama abre o modal da jornada. */
  onFinished: () => void;
  className?: string;
}

/**
 * Microtransição entre o formulário inicial e a jornada de solicitação dos
 * sites White Label. Herda os tokens da agência (primary/card/foreground) e
 * nunca sugere busca automática: sem porcentagem, barra de progresso ou tempo.
 */
export function ServiceRequestTransition({
  open, serviceKey, onFinished, className,
}: ServiceRequestTransitionProps) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    cardRef.current?.focus();

    const started = Date.now();
    const tick = window.setInterval(() => {
      setIndex(messageIndexAt(Date.now() - started));
    }, 200);
    const done = window.setTimeout(() => finishRef.current(), TRANSITION_DURATION_MS);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const Icon = MOTIF_ICON[transitionMotif(serviceKey)];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-transition-title"
      data-testid="wl-request-transition"
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm",
        className,
      )}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="wl-transition-card w-full max-w-md rounded-2xl border border-border/70 bg-card p-7 text-center shadow-[0_28px_70px_-40px_hsl(220_12%_10%/0.55)] outline-none"
      >
        <div className="relative mx-auto mb-6 h-16 w-40" aria-hidden="true">
          <span className="wl-transition-route absolute left-0 right-0 top-1/2 h-0 border-t border-dashed border-primary/40" />
          <span className="wl-transition-pin absolute right-0 top-1/2 -translate-y-1/2 text-primary/50">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="wl-transition-icon absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <h2 id="wl-transition-title" className="text-lg font-semibold text-foreground">
          {TRANSITION_TITLE}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{TRANSITION_SUBTITLE}</p>

        <p
          aria-live="polite"
          className="mt-5 min-h-[2.5rem] text-[13px] font-medium text-foreground/80"
        >
          <span key={index} className="wl-transition-message inline-block">
            {TRANSITION_MESSAGES[index]}
          </span>
        </p>
      </div>

      <style>{`
        .wl-transition-card { animation: wl-transition-in 320ms ease-out both; }
        .wl-transition-message { animation: wl-transition-fade 420ms ease-out both; }
        .wl-transition-icon { animation: wl-transition-travel 3s ease-in-out infinite; }
        .wl-transition-pin { animation: wl-transition-pulse 2.4s ease-in-out infinite; }
        @keyframes wl-transition-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        @keyframes wl-transition-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes wl-transition-travel {
          0% { left: 0; }
          50% { left: calc(100% - 2.75rem); }
          100% { left: 0; }
        }
        @keyframes wl-transition-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wl-transition-card,
          .wl-transition-message,
          .wl-transition-icon,
          .wl-transition-pin { animation: none; }
          .wl-transition-icon { left: calc(50% - 1.375rem); }
        }
      `}</style>
    </div>
  );
}
