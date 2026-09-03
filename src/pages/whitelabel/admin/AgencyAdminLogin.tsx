import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyAdminLogin } from "@/lib/agencyAdminLogin";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import {
  AGENCY_ADMIN_HOME,
  agencyAdminMount,
  PLATFORM_APP_ORIGIN,
  brandAccent,
  checkAgencyAdminAccess,
  fetchAgencyAdminPortal,
  isAgencyAdminPath,
  useAgencyAdminHead,
  AGENCY_ADMIN_FROM_KEY,
} from "@/lib/agencyAdmin";
import {
  AgencyAdminLoading,
  AgencyAdminUnavailable,
} from "@/components/whitelabel/admin/AgencyAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mensagem única e genérica: não revela se o e-mail existe em outra agência. */
const GENERIC_ERROR = "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.";

/**
 * Login administrativo white label (/gestao/login).
 *
 * Usa as MESMAS credenciais da plataforma (signInWithPassword). Após o
 * usuário é validado, o RPC agency_admin_access_check confirma no servidor
 * o vínculo com a agência dona do domínio; sem vínculo, a sessão é encerrada
 * imediatamente e o erro exibido é genérico.
 */
export default function AgencyAdminLogin({
  hostname,
  basePath,
}: {
  hostname: string;
  /** Prefixo de montagem (ex.: `/sitelab-base`); vazio nos domínios reais. */
  basePath?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const portal = useQuery({
    queryKey: ["agency-admin-portal", hostname],
    queryFn: () => fetchAgencyAdminPortal(hostname),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const info = portal.data ?? null;
  const enabled = !!info?.admin_portal_enabled;

  // Sessão existente: só libera o painel após a checagem de vínculo no servidor.
  const access = useQuery({
    queryKey: ["agency-admin-access", hostname, user?.id],
    enabled: !!user && enabled,
    queryFn: () => checkAgencyAdminAccess(hostname),
    staleTime: 60 * 1000,
  });
  const accessDenied = !!user && enabled && access.data === false;
  useEffect(() => {
    if (accessDenied) void supabase.auth.signOut();
  }, [accessDenied]);

  const agencyName = agencyDisplayName(info);
  const logoUrl = info ? resolveAgencyLogoUrl(info) : null;
  useAgencyAdminHead(`${agencyName} | Gestão`, logoUrl);

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotTeam, setForgotTeam] = useState(false);


  if (authLoading || portal.isLoading) return <AgencyAdminLoading />;
  if (!info || !enabled) return <AgencyAdminUnavailable />;

  if (user) {
    if (access.isLoading || access.data === undefined || accessDenied) {
      return <AgencyAdminLoading />;
    }
    if (access.data === true) {
      return <AgencyAdminRedirect />;
    }
  }

  const brand = brandAccent(info.primary_color);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const typed = email.trim().toLowerCase();
      // Colaboradores digitam o login visível; o identificador técnico é
      // resolvido no servidor SOMENTE dentro da agência dona do hostname.
      const resolved = await resolveAgencyAdminLogin(hostname, typed);

      let attempt = await supabase.auth.signInWithPassword({
        email: resolved.email ?? typed,
        password,
      });

      // Um login de equipe pode coincidir com o e-mail real de uma conta
      // master; nesse caso tenta novamente com o valor digitado.
      if (attempt.error && resolved.email && resolved.email !== typed) {
        attempt = await supabase.auth.signInWithPassword({ email: typed, password });
      }

      if (attempt.error || !attempt.data.user) {
        setError(GENERIC_ERROR);
        return;
      }
      const allowed = await checkAgencyAdminAccess(hostname);
      if (!allowed) {
        await supabase.auth.signOut();
        setError(GENERIC_ERROR);
        return;
      }
      // Sucesso: semeia o cache para a navegação acontecer sem nova espera.
      queryClient.setQueryData(["agency-admin-access", hostname, attempt.data.user.id], true);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const typed = email.trim().toLowerCase();
      const resolved = await resolveAgencyAdminLogin(hostname, typed);
      if (resolved.team) {
        // Colaborador: o identificador técnico não é uma caixa de e-mail real.
        // A redefinição é feita pela gestão de equipe da própria agência.
        setForgotTeam(true);
        return;
      }
      // Conta master: fluxo seguro já existente da plataforma (/reset-password).
      await supabase.auth.resetPasswordForEmail(typed, {
        redirectTo: `${PLATFORM_APP_ORIGIN}/reset-password`,
      });
    } catch {
      // resposta propositalmente idêntica em caso de erro
    } finally {
      setSubmitting(false);
      setForgotSent(true);
    }
  };


  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {/* Marca da agência */}
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={agencyName}
                className="h-14 max-w-[180px] object-contain"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: brand.accent, color: brand.onAccent }}
              >
                {agencyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">{agencyName}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Painel de gestão</p>
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wl-admin-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wl-admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wl-admin-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wl-admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
                style={{ backgroundColor: brand.accent, color: brand.onAccent }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setForgotSent(false);
                  setForgotTeam(false);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              {forgotSent ? (
                <p className="text-sm text-muted-foreground text-center">
                  {forgotTeam
                    ? "Sua senha de acesso é definida pelo administrador da sua agência. Entre em contato com ele para redefini-la."
                    : "Se este e-mail estiver cadastrado, você receberá as instruções de recuperação em instantes."}
                </p>

              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Informe seu e-mail para receber o link de redefinição de senha.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-admin-forgot-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="wl-admin-forgot-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                    style={{ backgroundColor: brand.accent, color: brand.onAccent }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pós-login: navegação real (o painel autenticado monta o workspace de abas,
 * que substitui o router desta página). Respeita o destino guardado.
 */
function AgencyAdminRedirect({ basePath }: { basePath?: string }) {
  useEffect(() => {
    const mount = agencyAdminMount(basePath);
    let target = mount.home;
    try {
      const from = sessionStorage.getItem(AGENCY_ADMIN_FROM_KEY);
      if (from && isAgencyAdminPath(mount.toInternal(from))) target = from;
      sessionStorage.removeItem(AGENCY_ADMIN_FROM_KEY);
    } catch {
      /* storage indisponível: usa a home do painel */
    }
    window.location.replace(target);
  }, []);
  return <AgencyAdminLoading />;
}
