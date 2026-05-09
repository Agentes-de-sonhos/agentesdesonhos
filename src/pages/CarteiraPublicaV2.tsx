import { useEffect, useState, lazy, Suspense } from "react";
import { setOgMeta } from "@/lib/ogMeta";
import { useParams } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Plane, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Trip, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { BrandText } from "@/components/ui/brand-text";
import { parseLocalDate } from "@/lib/dateParsing";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const ViagemPublica = lazy(() => import("@/pages/ViagemPublica"));

const REMEMBER_KEY_PREFIX = "wallet-remember-pwd:";
const getRememberedPassword = (code: string): string | null => {
  try { return localStorage.getItem(REMEMBER_KEY_PREFIX + code); } catch { return null; }
};
const setRememberedPassword = (code: string, pwd: string) => {
  try { localStorage.setItem(REMEMBER_KEY_PREFIX + code, pwd); } catch {}
};
const clearRememberedPassword = (code: string) => {
  try { localStorage.removeItem(REMEMBER_KEY_PREFIX + code); } catch {}
};

async function verifyByPublicCode(agencySlug: string, code: string, password: string) {
  const { data, error } = await supabase.rpc('verify_trip_by_public_code', {
    p_agency_slug: agencySlug,
    p_code: code,
    p_password: password,
  });
  if (error) throw error;
  const result = data as any;
  if (result.error) throw new Error(result.error);
  return {
    trip: {
      ...result.trip,
      services: (result.services || []).map((s: any) => ({
        ...s,
        service_type: s.service_type as TripServiceType,
        service_data: s.service_data,
      })),
    } as Trip,
    agentProfile: result.agent_profile as AgentProfile | null,
  };
}

