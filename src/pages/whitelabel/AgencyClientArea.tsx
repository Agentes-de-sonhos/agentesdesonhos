import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type AgencyDomainInfo } from "@/lib/agencyDomains";
import { getWalletBrandStyle } from "@/lib/agencyColor";
import { useNoindex } from "@/hooks/useNoindex";
import {
  RECOVERY_GUIDANCE, clientAreaAuthBody, isValidClientEmail, prefilledEmailFromSearch,
  readClientAreaToken, validatePasswordInput, writeClientAreaToken,
} from "@/lib/clientAreaAccess";
import { type ClientAreaView, viewFromSearch } from "@/lib/clientAreaNav";
import { ClientAreaLogin } from "@/components/whitelabel/clientarea/ClientAreaLogin";
import { ClientAreaShell } from "@/components/whitelabel/clientarea/ClientAreaShell";
import {
  ClientAreaDocuments, ClientAreaHome, ClientAreaProfile, ClientAreaSupportSection,
} from "@/components/whitelabel/clientarea/ClientAreaSections";
import {
  ClientAreaTripDetail, ClientAreaTripsView,
} from "@/components/whitelabel/clientarea/ClientAreaTripsView";
import { useClientAreaTrip, useClientAreaTrips } from "@/hooks/useClientAreaTrips";
import {
  useClientAreaDocuments, useClientAreaOpener, useClientAreaProfile,
} from "@/hooks/useClientAreaDocuments";
import { agencyWhatsappNumber } from "@/lib/agencyDomains";
import { groupTrips, highlightTrip, tripIdFromPath, tripPathFor } from "@/lib/clientAreaTrips";
import { useAgencyBrandTheme } from "@/lib/useAgencyBrandTheme";

interface SessionClient {
  id: string | null;
  name: string | null;
  email: string;
}

/**
 * Área do Cliente White Label — Etapa 2 (estrutura visual e página inicial).
 *
 * A fundação de acesso da Etapa 1.1 permanece intacta: login por e-mail + senha,
 * hostname obrigatório em TODAS as chamadas, agência resolvida no servidor pelo
 * domínio, token opaco por domínio e rotação aceita quando o servidor devolve um
 * token novo. Esta etapa apenas troca a apresentação: login moderno, casca
 * autenticada com navegação e páginas estruturais (sem consultar viagens,
 * documentos ou dados do CRM).
 */
