import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Eye, EyeOff, FileText, KeyRound, Loader2, LogOut, Map, MessageCircle,
  Receipt, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import {
  RECOVERY_GUIDANCE, agencyWhatsappLink, clientAreaAuthBody, isValidClientEmail,
  prefilledEmailFromSearch, readClientAreaToken, validatePasswordInput, writeClientAreaToken,
} from "@/lib/clientAreaAccess";

const KINDS = [
  { value: "carteira", label: "Carteira da viagem", icon: Wallet },
  { value: "orcamento", label: "Orçamento", icon: FileText },
  { value: "roteiro", label: "Roteiro", icon: Map },
  { value: "fatura", label: "Fatura", icon: Receipt },
] as const;

interface SessionClient {
  id: string | null;
  name: string | null;
  email: string;
}

/**
 * Área do Cliente White Label — Etapa 1.1.
 *
 * Login por e-mail + senha definida pela agência, isolado por domínio: o
 * hostname atual é enviado em TODAS as chamadas e a agência é sempre resolvida
 * no servidor, nunca pelo que o navegador afirma. O token de sessão é opaco,
 * guardado por domínio e substituído quando o servidor devolve um novo (rotação).
 * O acesso por código de link permanece disponível, sem login, em bloco separado.
 */
export default function AgencyClientArea({ info }: { info: AgencyDomainInfo }) {
  const navigate = useNavigate();
  const name = agencyDisplayName(info);
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;

  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("carteira");
  const [code, setCode] = useState("");

  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : prefilledEmailFromSearch(window.location.search));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [client, setClient] = useState<SessionClient | null>(null);
  const [showChange, setShowChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const whatsappLink = useMemo(
    () => agencyWhatsappLink(info.phone, `Olá! Preciso de ajuda com meu acesso à Área do Cliente da ${name}.`),
    [info.phone, name],
  );

  /** Guarda o token devolvido pelo servidor (login ou rotação de sessão). */
  const storeToken = (token?: string | null) => {
    if (typeof token === "string" && token.length >= 32) writeClientAreaToken(hostname, token);
  };

  // Revalida a sessão salva no navegador — o servidor decide se ainda vale.
  useEffect(() => {
    let cancelled = false;
    const stored = readClientAreaToken(hostname);
    if (!stored) {
      setChecking(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("session", hostname, { token: stored }),
      });
      if (cancelled) return;
      const result = data as any;
      if (result?.client) {
        storeToken(result.token);
        setClient(result.client as SessionClient);
      } else {
        writeClientAreaToken(hostname, null);
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [hostname]);

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(/\s+/g, "");
    if (!clean) return;
    navigate(`/${kind}/${encodeURIComponent(clean)}`);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidClientEmail(email) || !password) {
      toast.error("Informe seu e-mail e sua senha.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("login", hostname, {
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const result = data as any;
      if (!result?.token) {
        toast.error(result?.error || "E-mail ou senha incorretos.");
        return;
      }
      storeToken(result.token);
      setClient(result.client as SessionClient);
      setPassword("");
      setRecoveryNotice(null);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    const stored = readClientAreaToken(hostname);
    writeClientAreaToken(hostname, null);
    setClient(null);
    setShowChange(false);
    if (stored) {
      await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("logout", hostname, { token: stored }),
      });
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePasswordInput(newPassword, confirmPassword);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("change_password", hostname, {
          token: readClientAreaToken(hostname),
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const result = data as any;
      if (!result?.ok) {
        toast.error(result?.error || "Não foi possível alterar a senha.");
        return;
      }
      // A sessão atual continua válida com um token novo; as demais são encerradas.
      storeToken(result.token);
      toast.success("Senha alterada. Os outros dispositivos precisarão entrar novamente.");
      setShowChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    if (!isValidClientEmail(email)) {
      toast.error("Informe seu e-mail para solicitarmos o acesso.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("recovery", hostname, {
          email: email.trim().toLowerCase(),
        }),
      });
      // Nunca prometemos envio de e-mail: a orientação é falar com a agência.
      setRecoveryNotice((data as any)?.message || RECOVERY_GUIDANCE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Área do Cliente</h1>
      <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />

      {checking ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : client ? (
        <>
          <p className="mt-4 text-muted-foreground">
            Olá{client.name ? `, ${client.name.split(/\s+/)[0]}` : ""}! Você está conectado à Área do
            Cliente da {name}.
          </p>

          <Card className="mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Conta</p>
                <p className="text-sm text-muted-foreground break-all">{client.email}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowChange((v) => !v)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </Button>
              </div>
            </div>

            {showChange && (
              <form onSubmit={changePassword} className="mt-6 space-y-4 border-t border-border/60 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="ca-current">Senha atual</Label>
                  <Input
                    id="ca-current"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ca-new">Nova senha</Label>
                    <Input
                      id="ca-new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ca-confirm">Confirmar nova senha</Label>
                    <Input
                      id="ca-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar nova senha
                </Button>
              </form>
            )}
          </Card>

          <Card className="mt-6 p-6">
            <h2 className="text-base font-semibold text-foreground">Suas viagens</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estamos preparando esta área: em breve suas viagens, serviços, documentos, roteiro e
              Carteira Digital aparecerão aqui automaticamente, sem precisar de nenhum código.
            </p>
          </Card>
        </>
      ) : (
        <>
          <p className="mt-4 text-muted-foreground">
            Entre com o e-mail cadastrado na {name} e a senha que você recebeu.
          </p>

          <Card className="mt-8 p-6">
            <form onSubmit={login} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ca-email">E-mail</Label>
                <Input
                  id="ca-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ca-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="ca-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                </Button>
                <Button type="button" variant="link" onClick={recover} disabled={busy}>
                  Esqueci minha senha
                </Button>
              </div>
            </form>

            {recoveryNotice && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm text-foreground">{recoveryNotice}</p>
                {whatsappLink && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> Falar com a agência
                    </a>
                  </Button>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold text-foreground">
          Recebeu um link com código? Acesse aqui
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este acesso é independente do login acima e serve para abrir um conteúdo específico que a
          agência enviou (carteira, orçamento, roteiro ou fatura). Se o conteúdo tiver senha própria,
          ela continua sendo solicitada normalmente.
        </p>
        <form onSubmit={submitCode} className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label>O que você quer acessar?</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acesso-codigo">Código de acesso</Label>
            <Input
              id="acesso-codigo"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Cole aqui o código do seu link"
              autoComplete="off"
            />
          </div>

          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Acessar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        Precisa de ajuda com seu acesso? Fale com a {name}.
      </p>
    </section>
  );
}
