import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, Loader2 } from "lucide-react";
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

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
});

type EmailFormData = z.infer<typeof emailSchema>;

type AuthView = "email" | "otp";

export default function Auth() {
  const [view, setView] = useState<AuthView>("email");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");

  const navigate = useNavigate();
  const { sendOtp, verifyOtp, user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Redirect based on role after login
  useEffect(() => {
    if (user && !roleLoading && role) {
      const destination = role === "admin" ? "/admin" : "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [user, role, roleLoading, navigate]);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

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
    setView("otp");
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

  const handleBackToEmail = () => {
    setView("email");
    setError(null);
    setOtpValue("");
    setPendingEmail("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Cloud className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display">
              {view === "email" ? "Acesse sua conta" : "Digite o código"}
            </CardTitle>
            <CardDescription className="mt-2">
              {view === "email"
                ? "Informe seu email para receber o código de acesso"
                : `Enviamos um código de 6 dígitos para ${pendingEmail}`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {view === "email" ? (
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
                  Enviar código
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                >
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
                  onClick={handleBackToEmail}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Usar outro email
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
