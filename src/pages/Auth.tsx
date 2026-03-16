import { useState, useEffect } from "react";

const translateAuthError = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (/rate.?limit|too.?many|exceeded|over.?request|request.?limit|aguarde|security.?purposes.*after/i.test(msg)) 
    return "Muitas tentativas seguidas. Aguarde 1-2 minutos e tente novamente.";
  if (/invalid.login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/user.not.found/i.test(msg)) return "Usuário não encontrado.";
  if (/email.not.confirmed/i.test(msg)) return "Por favor, confirme seu e-mail antes de fazer login.";
  if (/already.registered/i.test(msg)) return "Este e-mail já está cadastrado.";
  if (/weak.password/i.test(msg)) return "A senha deve ter pelo menos 6 caracteres.";
  if (/network|fetch|failed/i.test(msg)) return "Erro de conexão. Verifique sua internet.";
  if (/timeout/i.test(msg)) return "Tempo de resposta esgotado. Tente novamente.";
  return msg;
};
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, Mail, KeyRound, Lock } from "lucide-react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
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
// OTP input no longer used - magic link flow

// Schemas
const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

type EmailFormData = z.infer<typeof emailSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

type AuthMethod = "otp" | "password";
type AuthView = "main" | "otp-verify" | "password-login" | "password-signup";

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
  const [view, setView] = useState<AuthView>("main");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("otp");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [_otpValue, setOtpValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const navigate = useNavigate();
  const { sendOtp, signIn, user, loading: authLoading, isNewUser } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();
  const { toast } = useToast();

  // All useForm hooks MUST be called before any early returns
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (!user) return;
    
    // Wait for role and subscription to load before deciding destination
    if (roleLoading || subLoading) return;
    
    // Check if user should complete onboarding (skip for educa_pass and cartao_digital)
    if (isNewUser && plan !== "educa_pass" && plan !== "cartao_digital") {
      navigate("/onboarding", { replace: true });
      return;
    }
    
    // Educa Pass users go directly to Academy
    if (plan === "educa_pass") {
      navigate("/educa-academy", { replace: true });
      return;
    }

    // Cartão Digital Pass users go directly to card editor
    if (plan === "cartao_digital") {
      navigate("/meu-cartao", { replace: true });
      return;
    }
    
    // Navigate based on role (default to dashboard if role not set)
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

  // If user exists, show loading while redirecting
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

  // OTP handlers
  const handleSendOtp = async (data: EmailFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(data.email);
    setIsLoading(false);

    if (error) {
      // If user not found (shouldCreateUser: false)
      if (/signups.not.allowed/i.test(error.message) || /otp_disabled/i.test(error.message) || /user.not.found/i.test(error.message)) {
        setError("Este e-mail não possui cadastro na plataforma. Por favor, cadastre-se primeiro.");
        return;
      }
      setError(translateAuthError(error.message));
      return;
    }

    setPendingEmail(data.email);
    setView("otp-verify");
    toast({
      title: "Link enviado!",
      description: "Verifique seu email e clique no link de acesso.",
    });
  };

  // handleVerifyOtp removed - magic link flow used instead

  const handleResendCode = async () => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(pendingEmail);
    setIsLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    toast({
      title: "Código reenviado!",
      description: "Verifique seu email novamente.",
    });
  };

  // Password handlers
  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Por favor, confirme seu email antes de fazer login");
      } else {
        setError(translateAuthError(error.message));
      }
      return;
    }

    toast({
      title: "Bem-vindo de volta!",
      description: "Login realizado com sucesso.",
    });
  };

  // Navigation helpers
  const goToMain = () => {
    setView("main");
    setError(null);
    setOtpValue("");
    setPendingEmail("");
    setSignupSuccess(false);
    loginForm.reset();
    emailForm.reset();
  };

  const switchToPassword = () => {
    setAuthMethod("password");
    setView("password-login");
    setError(null);
  };

  const switchToOtp = () => {
    setAuthMethod("otp");
    setView("main");
    setError(null);
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
            <Button onClick={goToMain} className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Magic Link confirmation screen
  if (view === "otp-verify") {
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

            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 py-4">
                <Mail className="h-12 w-12 text-primary/70" />
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Clique no link enviado para seu email para acessar sua conta. O link é válido por tempo limitado.
                </p>
              </div>

              <div className="flex flex-col gap-3 text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
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
                <button
                  type="button"
                  onClick={goToMain}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Usar outro email
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <Card className={`relative w-full rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm transition-all duration-300 ${
        view === "password-signup" ? "max-w-2xl" : "max-w-md"
      }`}>
        <CardHeader className={`text-center space-y-6 ${view === "password-signup" ? "pt-8 pb-4" : "pt-10 pb-4"}`}>
          <BrandHeader />
          
           {view !== "password-signup" && (
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">
                {view === "main" && "Acesse sua conta"}
                {view === "password-login" && "Login com senha"}
              </CardTitle>
              <CardDescription className="text-sm">
                {view === "main" && "Informe seu email para receber o link de acesso"}
                {view === "password-login" && "Entre com seu email e senha cadastrados"}
              </CardDescription>
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
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main OTP view */}
          {view === "main" && (
            <div className="space-y-5">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-5">
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
                    Enviar link de acesso por email
                  </Button>
                </form>
              </Form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-4 text-muted-foreground/60 font-medium">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-medium border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all"
                onClick={switchToPassword}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Entrar com senha
              </Button>

            </div>
          )}

          {/* Password Login view */}
          {view === "password-login" && (
            <div className="space-y-5">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
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

            </div>
          )}

        </CardContent>
        
        {/* Footer branding */}
        {view !== "password-signup" && (
          <div className="pb-6 text-center">
            <p className="text-[10px] text-muted-foreground/50">
              Desenvolvido por <span className="font-medium">Nobre Digital</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