function PasswordGate({
  onUnlock,
  loading,
  error,
  branding,
  attemptsLeft,
  tripStartDate,
}: {
  onUnlock: (password: string, remember: boolean) => void;
  loading: boolean;
  error: string;
  branding: AgentProfile | null;
  attemptsLeft: number | null;
  tripStartDate: string | null;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [remember, setRemember] = useState(true);

  const countdown = (() => {
    if (!tripStartDate) return null;
    try {
      const start = parseLocalDate(tripStartDate);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return null;
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onUnlock(password, remember);
  };

  const phoneDigits = (branding?.phone || "").replace(/\D/g, "");
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent(
        "Olá! Preciso de ajuda para acessar minha Carteira de Viagem."
      )}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {branding?.agency_logo_url && (
          <div className="flex justify-center">
            <img
              src={branding.agency_logo_url}
              alt={branding.agency_name || "Agência"}
              className="h-24 sm:h-28 w-auto object-contain"
            />
          </div>
        )}

        {countdown !== null && (
          <div className="text-center">
            {countdown > 1 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <Plane className="h-4 w-4" />
                Faltam {countdown} dias para a sua viagem
              </div>
            )}
            {countdown === 1 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <Plane className="h-4 w-4" />
                Falta 1 dia para a sua viagem
              </div>
            )}
            {countdown === 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/70 px-4 py-2 text-sm font-bold text-primary-foreground shadow-md">
                <Sparkles className="h-4 w-4" />
                Hoje é o grande dia! Boa viagem 🌍✈️
              </div>
            )}
            {countdown < 0 && countdown >= -30 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Esperamos que esteja aproveitando muito! ✨
              </div>
            )}
          </div>
        )}

        <Card className="w-full">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-1">Carteira de Viagem</h1>
              <p className="text-sm text-muted-foreground">
                Digite a senha fornecida pela sua agência
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                className="text-center text-lg tracking-widest pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-center gap-2">
              <Checkbox
                id="remember-device"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="remember-device" className="text-sm text-muted-foreground cursor-pointer select-none">
                Lembrar deste dispositivo
              </Label>
            </div>
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-2 px-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {attemptsLeft === 1
                    ? "Atenção: você tem mais 1 tentativa antes do bloqueio."
                    : `Você tem mais ${attemptsLeft} tentativas antes do bloqueio.`}
                </span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Acessar Carteira
            </Button>
            </form>
          </CardContent>
        </Card>

        {branding && (
          <div className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="w-full bg-gradient-to-r from-slate-300 via-slate-100 to-white px-6 py-3 flex items-center justify-center gap-2 hover:from-slate-400/80 hover:via-slate-200 hover:to-white transition-colors"
              aria-expanded={helpOpen}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center leading-tight">
                <p>Precisa de ajuda?</p>
                <p>Fale com o seu consultor de viagens</p>
              </div>
              {helpOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {helpOpen && (
            <div className="p-6 border-t border-border/40">
              <div className="flex flex-col items-center text-center space-y-4">
                {branding.avatar_url ? (
                  <img src={branding.avatar_url} alt={branding.name || ""} className="h-20 w-20 rounded-full object-cover border-4 border-primary/10 shadow-md ring-2 ring-white" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md ring-2 ring-white">
                    {branding.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="space-y-0.5">
                  {branding.name && <p className="text-base font-bold text-foreground">{branding.name}</p>}
                  {branding.agency_name && (
                    <BrandText as="p" className="text-sm text-muted-foreground font-medium">{branding.agency_name}</BrandText>
                  )}
                </div>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-7 py-3 font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <WhatsAppIcon className="h-5 w-5" />
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CarteiraPublicaV2() {
  const { agencySlug, accessCode } = useParams();
  const [tripData, setTripData] = useState<{ trip: Trip; agentProfile: AgentProfile | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [usedPassword, setUsedPassword] = useState("");
  const [branding, setBranding] = useState<AgentProfile | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const LOCKED_MSG = "Acesso bloqueado por segurança. Entre em contato com a agência responsável.";
  const MAX_ATTEMPTS = 5;
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);

  useEffect(() => {
    setOgMeta({
      title: "Sua viagem organizada em um só lugar 🎒",
      description: "Acesse seus vouchers, ingressos e documentos de forma simples e segura.",
    });
    if (!agencySlug || !accessCode) return;
    // Load agency branding for password gate (no password required)
    supabase
      .rpc('get_trip_by_public_code', { p_agency_slug: agencySlug, p_code: accessCode })
      .then(({ data }) => {
        const result = data as any;
        if (result?.agent_profile) setBranding(result.agent_profile as AgentProfile);
        if (result?.trip?.start_date) setTripStartDate(result.trip.start_date as string);
      });
    // Try remembered password first (if any), fallback to empty probe
    const remembered = getRememberedPassword(accessCode);
    const tryPassword = async (pwd: string) => verifyByPublicCode(agencySlug, accessCode, pwd);

    (async () => {
      try {
        // First attempt: no password (works if wallet has no password)
        const result = await tryPassword("");
        setTripData(result);
        setNeedsPassword(false);
      } catch (err: any) {
        const msg = err?.message;
        if (msg === LOCKED_MSG) {
          setIsLocked(true);
        } else if (msg === "Senha incorreta" || msg === "Senha inválida") {
          // If we have a remembered password, try it silently
          if (remembered) {
            try {
              const result = await tryPassword(remembered);
              setTripData(result);
              setUsedPassword(remembered);
              setNeedsPassword(false);
              setLoading(false);
              return;
            } catch (err2: any) {
              const msg2 = err2?.message;
              if (msg2 === LOCKED_MSG) {
                setIsLocked(true);
              } else {
                // Saved password no longer valid: clear it and ask again
                clearRememberedPassword(accessCode);
                setNeedsPassword(true);
              }
              setLoading(false);
              return;
            }
          }
          setNeedsPassword(true);
        } else {
          setError(msg || "Erro ao acessar carteira");
        }
      }
      setLoading(false);
    })();
  }, [agencySlug, accessCode]);

  const handleUnlock = async (password: string, remember: boolean) => {
    if (!agencySlug || !accessCode) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifyByPublicCode(agencySlug, accessCode, password);
      setTripData(result);
      setUsedPassword(password);
      setNeedsPassword(false);
      if (remember) {
        setRememberedPassword(accessCode, password);
      } else {
        clearRememberedPassword(accessCode);
      }
    } catch (err: any) {
      if (err.message === LOCKED_MSG) {
        setIsLocked(true);
        setNeedsPassword(false);
      } else {
        setAttemptsUsed((n) => n + 1);
        setError(err.message || "Erro ao acessar carteira");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!agencySlug || !accessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Link inválido</p>
      </div>
    );
  }

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl border-0">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-1">Acesso Bloqueado</h1>
              <p className="text-sm text-muted-foreground">
                Acesso bloqueado por segurança. Entre em contato com a agência responsável.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword && !tripData) {
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
    return (
      <PasswordGate
        onUnlock={handleUnlock}
        loading={loading}
        error={error}
        branding={branding}
        attemptsLeft={attemptsUsed > 0 ? attemptsLeft : null}
        tripStartDate={tripStartDate}
      />
    );
  }

  if (error && !tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tripData) return null;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ViagemPublica 
        preLoadedTrip={tripData.trip} 
        preLoadedAgent={tripData.agentProfile}
        preLoadedPassword={usedPassword}
      />
    </Suspense>
  );
}
