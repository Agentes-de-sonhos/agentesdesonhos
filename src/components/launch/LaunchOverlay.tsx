import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

// Horários em UTC (Brasília = UTC-3)
const MEETING_START = new Date("2026-03-16T13:30:00Z"); // 10:30 BRT
const PLATFORM_UNLOCK = new Date("2026-03-16T14:30:00Z"); // 11:30 BRT

const MEET_LINK = "https://meet.google.com/pan-stpm-zwp";

type Phase = "countdown" | "live" | "unlocked";

function getPhase(now: Date): Phase {
  if (now >= PLATFORM_UNLOCK) return "unlocked";
  if (now >= MEETING_START) return "live";
  return "countdown";
}

function getTimeRemaining(now: Date) {
  const diff = Math.max(0, MEETING_START.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function LaunchOverlay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = useMemo(() => getPhase(now), [now]);
  const time = useMemo(() => getTimeRemaining(now), [now]);

  // Only show on main domain (agentesdesonhos.com.br / www.agentesdesonhos.com.br)
  const hostname = window.location.hostname;
  const isMainDomain =
    hostname === "agentesdesonhos.com.br" ||
    hostname === "www.agentesdesonhos.com.br";

  // Admin bypass: add ?preview=true to skip the overlay
  const hasPreviewBypass = new URLSearchParams(window.location.search).get("preview") === "true";

  if (!isMainDomain || phase === "unlocked" || hasPreviewBypass) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-80">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.25) 0%, transparent 50%), linear-gradient(180deg, #0a0a1a 0%, #111127 50%, #0a0a1a 100%)",
          }}
        />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-600/20 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/15 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full bg-purple-500/10 blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Logo / brand */}
        <div className="mb-8">
          <img
            src="/favicon.png"
            alt="Agentes de Sonhos"
            className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg shadow-violet-500/30"
          />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium tracking-widest uppercase">
            {phase === "countdown" ? "Pré-lançamento" : "Ao vivo agora"}
          </div>
        </div>

        {phase === "countdown" ? (
          <>
            {/* Countdown heading */}
            <p className="text-violet-300/80 text-sm font-medium tracking-wider uppercase mb-3">
              O lançamento começa em
            </p>

            {/* Countdown timer */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-10">
              {[
                { value: time.days, label: "dias" },
                { value: time.hours, label: "horas" },
                { value: time.minutes, label: "min" },
                { value: time.seconds, label: "seg" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-3 sm:gap-4">
                  {i > 0 && (
                    <span className="text-violet-400/50 text-2xl sm:text-3xl font-light">:</span>
                  )}
                  <div className="flex flex-col items-center">
                    <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-violet-900/20">
                      <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                        {String(item.value).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-violet-300/60 mt-1.5 uppercase tracking-wider font-medium">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-5">
              Algo grande está chegando
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                para os Agentes de Viagens
              </span>
            </h1>

            {/* Description */}
            <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-4">
              Hoje vamos apresentar pela primeira vez a plataforma{" "}
              <strong className="text-white">Agente de Sonhos</strong>.
              Um novo ecossistema criado para ajudar agentes de viagens a vender mais,
              se conectar mais e ter novas oportunidades no mercado.
            </p>

            <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-md mx-auto italic">
              Você está prestes a conhecer um projeto que foi pensado para o agente de viagens
              e que será construído e evoluído junto com a comunidade.
            </p>
          </>
        ) : (
          <>
            {/* LIVE phase */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Ao vivo
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              Estamos AO VIVO agora 🚀
            </h1>

            <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-8">
              A apresentação oficial da plataforma{" "}
              <strong className="text-white">Agente de Sonhos</strong> começou.
              <br />
              Clique abaixo para entrar na reunião de lançamento.
            </p>

            <Button
              onClick={() => window.open(MEET_LINK, "_blank", "noopener,noreferrer")}
              size="lg"
              className="h-14 px-10 text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-600/30 transition-all hover:scale-105 active:scale-100"
            >
              Entrar na reunião
              <ExternalLink className="h-5 w-5 ml-2" />
            </Button>

            {/* Info below button */}
            <div className="mt-8 text-white/50 text-xs sm:text-sm space-y-1">
              <p className="font-medium text-white/60">
                Reunião ao vivo · 16 de março • 10h30
              </p>
              <p>A plataforma será liberada às 11h30.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
