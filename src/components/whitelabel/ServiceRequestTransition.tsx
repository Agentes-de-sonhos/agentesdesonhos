import { useEffect, useRef, useState } from "react";
import {
  Plane, BriefcaseBusiness, Car, CarFront, Ticket, ShieldCheck, Ship, Map as MapIcon,
  type LucideIcon,
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
  /** Categoria do serviço: define apenas o ícone estático. */
  serviceKey: string;
  /** Chamado ao término da transição — quem chama abre o modal da jornada. */
  onFinished: () => void;
  className?: string;
}

/**
 * Microtransição entre o formulário inicial e a jornada de solicitação dos
 * sites White Label. Apresenta um modal centralizado com ícone estático da
 * categoria, sem trajetos horizontais ou animações de carregamento genéricas.
 * Herda os tokens da agência (primary/card/foreground) e nunca sugere busca
 * automática: sem porcentagem, barra de progresso ou tempo estimado.
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
        "fixed inset-0 z-[120] flex items-center justify-center",
        "bg-black/[0.64] backdrop-blur-[2px]",
        className,
      )}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={cn(
          "w-[92vw] max-w-[520px] rounded-[22px] border border-border/60 bg-card p-8 text-center outline-none",
          "shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)]",
          "wl-transition-card",
        )}
      >
        <div
          className="mx-auto mb-6 grid h-[58px] w-[58px] place-items-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
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
        .wl-transition-card {
          animation: wl-transition-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .wl-transition-message {
          animation: wl-transition-fade 420ms ease-out both;
        }
        @keyframes wl-transition-enter {
          from { opacity: 0; transform: scale(0.98) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wl-transition-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wl-transition-card,
          .wl-transition-message { animation: none; }
        }
      `}</style>
    </div>
  );
}

