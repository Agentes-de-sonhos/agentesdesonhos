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
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Schemas
const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

const resetSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

type EmailFormData = z.infer<typeof emailSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

type AuthView = "login" | "magic-link" | "magic-link-sent" | "forgot-password" | "forgot-sent" | "password-signup";

// Brand Header Component
function BrandHeader() {
  return (
    <div className="flex flex-col items-center space-y-3">
      <img src={logoAgentes} alt="Agentes de Sonhos" className="h-36 w-auto" />
      <p className="mt-1 text-sm text-muted-foreground">
        Plataforma inteligente para agentes de viagem
      </p>
    </div>
  );
}

export default function Auth() {
  const [view, setView] = useState<AuthView>("login");
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
    if (roleLoading || subLoading) return;

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

    const destination = role === "admin" ? "/admin" : "/dashboard";
    navigate(destination, { replace: true });
  }, [user, role, roleLoading, isNewUser, navigate, plan, subLoading]);

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

    const { error: signInError } = await signIn(data.email, data.password);

    if (signInError) {
      setIsLoading(false);
      recordFailedAttempt();
      // Generic message to prevent user enumeration
      if (signInError.message.includes("Invalid login credentials") || signInError.message.includes("user not found")) {
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
    toast({
      title: "Bem-vindo de volta!",
      description: "Login realizado com sucesso.",
    });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <BrandHeader />
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Verifique seu email</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Enviamos um link de confirmação para o seu email. Clique no link para ativar sua conta.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <Button onClick={goToLogin} className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Magic Link sent screen
  if (view === "magic-link-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <BrandHeader />
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Verifique seu email</CardTitle>
              <CardDescription className="text-sm">
                Enviamos um link de acesso para<br />
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
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
      </div>
    );
  }


  // Forgot password sent screen
  if (view === "forgot-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <BrandHeader />
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Email enviado</CardTitle>
              <CardDescription className="text-sm">
                Enviamos um link de redefinição de senha para<br />
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <Card className={`relative w-full rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm transition-all duration-300 ${
        view === "password-signup" ? "max-w-2xl" : "max-w-md"
      }`}>
        <CardHeader className={`text-center space-y-6 ${view === "password-signup" ? "pt-8 pb-4" : "pt-10 pb-4"}`}>
          <BrandHeader />

          {view === "login" && (
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Acesse sua conta</CardTitle>
              <CardDescription className="text-sm">Entre com seu email e senha</CardDescription>
            </div>
          )}

          {view === "magic-link" && (
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Acesso por link</CardTitle>
              <CardDescription className="text-sm">Informe seu email para receber o link de acesso</CardDescription>
            </div>
          )}

          {view === "forgot-password" && (
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Esqueceu sua senha?</CardTitle>
              <CardDescription className="text-sm">Informe seu email para receber o link de redefinição</CardDescription>
            </div>
          )}

          {view === "password-signup" && (
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Cadastro de Agente</CardTitle>
              <CardDescription className="text-sm">Complete seu cadastro em poucos passos</CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className={`space-y-5 ${view === "password-signup" ? "px-6 pb-8" : "px-8 pb-10"}`}>
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
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
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
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              className="h-12 pl-11 pr-12 rounded-xl border-muted-foreground/20 bg-muted/30 focus:bg-background transition-colors"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
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
                    Entrar
                  </Button>
                </form>
              </Form>

              {/* Secondary options — subtle links */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setView("forgot-password"); setError(null); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
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

        {/* Footer branding */}
        <div className="pb-6 text-center">
          <p className="text-[10px] text-muted-foreground/50">
            Desenvolvido por <span className="font-medium">Nobre Digital</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
