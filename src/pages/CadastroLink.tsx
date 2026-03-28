import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";

export default function CadastroLink() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ plan: string; role: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setErrorMessage("Link inválido.");
        setLoading(false);
        return;
      }

      const { data: rawData, error } = await supabase
        .rpc("get_registration_link" as any, { _token: token })
        .single();

      const data = rawData as { plan: string; role: string; max_uses: number; uses_count: number; expires_at: string | null } | null;

      if (error || !data) {
        setErrorMessage("Link de cadastro não encontrado ou inválido.");
        setLoading(false);
        return;
      }

      if (data.max_uses && data.uses_count >= data.max_uses) {
        setErrorMessage("Este link de cadastro já foi utilizado.");
        setLoading(false);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setErrorMessage("Este link de cadastro expirou.");
        setLoading(false);
        return;
      }

      setLinkInfo({ plan: data.plan, role: data.role });
      setLinkValid(true);
      setLoading(false);
    }

    validateToken();
  }, [token]);

  const planLabels: Record<string, string> = {
    profissional: "Plano Fundador",
    essencial: "Plano Essencial",
    educa_pass: "Educa Pass",
    cartao_digital: "Cartão Digital",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    if (form.password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-via-link", {
        body: { token, ...form },
      });

      if (error || data?.error) {
        toast({ title: data?.error || "Erro ao criar conta", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (!signInError) {
        setTimeout(() => navigate("/onboarding"), 1500);
      }
    } catch {
      toast({ title: "Erro inesperado. Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Link Inválido</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar à página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Conta criada com sucesso!</h2>
            <p className="text-muted-foreground">Redirecionando para a plataforma...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-12 mx-auto" />
          <CardTitle className="text-2xl">Criar sua conta</CardTitle>
          <CardDescription>
            {linkInfo && planLabels[linkInfo.plan]
              ? `Acesso ao ${planLabels[linkInfo.plan]}`
              : "Complete seu cadastro para acessar a plataforma"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome completo *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">E-mail *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Senha *</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
