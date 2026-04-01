import { useState, useEffect } from "react";
import { useMonthlyPopup } from "@/hooks/useMonthlyPopup";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTH_EMOJIS: Record<number, string> = {
  1: "🎆", 2: "🎭", 3: "🌱", 4: "🌤️", 5: "🌸",
  6: "🔥", 7: "❄️", 8: "🎯", 9: "🌻", 10: "🚀",
  11: "🏆", 12: "🎄",
};

export function MonthlyPopupModal() {
  const { shouldShow, phrase, events, monthName, currentMonth, markViewed } = useMonthlyPopup();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  const handleClose = () => {
    setIsOpen(false);
    markViewed();
  };

  if (!shouldShow) return null;

  const emoji = MONTH_EMOJIS[currentMonth] || "✨";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] p-0 overflow-y-auto gap-0 border-0 rounded-2xl">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-1.5 hover:bg-background transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 p-6 pb-4 text-center">
          <span className="text-5xl mb-3 block">{emoji}</span>
          <h2 className="text-2xl font-bold text-foreground">
            {monthName}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Boas-vindas ao novo mês!</p>
        </div>

        {/* Phrase */}
        {phrase && (
          <div className="px-6 pt-4">
            <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed italic">
                "{phrase}"
              </p>
            </div>
          </div>
        )}

        {/* Events */}
        <div className="px-6 pt-4 pb-6 space-y-3">
          {events.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Datas importantes do mês
                </h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.map((event) => {
                  const [y, m, d] = event.event_date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const formattedDate = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
                  const isHoliday = event.event_type === "feriado";

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: event.color || (isHoliday ? "#ef4444" : "#ec4899") }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {isHoliday ? "Feriado" : "Comemorativo"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma data especial registrada para este mês.
            </p>
          )}

          <Button onClick={handleClose} className="w-full mt-2" size="lg">
            Vamos lá! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
