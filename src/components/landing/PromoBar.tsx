import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

function getRemaining(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

interface PromoBarProps {
  onCtaClick: () => void;
}

export function PromoBar({ onCtaClick }: PromoBarProps) {
  // 31 de maio às 23:59 (horário local do usuário). Ano corrente, ou próximo se já passou.
  const target = (() => {
    const now = new Date();
    const year = now.getMonth() > 4 || (now.getMonth() === 4 && now.getDate() > 31) ? now.getFullYear() + 1 : now.getFullYear();
    return new Date(year, 4, 31, 23, 59, 0, 0);
  })();

  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(target)), 30000);
    return () => clearInterval(id);
  }, [target]);

  if (!remaining) return null;

  return (
    <div
      className="w-full text-primary-foreground text-[12px] sm:text-[13px] font-medium"
      style={{
        background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(187 92% 42%) 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[26px] max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1 text-center">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          50% de desconto até 31 de maio
        </span>
        <span className="text-primary-foreground/60 hidden sm:inline">|</span>
        <span className="text-primary-foreground/90">Sem fidelidade</span>
        <span className="text-primary-foreground/60 hidden sm:inline">|</span>
        <span className="text-primary-foreground/90 tabular-nums">
          Faltam {remaining.days} {remaining.days === 1 ? "dia" : "dias"}
        </span>
        <span className="text-primary-foreground/60 hidden sm:inline">|</span>
        <button
          onClick={onCtaClick}
          className="underline underline-offset-2 hover:text-white/90 transition-colors font-semibold"
        >
          Saiba mais
        </button>
      </div>
    </div>
  );
}