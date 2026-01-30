import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, Loader2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Schemas
const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).max(100),
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

type EmailFormData = z.infer<typeof emailSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

type AuthMethod = "otp" | "password";
type AuthView = "main" | "otp-verify" | "password-login" | "password-signup";

export default function Auth() {
  const [view, setView] = useState<AuthView>("main");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("otp");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const navigate = useNavigate();
  const { sendOtp, verifyOtp, signIn, signUp, user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !roleLoading && role) {
      const destination = role === "admin" ? "/admin" : "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [user, role, roleLoading, navigate]);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // OTP handlers
  const handleSendOtp = async (data: EmailFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(data.email);
    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setPendingEmail(data.email);
    setView("otp-verify");
    toast({
      title: "Código enviado!",
      description: "Verifique seu email e insira o código de verificação.",
    });
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setError("Por favor, insira o código completo de 6 dígitos");
      return;
    }

    setError(null);
    setIsLoading(true);
    const { error } = await verifyOtp(pendingEmail, otpValue);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("Token has expired")) {
        setError("Código expirado. Solicite um novo código.");
      } else if (error.message.includes("Invalid") || error.message.includes("invalid")) {
        setError("Código inválido. Verifique e tente novamente.");
      } else {
        setError(error.message);
      }
      return;
    }

    toast({
      title: "Bem-vindo!",
      description: "Login realizado com sucesso.",
    });
  };

  const handleResendCode = async () => {
    setError(null);
    setIsLoading(true);
    const { error } = await sendOtp(pendingEmail);
    setIsLoading(false);

    if (error) {
      setError(error.message);
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
        setError(error.message);
      }
      return;
    }

    toast({
      title: "Bem-vindo de volta!",
      description: "Login realizado com sucesso.",
    });
  };

  const handleSignup = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.name);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        setError("Este email já está cadastrado");
      } else {
        setError(error.message);
      }
      return;
    }

    setSignupSuccess(true);
    toast({
      title: "Cadastro realizado!",
      description: "Verifique seu email para confirmar a conta.",
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
    signupForm.reset();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
              <Cloud className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Verifique seu email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de confirmação para o seu email. Clique no link para ativar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goToMain} className="w-full">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Verification screen
  if (view === "otp-verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
              <Cloud className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Digite o código</CardTitle>
              <CardDescription className="mt-2">
                Enviamos um código de 6 dígitos para {pendingEmail}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={isLoading || otpValue.length !== 6}
                onClick={handleVerifyOtp}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar código
              </Button>

              <div className="flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={goToMain}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Usar outro email
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Cloud className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display">
              {view === "main" && "Acesse sua conta"}
              {view === "password-login" && "Login com senha"}
              {view === "password-signup" && "Criar conta"}
            </CardTitle>
            <CardDescription className="mt-2">
              {view === "main" && "Informe seu email para receber o código de acesso"}
              {view === "password-login" && "Entre com seu email e senha"}
              {view === "password-signup" && "Preencha os dados para criar sua conta"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main OTP view */}
          {view === "main" && (
            <>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar código por email
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={switchToPassword}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Entrar com senha
              </Button>
            </>
          )}

          {/* Password Login view */}
          {view === "password-login" && (
            <>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            {...field}
                          />
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
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </Form>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setView("password-signup")}
                  className="text-sm text-primary hover:underline"
                >
                  Não tem conta? Cadastre-se
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={switchToOtp}
              >
                <Mail className="mr-2 h-4 w-4" />
                Entrar com código por email
              </Button>
            </>
          )}

          {/* Password Signup view */}
          {view === "password-signup" && (
            <>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="text-sm font-medium leading-none">
                    Nome completo
                  </label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    autoComplete="name"
                    {...signupForm.register("name")}
                  />
                  {signupForm.formState.errors.name && (
                    <p className="text-sm font-medium text-destructive">
                      {signupForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium leading-none">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    {...signupForm.register("email")}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium leading-none">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...signupForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar conta
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView("password-login")}
                  className="text-sm text-primary hover:underline"
                >
                  Já tem conta? Faça login
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={switchToOtp}
              >
                <Mail className="mr-2 h-4 w-4" />
                Entrar com código por email
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
