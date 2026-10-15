import { useState, useEffect } from "react";

const translateAuthError = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (/rate.?limit|too.?many|exceeded|over.?request|request.?limit|aguarde|security.?purposes.*after/i.test(msg)) 
    return "Muitas tentativas seguidas. Aguarde 1-2 minutos e tente novamente.";
  if (/invalid.login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/user.not.found/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/email.not.confirmed/i.test(msg)) return "Por favor, confirme seu e-mail antes de fazer login.";
  if (/already.registered/i.test(msg)) return "Este e-mail já está cadastrado.";
  if (/weak.password|leaked|compromised|hibp/i.test(msg)) return "Essa senha não é segura. Escolha uma senha diferente.";
  if (/password.*short|too.short/i.test(msg)) return "A senha deve ter pelo menos 8 caracteres.";
  if (/network|fetch|failed/i.test(msg)) return "Erro de conexão. Verifique sua internet.";
  if (/timeout/i.test(msg)) return "Tempo de resposta esgotado. Tente novamente.";
  return msg;
};
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { useAuth } from "@/hooks/useAuth";
import { useLoginProtection } from "@/hooks/useLoginProtection";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useTeamSession } from "@/contexts/TeamSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthSplitLayout, AUTH_SUPPORT_HREF } from "@/components/auth/AuthSplitLayout";
import { MultiStepSignup } from "@/components/auth/MultiStepSignup";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useNoindex } from "@/hooks/useNoindex";
import { ToastAction } from "@/components/ui/toast";
import { isSupportSessionForUser } from "@/lib/impersonation";
import {
  openPersonalCrmAfterPasswordLogin,
  openPersonalCrmFromFallback,
} from "@/lib/personalCrmTab";

// Schemas
const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

