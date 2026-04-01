import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_KEY = "platform_feedback_v2";

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

function hasFeedbackDismissedThisMonth(userId: string): boolean {
  try {
    const stored = localStorage.getItem(FEEDBACK_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data[userId] === getCurrentMonthKey();
  } catch {
    return false;
  }
}

function markFeedbackDismissed(userId: string): void {
  try {
    const stored = localStorage.getItem(FEEDBACK_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[userId] = getCurrentMonthKey();
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(data));
  } catch {}
}

export function FeedbackPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [step, setStep] = useState<"rate" | "comment" | "thanks">("rate");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (hasFeedbackDismissedThisMonth(user.id)) return;

    // Only show from day 5 onwards
    const now = new Date();
    if (now.getDate() < 5) return;

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;

    Promise.all([
      supabase
        .from("feedback_settings" as any)
        .select("value")
        .eq("key", "feedback_popup_enabled")
        .maybeSingle(),
      supabase
        .from("user_feedback" as any)
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .limit(1),
    ]).then(([settingsRes, feedbackRes]) => {
      if ((settingsRes.data as any)?.value !== "true") return;
      if (feedbackRes.data && feedbackRes.data.length > 0) {
        markFeedbackDismissed(user.id);
        return;
      }
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    });
  }, [user]);

  const handleClose = () => {
    // Only allow closing after submitting feedback (step === "thanks")
    if (step !== "thanks") return;
    if (user) markFeedbackDismissed(user.id);
    setIsOpen(false);
  };

  const handleRating = (value: number) => {
    setRating(value);
    if (value >= 4) {
      // High rating → submit immediately and show thanks
      submitFeedback(value, null);
    } else {
      setStep("comment");
    }
  };

  const submitFeedback = async (r: number, c: string | null) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_feedback" as any).insert({
        user_id: user.id,
        rating: r,
        comment: c,
      });
      if (error) throw error;
      markFeedbackDismissed(user.id);
      setStep("thanks");
    } catch (err) {
      console.error("Feedback error:", err);
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComment = () => {
    submitFeedback(rating, comment.trim() || null);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => { if (step === "thanks") handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-0 rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { if (step !== "thanks") e.preventDefault(); }}>
        {/* Close - only visible after submitting */}
        {step === "thanks" && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-1.5 hover:bg-background transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/90 to-primary px-6 pt-8 pb-6 text-primary-foreground text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold leading-tight">
            Plataforma atualizada! 🚀
          </h2>
          <p className="text-sm mt-2 opacity-90 leading-relaxed">
            Fizemos melhorias de performance e estabilidade para deixar sua experiência ainda melhor.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {step === "rate" && (
            <>
              <p className="text-center text-sm font-medium text-foreground">
                Como está sendo sua experiência com a plataforma até agora?
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRating(value)}
                    onMouseEnter={() => setHoveredStar(value)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        value <= (hoveredStar || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Clique para avaliar
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ Sua avaliação é obrigatória para continuar usando a plataforma.
                </p>
              </div>
            </>
          )}

          {step === "comment" && (
            <>
              <p className="text-sm font-medium text-foreground">
                O que podemos melhorar? 🤔
              </p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sua sugestão ou problema..."
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Enviando..." : "Enviar feedback"}
              </Button>
            </>
          )}

          {step === "thanks" && (
            <div className="text-center py-2 space-y-3">
              <p className="text-lg font-semibold text-foreground">
                Obrigado pelo seu feedback! 💙
              </p>
              <p className="text-sm text-muted-foreground">
                Sua opinião é essencial para continuarmos evoluindo.
              </p>
              <Button onClick={handleClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          )}

          {step !== "thanks" && (
            <a
              href="/suporte"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com suporte
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
