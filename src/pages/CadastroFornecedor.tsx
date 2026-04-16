import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Operadora",
  "Companhia Aérea",
  "Rede Hoteleira",
  "Seguradora",
  "Receptivo",
  "Cruzeiro",
  "Locadora",
  "Consolidadora",
  "Outro",
];

export default function CadastroFornecedor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    category: "",
    email: "",
    password: "",
    password_confirm: "",
    responsible_name: "",
    phone: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.company_name.trim() || !form.email.trim() || !form.password || !form.responsible_name.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password !== form.password_confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("supplier-register", {
        body: {
          company_name: form.company_name.trim(),
          category: form.category || null,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          responsible_name: form.responsible_name.trim(),
          phone: form.phone.trim() || null,
        },
      });

      if (error) {
        // functions.invoke wraps non-2xx as FunctionsHttpError; try to parse the body
        let msg = "Erro ao criar conta.";
        try {
          const body = typeof error.context === "object" && error.context?.body
            ? JSON.parse(new TextDecoder().decode(await new Response(error.context.body).arrayBuffer()))
            : null;
          if (body?.error) msg = body.error;
        } catch {}
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (signInError) {
        toast.error("Conta criada! Faça login com suas credenciais.");
        navigate("/auth");
        return;
      }

      toast.success("Conta criada com sucesso! Bem-vindo.");
      navigate("/meu-perfil-empresa");
    } catch {
      toast.error("Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Empresa</h1>
          <p className="text-muted-foreground mt-2">
            Crie sua conta para gerenciar o perfil da sua empresa no Mapa do Turismo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div>
            <Label>Nome da Empresa *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="Ex: Operadora XYZ Turismo"
              className="mt-1 rounded-xl"
              required
            />
          </div>

          <div>
            <Label>Categoria</Label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione a categoria</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Nome do Responsável *</Label>
            <Input
              value={form.responsible_name}
              onChange={(e) => update("responsible_name", e.target.value)}
              placeholder="Nome completo"
              className="mt-1 rounded-xl"
              required
            />
          </div>

          <div>
            <Label>Telefone / WhatsApp</Label>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(11) 99999-9999"
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label>E-mail de Acesso *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@empresa.com"
              className="mt-1 rounded-xl"
              required
            />
          </div>

          <div>
            <Label>Senha *</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="rounded-xl pr-10"
                required
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
            <Label>Confirmar Senha *</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password_confirm}
                onChange={(e) => update("password_confirm", e.target.value)}
                placeholder="Repita a senha"
                className="rounded-xl pr-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl h-12 text-base" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Criar Conta
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <button type="button" onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
              Faça login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
