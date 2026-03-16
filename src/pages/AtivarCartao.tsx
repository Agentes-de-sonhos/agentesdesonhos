import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, CheckCircle, ShieldAlert } from "lucide-react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
import { formatPhone } from "@/lib/validators";

const translateAuthError = (msg: string): string => {
  if (/already.registered|já está cadastrado/i.test(msg)) return "Este e-mail já está cadastrado. Faça login no app.";
  if (/rate.limit|too many requests|email rate limit exceeded/i.test(msg)) return "Muitas tentativas seguidas. Aguarde alguns minutos.";
  if (/non-2xx status code/i.test(msg)) return "Não foi possível concluir o cadastro agora. Tente novamente.";
  if (/invalid.login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/weak.password/i.test(msg)) return "A senha deve ter pelo menos 6 caracteres.";
  if (/network/i.test(msg)) return "Erro de conexão. Verifique sua internet.";
  if (/token.*inválido|token.*utilizado/i.test(msg)) return msg;
  if (/expirou/i.test(msg)) return msg;
  if (/não corresponde/i.test(msg)) return msg;
  return msg;
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().min(14, "Telefone inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SignupData = z.infer<typeof signupSchema>;

const APP_LOGIN_URL = "https://app.agentesdesonhos.com.br/auth";

// Token validation states
type TokenState = "loading" | "valid" | "invalid" | "expired" | "missing";

export default function AtivarCartao() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>(token ? "loading" : "missing");
  const [tokenEmail, setTokenEmail] = useState<string>("");

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  // If already logged in, redirect
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenState("missing");
      return;
    }

    const validateToken = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("validate-activation-token", {
          body: { token },
        });

        if (fnError || data?.error) {
          const errMsg = data?.error || "Token inválido";
          if (/expir/i.test(errMsg)) {
            setTokenState("expired");
          } else {
            setTokenState("invalid");
          }
          return;
        }

        if (data?.valid && data?.email) {
          setTokenEmail(data.email);
          setTokenState("valid");
          form.setValue("email", data.email);
        } else {
          setTokenState("invalid");
        }
      } catch {
        setTokenState("invalid");
      }
    };

    validateToken();
  }, [token, form]);

  const handleSubmit = async (data: SignupData) => {
    if (!token || tokenState !== "valid") return;

    setError(null);
    setIsLoading(true);

    try {
      const { data: signupResult, error: signupError } = await supabase.functions.invoke("activate-card-signup", {
        body: {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone,
          password: data.password,
          activation_token: token,
        },
      });

      if (signupError) {
        setError(translateAuthError(signupError.message));
        return;
      }

      if (signupResult?.error) {
        setError(translateAuthError(signupResult.error));
        return;
      }

      setSuccess(true);
      toast({
        title: "Conta criada com sucesso!",
        description: "Agora faça login no app para acessar seu Cartão Digital.",
      });
    } catch (err) {
      console.error("Signup error:", err);
      setError("Ocorreu um erro ao criar a conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || tokenState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid / expired / missing token screen
  if (tokenState !== "valid" && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <img src={logoAgentes} alt="Agentes de Sonhos" className="h-28 w-auto" />
            </div>
            <div className="flex justify-center">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">
                {tokenState === "missing" && "Link de ativação necessário"}
                {tokenState === "invalid" && "Link de ativação inválido"}
                {tokenState === "expired" && "Link de ativação expirado"}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {tokenState === "missing" && "Para ativar seu Cartão Digital, utilize o link enviado para seu e-mail após o pagamento."}
                {tokenState === "invalid" && "Este link de ativação é inválido ou já foi utilizado. Cada link pode ser usado apenas uma vez."}
                {tokenState === "expired" && "Este link de ativação expirou. Links são válidos por 24 horas após o pagamento. Entre em contato com o suporte para solicitar um novo."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-3">
            <Button
              onClick={() => { window.location.href = APP_LOGIN_URL; }}
              className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20"
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <Card className="w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <img src={logoAgentes} alt="Agentes de Sonhos" className="h-28 w-auto" />
            </div>
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Cadastro realizado!</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Sua conta foi criada com sucesso. Faça login no app para acessar e configurar seu Cartão Digital.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <Button
              onClick={() => { window.location.href = APP_LOGIN_URL; }}
              className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20"
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup form (token is valid)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
        <CardHeader className="pt-8 pb-4 text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <img src={logoAgentes} alt="Agentes de Sonhos" className="h-28 w-auto" />
          </div>

          <div className="inline-flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <CreditCard className="h-4 w-4" />
            Cartão Digital
          </div>

          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">Ative seu Cartão Digital</CardTitle>
            <CardDescription className="text-sm">
              Pagamento confirmado! Preencha seus dados para ativar seu cartão
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 space-y-5">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Nome Completo
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Seu nome completo"
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
                control={form.control}
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
                          readOnly
                          className="h-12 pl-11 rounded-xl border-muted-foreground/20 bg-muted/50 cursor-not-allowed transition-colors"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">E-mail vinculado ao pagamento</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Telefone / WhatsApp
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="(00) 00000-0000"
                          className="h-12 pl-11 rounded-xl border-muted-foreground/20 bg-muted/30 focus:bg-background transition-colors"
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                          autoComplete="new-password"
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
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Confirmar Senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
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
                Criar conta e ativar cartão
              </Button>
            </form>
          </Form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { window.location.href = APP_LOGIN_URL; }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tem conta? <span className="font-medium text-primary underline underline-offset-4">Faça login</span>
            </button>
          </div>
        </CardContent>

        <div className="pb-6 text-center">
          <p className="text-[10px] text-muted-foreground/50">
            Desenvolvido por <span className="font-medium">Nobre Digital</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