const loginSchema = z.object({
  email: z.string().trim().min(1, { message: "Informe seu e-mail ou login" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

const resetSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

type EmailFormData = z.infer<typeof emailSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

type AuthView = "login" | "magic-link" | "magic-link-sent" | "forgot-password" | "forgot-sent" | "password-signup";


export default function Auth() {
  useNoindex();
  const searchParams = new URLSearchParams(window.location.search);
  const initialView: AuthView = searchParams.get("signup") === "true" ? "password-signup" : "login";
  const [view, setView] = useState<AuthView>(initialView);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const inactivityMessage = (location.state as any)?.message as string | undefined;
  const { sendOtp, signIn, user, loading: authLoading, isNewUser } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();
  const { member, loading: teamLoading } = useTeamSession();
  const { toast } = useToast();

  const { checkCanAttempt, recordFailedAttempt, recordSuccess } = useLoginProtection();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (!user) return;
    if (roleLoading || subLoading || teamLoading) return;

    // Honor a same-origin ?next=/path so OAuth consent (and similar) can return here.
    const rawNext = new URLSearchParams(window.location.search).get("next");
    if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
      navigate(rawNext, { replace: true });
      return;
    }

    // Subusuários de equipe sempre vão para o dashboard padrão (não para /dashboard-start),
    // independentemente do plano da agência.
    if (member) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (isNewUser && plan !== "educa_pass" && plan !== "cartao_digital") {
      navigate("/onboarding", { replace: true });
      return;
    }

    if (plan === "educa_pass") {
      navigate("/educa-academy", { replace: true });
      return;
    }

    if (plan === "cartao_digital") {
      navigate("/meu-cartao", { replace: true });
      return;
    }

    if (role === "fornecedor") {
      navigate("/dashboard-fornecedor", { replace: true });
      return;
    }

    let destination: string;
    if (role === "admin") {
      destination = "/admin";
    } else if (plan === "start") {
      destination = "/dashboard-start";
    } else {
      destination = "/dashboard";
    }
    navigate(destination, { replace: true });
  }, [user, role, roleLoading, isNewUser, navigate, plan, subLoading, member, teamLoading]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-26 w-auto animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-26 w-auto" />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // ---- Handlers ----

  // Password login (primary)
  const handleLogin = async (data: LoginFormData) => {
    setError(null);

    // Check brute force protection
    const attempt = checkCanAttempt();
    if (!attempt.allowed) {
      setError(attempt.message || "Muitas tentativas. Aguarde e tente novamente.");
      return;
    }

    setIsLoading(true);

    // Apply progressive delay if needed
    if (attempt.waitMs && attempt.waitMs > 0) {
      await new Promise((r) => setTimeout(r, attempt.waitMs));
    }

    // Sempre tenta resolver como login de membro da equipe primeiro
    // (o login pode ser um e-mail real diferente do e-mail sintético da auth)
    let effectiveEmail = data.email;
    let resolvedTeamEmail: string | null = null;
    try {
      const { data: resolved } = await supabase.functions.invoke('team-resolve-login', {
        body: { login: data.email },
      });
      if ((resolved as any)?.email) {
        if ((resolved as any).status === 'blocked') {
          setIsLoading(false);
          setError('Usuário bloqueado. Entre em contato com a sua agência.');
          return;
        }
        effectiveEmail = (resolved as any).email as string;
        resolvedTeamEmail = effectiveEmail;
      }
    } catch { /* segue com o valor digitado */ }

    let { error: signInError, userId: signedInUserId } = await signIn(effectiveEmail, data.password);

    // Fallback: um login de equipe pode colidir com o e-mail de uma conta real
    // (ex.: o próprio proprietário cadastrado como membro). Nesse caso, tenta
    // novamente com o e-mail digitado.
    if (
      signInError &&
      resolvedTeamEmail &&
      resolvedTeamEmail !== data.email &&
      /Invalid login credentials|user not found/i.test(signInError.message)
    ) {
      const retry = await signIn(data.email, data.password);
      signInError = retry.error;
      signedInUserId = retry.userId ?? null;
    }

    if (signInError) {
      setIsLoading(false);
      recordFailedAttempt();
      // Inactive user message
      if (signInError.message.includes("Usuário inativo")) {
        setError("Usuário inativo. Entre em contato com o suporte.");
      } else if (signInError.message.includes("Invalid login credentials") || signInError.message.includes("user not found")) {
        setError("E-mail ou senha inválidos.");
      } else if (signInError.message.includes("Email not confirmed")) {
        setError("Por favor, confirme seu email antes de fazer login.");
      } else {
        setError(translateAuthError(signInError.message));
      }
      return;
    }

    setIsLoading(false);
    recordSuccess();

    // Customização individual temporária: somente este envio explícito do
    // formulário de senha pode abrir o CRM. Restauração/impersonação não passam aqui.
    let personalCrmResult: ReturnType<typeof openPersonalCrmAfterPasswordLogin> = "skipped";
    try {
      // Usa o id retornado pelo próprio login (sem novo await) para preservar o
      // gesto do clique e reduzir o risco de bloqueio de pop-up.
      personalCrmResult = openPersonalCrmAfterPasswordLogin({
        userId: signedInUserId,
        storage: window.localStorage,
        isImpersonating: isSupportSessionForUser(signedInUserId),
        open: (url, target) => window.open(url, target),
      });
    } catch {
      /* login segue normalmente; nenhuma abertura é feita fora deste handler */
    }

    if (personalCrmResult === "blocked") {
      toast({
        title: "Login realizado",
        description: "O navegador bloqueou a abertura automática do CRM.",
        action: (
          <ToastAction
            altText="Abrir CRM"
            onClick={() => openPersonalCrmFromFallback((url, target) => window.open(url, target))}
          >
            Abrir CRM
          </ToastAction>
        ),
      });
    } else {
      toast({
        title: "Bem-vindo de volta!",
        description: "Login realizado com sucesso.",
      });
    }
  };

  // Magic link (secondary)
  const handleSendMagicLink = async (data: EmailFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(data.email);
    setIsLoading(false);

    if (error) {
      if (/signups.not.allowed|otp_disabled|user.not.found/i.test(error.message)) {
        setError("Este e-mail não possui cadastro na plataforma. Por favor, cadastre-se primeiro.");
        return;
      }
      setError(translateAuthError(error.message));
      return;
    }

    setPendingEmail(data.email);
    setView("magic-link-sent");
    toast({
      title: "Link enviado!",
      description: "Verifique seu email e clique no link de acesso.",
    });
  };

  // Forgot password
  const handleForgotPassword = async (data: ResetFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    setPendingEmail(data.email);
    setView("forgot-sent");
    toast({
      title: "Email enviado!",
      description: "Verifique seu email para redefinir sua senha.",
    });
  };

  // Resend handlers
  const handleResendMagicLink = async () => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(pendingEmail);
    setIsLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    toast({ title: "Link reenviado!", description: "Verifique seu email novamente." });
  };

  // Navigation
  const goToLogin = () => {
    setView("login");
    setError(null);
    setPendingEmail("");
    setSignupSuccess(false);
    loginForm.reset();
    emailForm.reset();
    resetForm.reset();
  };

  // Signup success screen
  if (signupSuccess) {
    return (
      <AuthSplitLayout wide={view === "password-signup"}>
        <Card className="w-full border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0 pb-6 text-center space-y-6">
                        <div className="space-y-2">
              <CardTitle className="auth-split__title">Verifique seu email</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Enviamos um link de confirmação para o seu email. Clique no link para ativar sua conta.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Button onClick={goToLogin} className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }

  // Magic Link sent screen
  if (view === "magic-link-sent") {
    return (
      <AuthSplitLayout>
        <Card className="w-full border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0 pb-6 text-center space-y-6">
                        <div className="space-y-2">
              <CardTitle className="auth-split__title">Verifique seu email</CardTitle>
              <CardDescription className="auth-split__desc">
                Enviamos um link de acesso para<br />
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col items-center gap-3 py-4">
              <Mail className="h-12 w-12 text-primary/70" />
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Clique no link enviado para seu email para acessar sua conta. O link é válido por tempo limitado.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-center pt-2">
              <button
                type="button"
                onClick={handleResendMagicLink}
                disabled={isLoading}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Reenviando...
                  </span>
                ) : (
                  "Reenviar link"
                )}
              </button>
              <button type="button" onClick={goToLogin} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar para login
              </button>
            </div>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }


  // Forgot password sent screen
  if (view === "forgot-sent") {
    return (
      <AuthSplitLayout>
        <Card className="w-full border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0 pb-6 text-center space-y-6">
                        <div className="space-y-2">
              <CardTitle className="auth-split__title">Email enviado</CardTitle>
              <CardDescription className="auth-split__desc">
                Enviamos um link de redefinição de senha para<br />
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-6">
            <div className="flex flex-col items-center gap-3 py-4">
              <Mail className="h-12 w-12 text-primary/70" />
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Verifique sua caixa de entrada e clique no link para criar uma nova senha. O link é válido por tempo limitado.
              </p>
            </div>
            <Button onClick={goToLogin} className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout wide={view === "password-signup"}>
        <Card className="w-full border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 pt-0 pb-8 text-center space-y-6">
          
          {view === "login" && (
            <div className="space-y-2">
              <CardTitle className="auth-split__title">Bem-vindo de volta!</CardTitle>
              <CardDescription className="auth-split__desc">Acesse sua conta para continuar.</CardDescription>
            </div>
          )}

          {view === "magic-link" && (
            <div className="space-y-2">
              <CardTitle className="auth-split__title">Acesso por link</CardTitle>
              <CardDescription className="auth-split__desc">Informe seu email para receber o link de acesso</CardDescription>
            </div>
          )}

          {view === "forgot-password" && (
            <div className="space-y-2">
              <CardTitle className="auth-split__title">Esqueceu sua senha?</CardTitle>
              <CardDescription className="auth-split__desc">Informe seu email para receber o link de redefinição</CardDescription>
            </div>
          )}

          {view === "password-signup" && (
            <div className="space-y-2">
              <CardTitle className="auth-split__title">Cadastro de Agente</CardTitle>
              <CardDescription className="auth-split__desc">Complete seu cadastro em poucos passos</CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-5 px-0 pb-0">
          {inactivityMessage && (
            <Alert className="rounded-xl border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
              <AlertDescription className="text-amber-700 dark:text-amber-400">{inactivityMessage}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* PRIMARY: Password Login */}
          {view === "login" && (
            <div className="space-y-5">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="auth-split__label">E-mail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="auth-split__icon" aria-hidden="true" />
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              className="auth-split__input"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-3">
                          <FormLabel className="auth-split__label">Senha</FormLabel>
                          <button
                            type="button"
                            onClick={() => { setView("forgot-password"); setError(null); }}
                            className="auth-split__link"
                          >
                            Esqueci minha senha
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="auth-split__icon" aria-hidden="true" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              className="auth-split__input pr-16"
                              {...field}
                            />
                            <button
                              type="button"
                              className="auth-split__eye"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                              aria-pressed={showPassword}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="auth-split__submit"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </Form>

              <p className="auth-split__help">
                Precisa de ajuda? <a href={AUTH_SUPPORT_HREF}>Fale com o suporte</a>
              </p>
            </div>
          )}

          {/* Magic Link view */}
          {view === "magic-link" && (
            <div className="space-y-5">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSendMagicLink)} className="space-y-5">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              className="h-12 pl-11 rounded-xl border-muted-foreground/20 bg-muted/30 focus:bg-background transition-colors"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] transition-all"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar link de acesso
                  </Button>
                </form>
              </Form>
              <div className="text-center pt-1">
                <button type="button" onClick={goToLogin} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Voltar para login com senha
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password view */}
          {view === "forgot-password" && (
            <div className="space-y-5">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleForgotPassword)} className="space-y-5">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              className="h-12 pl-11 rounded-xl border-muted-foreground/20 bg-muted/30 focus:bg-background transition-colors"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] transition-all"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar link de redefinição
                  </Button>
                </form>
              </Form>
              <div className="text-center pt-1">
                <button type="button" onClick={goToLogin} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Voltar para login
                </button>
              </div>
            </div>
          )}

          {/* Signup view */}
          {view === "password-signup" && (
            <MultiStepSignup
              onComplete={() => setSignupSuccess(true)}
              onCancel={goToLogin}
            />
          )}
        </CardContent>
      </Card>
      </AuthSplitLayout>
  );
}
