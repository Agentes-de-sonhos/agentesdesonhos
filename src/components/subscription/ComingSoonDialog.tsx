import { useState, useEffect } from "react";
import { Lock, Rocket, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LAUNCH_DATE } from "@/types/subscription";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function ComingSoonDialog({ open, onOpenChange }: ComingSoonDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const launched = !timeRemaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {launched ? "Lançamento em breve!" : "Em breve!"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {launched
              ? "A plataforma completa Agentes de Sonhos está disponível!"
              : "Lançamento dia 16 de março"}
          </DialogDescription>
        </DialogHeader>

        {!launched && timeRemaining && (
          <div className="py-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: timeRemaining.days, label: "dias" },
                { value: timeRemaining.hours, label: "horas" },
                { value: timeRemaining.minutes, label: "min" },
                { value: timeRemaining.seconds, label: "seg" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center rounded-xl bg-muted/50 p-3"
                >
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {String(item.value).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Este recurso estará disponível no lançamento
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
