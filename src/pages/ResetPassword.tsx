import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
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

const resetSchema = z
  .object({
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (data: ResetFormData) => {
    setError(null);
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: data.password });
    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    toast({
      title: "Senha atualizada!",
      description: "Sua senha foi redefinida com sucesso.",
    });

    setTimeout(() => navigate("/auth", { replace: true }), 3000);
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <img src={logoAgentes} alt="Agentes de Sonhos" className="h-36 w-auto" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold">Link inválido</CardTitle>
              <CardDescription className="text-sm">
                Este link de redefinição de senha é inválido ou já expirou.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <Button onClick={() => navigate("/auth")} className="w-full h-12 rounded-xl text-base font-medium">
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
        <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="pt-10 pb-4 text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <img src={logoAgentes} alt="Agentes de Sonhos" className="h-36 w-auto" />
            </div>
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <CardTitle className="text-xl font-semibold">Senha atualizada!</CardTitle>
              <CardDescription className="text-sm">
                Sua senha foi redefinida com sucesso. Você será redirecionado para o login.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <Button onClick={() => navigate("/auth")} className="w-full h-12 rounded-xl text-base font-medium">
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm">
        <CardHeader className="pt-10 pb-4 text-center space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <img src={logoAgentes} alt="Agentes de Sonhos" className="h-36 w-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold">Redefinir senha</CardTitle>
            <CardDescription className="text-sm">Crie uma nova senha para sua conta</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-10 space-y-5">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleReset)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Nova senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
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
                      Confirmar nova senha
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
                Redefinir senha
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