export default function AgencyClientArea({
  info,
  /** Prefixo real das URLs desta área (o template-base monta sob /sitelab-base). */
  basePath = "/area-do-cliente",
}: {
  info: AgencyDomainInfo;
  basePath?: string;
}) {

  const hostname = typeof window === "undefined" ? "" : window.location.hostname;

  // Área privada do passageiro: nunca indexada por buscadores.
  useNoindex(true);

  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : prefilledEmailFromSearch(window.location.search));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [client, setClient] = useState<SessionClient | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showChange, setShowChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [view, setView] = useState<ClientAreaView>(() =>
    typeof window === "undefined" ? "inicio" : viewFromSearch(window.location.search));
  const [tripId, setTripId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : tripIdFromPath(window.location.pathname));

  /** Guarda o token devolvido pelo servidor (login ou rotação de sessão). */
  const storeToken = (token?: string | null) => {
    if (typeof token === "string" && token.length >= 32) writeClientAreaToken(hostname, token);
  };

  const changeView = (next: ClientAreaView) => {
    setView(next);
    setTripId(null);
    try {
      const url = new URL(window.location.href);
      if (tripIdFromPath(url.pathname)) url.pathname = basePath;
      url.searchParams.set("area", next);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* histórico indisponível: a navegação continua em memória */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      const { data, error } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("session", hostname, { token: stored }),
      });
      if (cancelled) return;
      const result = data as any;
      if (result?.client) {
        storeToken(result.token);
        setClient(result.client as SessionClient);
      } else if (error && !result) {
        // Erro temporário (rede/função indisponível): NÃO descarta um token válido.
        setFormError("Não foi possível validar seu acesso agora. Tente novamente em instantes.");
      } else {
        // Sessão expirada, conta bloqueada ou token inválido: limpamos de fato.
        writeClientAreaToken(hostname, null);
        setFormError(result?.error || "Sua sessão expirou. Entre novamente para continuar.");
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [hostname]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isValidClientEmail(email) || !password) {
      setFormError("Informe seu e-mail e sua senha.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("login", hostname, {
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const result = data as any;
      if (!result?.token) {
        setFormError(
          result?.error ||
            (error ? "Não foi possível entrar agora. Tente novamente em instantes." : "E-mail ou senha incorretos."),
        );
        return;
      }
      storeToken(result.token);
      setClient(result.client as SessionClient);
      setPassword("");
      setRecoveryNotice(null);
      setView("inicio");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    const stored = readClientAreaToken(hostname);
    writeClientAreaToken(hostname, null);
    setClient(null);
    setShowChange(false);
    setFormError(null);
    if (stored) {
      await supabase.functions.invoke("client-area-auth", {
        body: clientAreaAuthBody("logout", hostname, { token: stored }),
      });
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePasswordInput(newPassword, confirmPassword);
    setPasswordError(invalid);
    if (invalid) return;
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
        setPasswordError(result?.error || "Não foi possível alterar a senha.");
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
      setFormError("Informe seu e-mail para solicitarmos o acesso.");
      return;
    }
    setFormError(null);
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

  /**
   * Minhas viagens (Etapa 3): uma única fonte segura alimenta a lista e o
   * destaque da página inicial. A agência e o cliente são resolvidos no
   * servidor pela sessão + hostname.
   */
  const authenticated = !!client;
  const trips = useClientAreaTrips({
    hostname,
    enabled: authenticated,
    onToken: storeToken,
    onExpired: () => {
      writeClientAreaToken(hostname, null);
      setClient(null);
      setFormError("Sua sessão expirou. Entre novamente para continuar.");
    },
  });
  const grouped = useMemo(() => groupTrips(trips.trips), [trips.trips]);
  const highlight = useMemo(() => highlightTrip(grouped), [grouped]);

  const tripDetail = useClientAreaTrip({
    hostname,
    tripId,
    enabled: authenticated && !!tripId,
    onExpired: () => {
      writeClientAreaToken(hostname, null);
      setClient(null);
    },
  });

  /** Etapa 5 — documentos, perfil em consulta e acessos (carteira/roteiro). */
  const documents = useClientAreaDocuments({
    hostname,
    enabled: authenticated,
    onExpired: () => {
      writeClientAreaToken(hostname, null);
      setClient(null);
    },
  });
  const profile = useClientAreaProfile({ hostname, enabled: authenticated });
  const opener = useClientAreaOpener(hostname);

  const openTrip = (id: string) => {
    setTripId(id);
    setView("viagens");
    try {
      window.history.pushState(null, "", tripPathFor(id, basePath));
    } catch {
      /* histórico indisponível: a navegação continua em memória */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToTrips = () => {
    setTripId(null);
    try {
      window.history.pushState(null, "", `${basePath}?area=viagens`);
    } catch {
      /* histórico indisponível */
    }
  };

  /**
   * Identidade White Label: a cor primária da agência dirige os tokens shadcn
   * (--primary/--ring e o contraste do texto) apenas dentro da Área do Cliente.
   */
  /** Pedido de atualização de cadastro: o cliente nunca edita — só solicita. */
  const requestProfileUpdate = () => {
    const phone = agencyWhatsappNumber(info);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(
          "Olá! Gostaria de atualizar meus dados de cadastro na Área do Cliente.",
        )}`
      : null;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    changeView("atendimento");
  };

  const brandStyle = getWalletBrandStyle(info.primary_color, info.secondary_color ?? null);
  useAgencyBrandTheme({
    primary: info.primary_color,
    secondary: info.secondary_color ?? null,
    secondaryAuto: info.secondary_auto !== false,
  });

  if (checking) {
    return (
      <div style={brandStyle} className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Validando seu acesso…</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={brandStyle}>
      <ClientAreaLogin
        info={info}
        email={email}
        password={password}
        showPassword={showPassword}
        busy={busy}
        formError={formError}
        recoveryNotice={recoveryNotice}
        onEmail={setEmail}
        onPassword={setPassword}
        onToggleShow={() => setShowPassword((v) => !v)}
        onSubmit={login}
        onRecover={recover}
      />
      </div>
    );
  }

  return (
    <div style={brandStyle}>
    <ClientAreaShell
      info={info}
      view={view}
      onChangeView={changeView}
      clientName={client.name}
      clientEmail={client.email}
      onLogout={logout}
    >
      {view === "inicio" && (
        <ClientAreaHome
          info={info}
          clientName={client.name}
          onChangeView={changeView}
          tripsStatus={trips.status}
          highlight={highlight}
          onOpenTrip={openTrip}
        />
      )}
      {view === "viagens" && (tripId ? (
        <ClientAreaTripDetail
          info={info}
          status={tripDetail.status}
          trip={tripDetail.trip}
          onBack={backToTrips}
          documentPendingId={opener.pendingId}
          documentError={opener.error}
          onOpenDocument={opener.openDocument}
          onOpenWallet={opener.openWallet}
        />
      ) : (
        <ClientAreaTripsView
          info={info}
          status={trips.status}
          grouped={grouped}
          onRetry={trips.reload}
          onOpenTrip={openTrip}
        />
      ))}
      {view === "documentos" && (
        <ClientAreaDocuments
          info={info}
          status={documents.status}
          documents={documents.documents}
          pendingId={opener.pendingId}
          error={opener.error}
          onOpen={opener.openDocument}
          onRetry={documents.reload}
          onOpenTrip={openTrip}
        />
      )}
      {view === "perfil" && (
        <ClientAreaProfile
          info={info}
          clientName={client.name}
          clientEmail={client.email}
          showChange={showChange}
          onToggleChange={() => setShowChange((v) => !v)}
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          onCurrentPassword={setCurrentPassword}
          onNewPassword={setNewPassword}
          onConfirmPassword={setConfirmPassword}
          onSubmitPassword={changePassword}
          passwordError={passwordError}
          busy={busy}
          onLogout={logout}
          profile={profile}
          onRequestUpdate={requestProfileUpdate}
        />
      )}
      {view === "atendimento" && <ClientAreaSupportSection info={info} />}
    </ClientAreaShell>
    </div>
  );
}
