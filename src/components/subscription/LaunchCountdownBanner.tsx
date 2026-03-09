import { useState, useEffect } from "react";
import { Rocket, X } from "lucide-react";
import { LAUNCH_DATE } from "@/types/subscription";
import { cn } from "@/lib/utils";

function getTimeRemaining() {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function LaunchCountdownBanner() {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeRemaining || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground p-4 sm:p-5 shadow-lg shadow-primary/20">
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5 blur-lg" />
      
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 flex-shrink-0">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold">
              🚀 Lançamento Agentes de Sonhos
            </h3>
            <p className="text-xs sm:text-sm text-primary-foreground/80">
              A plataforma completa para agentes de viagem está chegando!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {[
            { value: timeRemaining.days, label: "d" },
            { value: timeRemaining.hours, label: "h" },
            { value: timeRemaining.minutes, label: "m" },
            { value: timeRemaining.seconds, label: "s" },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-primary-foreground/50 font-bold">:</span>}
              <div className="flex flex-col items-center rounded-lg bg-white/20 backdrop-blur-sm px-2.5 py-1.5 min-w-[40px]">
                <span className="text-lg sm:text-xl font-bold tabular-nums leading-none">
                  {String(item.value).padStart(2, "0")}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-primary-foreground/70 font-medium">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
