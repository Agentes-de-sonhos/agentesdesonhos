import { useState, useEffect } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const rotatingMessages = [
  "Analisando seu perfil de viagem…",
  "Buscando experiências que combinam com você…",
  "Selecionando os melhores destinos e atividades…",
  "Organizando seu roteiro dia a dia…",
  "Ajustando tudo para ficar perfeito…",
  "Quase pronto… já já você vai ver seu roteiro ✈️",
];

interface AIGeneratingOverlayProps {
  visible: boolean;
}

export function AIGeneratingOverlay({ visible }: AIGeneratingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  // Control mount/unmount with fade
  useEffect(() => {
    if (visible) {
      setShow(true);
      setProgress(0);
      setMessageIndex(0);
    } else if (show) {
      // Fade out then unmount
      setFadingOut(true);
      const timer = setTimeout(() => {
        setShow(false);
        setFadingOut(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Rotate messages
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [visible]);

  // Animate progress bar (fake progress up to ~90%)
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        // Slow down as it gets higher
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : 0.5;
        return Math.min(prev + increment, 90);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center transition-all duration-400",
        fadingOut ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md text-center">
        {/* Animated plane */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-primary/5 flex items-center justify-center">
            <Plane
              className="h-10 w-10 text-primary animate-bounce"
              style={{ animationDuration: "2s" }}
            />
          </div>
          {/* Orbit dot */}
          <div
            className="absolute w-2.5 h-2.5 bg-primary rounded-full"
            style={{
              animation: "orbit 3s linear infinite",
              top: "50%",
              left: "50%",
            }}
          />
        </div>

        {/* Main text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Estamos criando um roteiro incrível pra você…
          </h2>

          {/* Rotating message */}
          <div className="h-7 relative overflow-hidden">
            {rotatingMessages.map((msg, i) => (
              <p
                key={i}
                className={cn(
                  "absolute inset-x-0 text-sm text-muted-foreground transition-all duration-500",
                  i === messageIndex
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                )}
              >
                {msg}
              </p>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground/70">
            Estamos usando inteligência artificial para criar algo sob medida pra você ✨
          </p>
        </div>
      </div>

      {/* Orbit keyframes */}
      <style>{`
        @keyframes orbit {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(46px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(46px) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}
