import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy, Eye, EyeOff, KeyRound, Link2, Loader2, Lock, LockOpen, RefreshCw, ShieldCheck, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import {
  AUDIT_LABELS, buildAccessMessage, clientAreaUrl, describeAccountStatus, formatDateTime,
  isValidClientEmail, validatePasswordInput, type ClientAreaAccountStatus,
} from "@/lib/clientAreaAccess";

interface Props {
  clientId: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
}

const toneClasses: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  never: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  blocked: "bg-destructive/10 text-destructive",
};

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  } catch {
    toast.error("Não foi possível copiar. Selecione o texto manualmente.");
  }
}

/**
 * Seção "Acesso à Área do Cliente" (Etapa 1).
 * Visível apenas para agências com site White Label ativo — a mesma regra é
 * aplicada no servidor (Edge Function + funções SECURITY DEFINER).
 */
export function ClientAreaAccessSection({ clientId, clientName, clientEmail }: Props) {
  const { agencyOwnerId } = useAgencyOwnerId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<"create_access" | "reset_password">("create_access");

  const { data: whiteLabel } = useQuery({
    queryKey: ["client-area-whitelabel", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [{ data: domains }, { data: profile }] = await Promise.all([
        supabase
          .from("agency_public_domains")
          .select("hostname, is_primary")
          .eq("user_id", agencyOwnerId as string)
          .eq("is_active", true)
          .order("is_primary", { ascending: false }),
        supabase
          .from("profiles")
          .select("agency_name, name")
          .eq("user_id", agencyOwnerId as string)
          .maybeSingle(),
      ]);
      const hostname = domains?.[0]?.hostname ?? null;
      return {
        active: !!hostname,
        hostname,
        agencyName: profile?.agency_name || profile?.name || null,
      };
    },
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ["client-area-status", clientId],
    enabled: !!clientId && !!whiteLabel?.active,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("client_area_account_status" as any, {
        _client_id: clientId,
      });
      if (error) throw error;
      return data as unknown as ClientAreaAccountStatus;
    },
  });

  const action = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("client-area-admin", {
        body: { client_id: clientId, ...payload },
      });
      if (error) {
        const detail = (data as any)?.error;
        throw new Error(detail || "Não foi possível concluir a operação.");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { password?: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-area-status", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!whiteLabel?.active) return null;

  const url = clientAreaUrl(whiteLabel.hostname);
  const view = describeAccountStatus(status ?? null);
  const emailOk = isValidClientEmail(status?.email ?? clientEmail);
  const loginEmail = (status?.login_email || status?.email || clientEmail || "").toLowerCase();

  const openDialog = (nextIntent: "create_access" | "reset_password") => {
    setIntent(nextIntent);
    setMode("auto");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setIssuedPassword(null);
    setMessage("");
    setDialogOpen(true);
  };

  const submit = async () => {
    if (mode === "manual") {
      const invalid = validatePasswordInput(password, confirmPassword);
      if (invalid) {
        toast.error(invalid);
        return;
      }
    }
    const result = await action.mutateAsync({
      action: intent,
      mode,
      ...(mode === "manual" ? { password } : {}),
    });
    if (!result?.password) return;
    setIssuedPassword(result.password);
    setPassword("");
    setConfirmPassword("");
    setMessage(
      buildAccessMessage({
        clientName,
        agencyName: whiteLabel.agencyName,
        url,
        email: loginEmail,
        password: result.password,
      }),
    );
  };

  const closeDialog = () => {
    // Fechar a janela descarta a senha da memória: não há como consultá-la depois.
    setDialogOpen(false);
    setIssuedPassword(null);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Acesso à Área do Cliente</h4>
            <p className="text-xs text-muted-foreground">
              Login do cliente no site da agência com o e-mail cadastrado.
            </p>
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="secondary" className={toneClasses[view.tone]}>{view.label}</Badge>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{view.description}</p>

      {status?.exists && (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Login</dt>
            <dd className="font-medium text-foreground break-all">{loginEmail || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Último acesso</dt>
            <dd className="font-medium text-foreground">{formatDateTime(status.last_login_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Primeiro acesso</dt>
            <dd className="font-medium text-foreground">{formatDateTime(status.first_login_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Senha atualizada em</dt>
            <dd className="font-medium text-foreground">{formatDateTime(status.password_updated_at)}</dd>
          </div>
        </dl>
      )}

      {!emailOk && !status?.exists && (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Cadastre um e-mail válido para criar o acesso do cliente.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!status?.exists ? (
          <Button
            size="sm"
            disabled={!emailOk || !clientId || action.isPending}
            onClick={() => openDialog("create_access")}
          >
            <UserCheck className="mr-2 h-4 w-4" /> Criar acesso para o cliente
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => openDialog("reset_password")}>
              <RefreshCw className="mr-2 h-4 w-4" /> Gerar nova senha
            </Button>
            {status.status === "blocked" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate({ action: "unblock" })}
              >
                <LockOpen className="mr-2 h-4 w-4" /> Reativar acesso
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate({ action: "block" })}
              >
                <Lock className="mr-2 h-4 w-4" /> Bloquear acesso
              </Button>
            )}
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => copy(url, "Link da Área do Cliente")}>
          <Link2 className="mr-2 h-4 w-4" /> Copiar link
        </Button>
      </div>

      {!!status?.history?.length && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Histórico de segurança
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {status.history.map((h, i) => (
              <li key={`${h.created_at}-${i}`} className="flex justify-between gap-3">
                <span>{AUDIT_LABELS[h.action] ?? h.action}</span>
                <span className="shrink-0">{formatDateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {intent === "create_access" ? "Criar acesso para o cliente" : "Gerar nova senha"}
            </DialogTitle>
            <DialogDescription>
              {issuedPassword
                ? "Por segurança, esta senha será exibida somente agora. Se precisar de uma nova mensagem no futuro, será necessário redefinir o acesso."
                : "Escolha como definir a senha inicial do cliente."}
            </DialogDescription>
          </DialogHeader>

          {!issuedPassword ? (
            <div className="space-y-4">
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "auto" | "manual")}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3">
                  <RadioGroupItem value="auto" className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">Gerar senha automaticamente</span>
                    <span className="block text-xs text-muted-foreground">
                      Senha segura, fácil de digitar e sem relação com dados pessoais.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3">
                  <RadioGroupItem value="manual" className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">Definir uma senha inicial</span>
                    <span className="block text-xs text-muted-foreground">
                      Mínimo de 8 caracteres. Evite datas, telefone ou nome do cliente.
                    </span>
                  </span>
                </label>
              </RadioGroup>

              {mode === "manual" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ca-pwd">Senha inicial</Label>
                    <div className="relative">
                      <Input
                        id="ca-pwd"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ca-pwd-2">Confirmar senha</Label>
                    <Input
                      id="ca-pwd-2"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                A senha será exibida uma única vez, agora. A plataforma não guarda a senha em texto
                aberto e a agência não poderá consultá-la depois.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Login</span>
                  <span className="break-all font-medium">{loginEmail}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Senha inicial</span>
                  <span className="font-mono font-semibold">{issuedPassword}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ca-message">Mensagem para o cliente</Label>
                <Textarea
                  id="ca-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Nenhuma mensagem é enviada automaticamente nesta etapa: copie e envie pelo seu canal.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(message, "Mensagem")}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copy(url, "Link")}>
                  <Link2 className="mr-2 h-4 w-4" /> Copiar link
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copy(loginEmail, "Login")}>
                  <UserCheck className="mr-2 h-4 w-4" /> Copiar login
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copy(issuedPassword, "Senha")}>
                  <KeyRound className="mr-2 h-4 w-4" /> Copiar senha
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!issuedPassword ? (
              <>
                <Button variant="ghost" onClick={closeDialog}>Cancelar</Button>
                <Button onClick={submit} disabled={action.isPending}>
                  {action.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {intent === "create_access" ? "Criar acesso" : "Gerar nova senha"}
                </Button>
              </>
            ) : (
              <Button onClick={closeDialog}>Concluir</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
