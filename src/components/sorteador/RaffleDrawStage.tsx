import { Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaffleParticipant } from "@/lib/raffle/types";

interface Props {
  spinning: boolean;
  currentName: string;
  winners: RaffleParticipant[];
  fullscreen?: boolean;
}

export function RaffleDrawStage({ spinning, currentName, winners, fullscreen }: Props) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5",
        fullscreen ? "h-[70vh]" : "h-64",
      )}
    >
      {spinning ? (
        <div
          key={currentName}
          className={cn(
            "font-bold text-primary motion-safe:animate-scale-in",
            fullscreen ? "text-5xl md:text-8xl" : "text-4xl md:text-6xl",
          )}
        >
          {currentName}
        </div>
      ) : winners.length > 0 ? (
        <div className="w-full px-6 text-center motion-safe:animate-fade-in">
          <Trophy className="mx-auto mb-2 h-12 w-12 text-yellow-500" aria-hidden="true" />
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            {winners.length > 1 ? `${winners.length} vencedores` : "Vencedor"}
          </p>
          <ul className="mt-3 space-y-2">
            {winners.map((w, i) => (
              <li key={w.id}>
                <span
                  className={cn(
                    "font-bold text-primary",
                    winners.length > 3
                      ? "text-2xl"
                      : fullscreen
                        ? "text-5xl md:text-7xl"
                        : "text-3xl md:text-5xl",
                  )}
                >
                  {winners.length > 1 && <span className="mr-2 opacity-60">{i + 1}.</span>}
                  {w.name}
                </span>
                {w.company && (
                  <span className="block text-base text-muted-foreground">{w.company}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-10 w-10 opacity-50" aria-hidden="true" />
          Pronto para sortear
        </div>
      )}
    </div>
  );
}