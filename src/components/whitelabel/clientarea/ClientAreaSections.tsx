import {
  FileText, KeyRound, Loader2, LogOut, MapPinned, MessageCircle, Sparkles, UserRound, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandText } from "@/components/ui/brand-text";
import { type AgencyDomainInfo, agencyDisplayName } from "@/lib/agencyDomains";
import { type ClientAreaView, firstName } from "@/lib/clientAreaNav";
import {
  type ClientAreaTrip, tripPeriodLabel, tripStatusLabel, tripTitle,
} from "@/lib/clientAreaTrips";
import {
  DOCUMENTS_EMPTY, DOCUMENTS_INTRO, type ClientAreaDocument, documentsCountLabel,
} from "@/lib/clientAreaDocuments";
import type { ClientAreaProfileData } from "@/hooks/useClientAreaDocuments";
import { DocumentTripGroups } from "./ClientAreaDocumentList";
import { ClientAreaSupportCard } from "./ClientAreaSupportCard";
import { ClientAreaCodeAccess } from "./ClientAreaCodeAccess";

function SectionCard({
  title, description, icon: Icon, children,
}: {
  title: string;
  description: string;
  icon: typeof MapPinned;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-foreground md:text-2xl">{title}</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/** Destaque da home: rótulo honesto conforme a viagem em andamento ou futura. */
function highlightHeading(trip: ClientAreaTrip): string {
  return tripStatusLabel(trip) === "Em viagem" ? "Sua viagem em andamento" : "Sua próxima viagem";
}

/** Página inicial autenticada: acolhedora, verdadeira e sem dados fictícios. */
export function ClientAreaHome({
  info, clientName, onChangeView, tripsStatus, highlight, onOpenTrip,
}: {
  info: AgencyDomainInfo;
  clientName: string | null;
  onChangeView: (v: ClientAreaView) => void;
  /** Mesma fonte segura da página “Minhas viagens” — sem consulta duplicada. */
  tripsStatus: "loading" | "ready" | "error" | "expired";
  /** Viagem em andamento (prioridade) ou a próxima mais próxima. */
  highlight: ClientAreaTrip | null;
  onOpenTrip: (id: string) => void;
}) {
  const name = agencyDisplayName(info);
  const greeting = firstName(clientName);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {greeting ? `Olá, ${greeting}!` : "Olá!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo à sua área exclusiva na <BrandText>{name}</BrandText>.
        </p>
      </section>

      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 to-transparent p-6 shadow-sm md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </span>

        {tripsStatus === "ready" && highlight ? (
          <>
            <h2 className="mt-4 text-sm font-medium uppercase tracking-wide text-primary">
              {highlightHeading(highlight)}
            </h2>
            <p className="mt-2 text-xl font-semibold text-foreground md:text-2xl">
              {tripTitle(highlight)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tripPeriodLabel(highlight)} · {tripStatusLabel(highlight)}
            </p>
            <Button className="mt-5 min-h-11" onClick={() => onOpenTrip(highlight.id)}>
              Ver viagem
            </Button>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-xl font-semibold text-foreground md:text-2xl">
              Suas viagens em um só lugar
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
              {tripsStatus === "loading"
                ? "Estamos carregando suas viagens."
                : tripsStatus === "ready"
                  ? "Quando a sua agência registrar uma viagem, ela aparecerá aqui."
                  : "Não foi possível carregar suas viagens agora."}
            </p>
            <Button variant="outline" className="mt-5 min-h-11" onClick={() => onChangeView("viagens")}>
              <MapPinned className="mr-2 h-4 w-4" aria-hidden="true" /> Minhas viagens
            </Button>
          </>
        )}
      </section>

      <section aria-labelledby="ca-acoes" className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
        <h2 id="ca-acoes" className="text-lg font-semibold text-foreground">Ações rápidas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="min-h-12 justify-start" onClick={() => onChangeView("atendimento")}>
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Falar com a agência
          </Button>
          <Button variant="outline" className="min-h-12 justify-start" onClick={() => onChangeView("perfil")}>
            <UserRound className="mr-2 h-4 w-4" aria-hidden="true" /> Meu perfil
          </Button>
          <Button variant="outline" className="min-h-12 justify-start" onClick={() => onChangeView("perfil")}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" /> Alterar senha
          </Button>
          <Button variant="outline" className="min-h-12 justify-start" onClick={() => onChangeView("viagens")}>
            <MapPinned className="mr-2 h-4 w-4" aria-hidden="true" /> Minhas viagens
          </Button>
        </div>

        <div className="mt-4 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-2">
          <Button variant="outline" className="min-h-12 justify-start" onClick={() => onChangeView("documentos")}>
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" /> Meus documentos
          </Button>
          {highlight ? (
            <Button variant="outline" className="min-h-12 justify-start" onClick={() => onOpenTrip(highlight.id)}>
              <Wallet className="mr-2 h-4 w-4" aria-hidden="true" /> Carteira e roteiro da viagem
            </Button>
          ) : null}
        </div>

        <ClientAreaCodeAccess className="mt-5" />
      </section>

      <ClientAreaSupportCard info={info} compact />
    </div>
  );
}

/**
 * Central "Meus documentos" (Etapa 5). Lista somente o que a agência
 * disponibilizou; a abertura pede uma autorização nova a cada clique.
 */
export function ClientAreaDocuments({
  info, status, documents, pendingId, error, onOpen, onRetry, onOpenTrip,
}: {
  info: AgencyDomainInfo;
  status: "loading" | "ready" | "error" | "expired";
  documents: ClientAreaDocument[];
  pendingId: string | null;
  error: string | null;
  onOpen: (doc: ClientAreaDocument) => void;
  onRetry: () => void;
  onOpenTrip: (tripId: string) => void;
}) {
  if (status === "loading") {
    return (
      <SectionCard icon={FileText} title="Meus documentos" description={DOCUMENTS_INTRO}>
        <div className="mt-5 flex items-center gap-3 text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Carregando seus documentos…</span>
        </div>
      </SectionCard>
    );
  }

  if (status !== "ready") {
    return (
      <SectionCard icon={FileText} title="Meus documentos" description={DOCUMENTS_INTRO}>
        <p role="alert" className="mt-4 text-sm text-muted-foreground">
          {status === "expired"
            ? "Sua sessão expirou. Entre novamente para continuar."
            : "Não foi possível carregar seus documentos agora."}
        </p>
        {status === "error" ? (
          <Button variant="outline" className="mt-4 min-h-11" onClick={onRetry}>Tentar novamente</Button>
        ) : null}
      </SectionCard>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <SectionCard icon={FileText} title="Meus documentos" description={DOCUMENTS_INTRO}>
          <p className="mt-4 text-sm text-muted-foreground">{DOCUMENTS_EMPTY}</p>
        </SectionCard>
        <ClientAreaSupportCard info={info} compact />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard icon={FileText} title="Meus documentos" description={DOCUMENTS_INTRO}>
        <p className="mt-4 text-sm text-muted-foreground">{documentsCountLabel(documents.length)}</p>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </SectionCard>
      <DocumentTripGroups
        documents={documents}
        actions={{ pendingId, onOpen }}
        onOpenTrip={onOpenTrip}
      />
      <ClientAreaSupportCard info={info} compact />
    </div>
  );
}

interface ProfileProps {
  info: AgencyDomainInfo;
  clientName: string | null;
  clientEmail: string;
  showChange: boolean;
  onToggleChange: () => void;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onCurrentPassword: (v: string) => void;
  onNewPassword: (v: string) => void;
  onConfirmPassword: (v: string) => void;
  onSubmitPassword: (e: React.FormEvent) => void;
  passwordError: string | null;
  busy: boolean;
  onLogout: () => void;
  /** Etapa 5 — dados de cadastro em modo consulta. */
  profile?: ClientAreaProfileData | null;
  /** Pedido de correção: sempre encaminhado à agência (o cliente não edita). */
  onRequestUpdate?: () => void;
}

/** Meu perfil — somente dados básicos já disponíveis na sessão. */
export function ClientAreaProfile({
  info, clientName, clientEmail, showChange, onToggleChange,
  currentPassword, newPassword, confirmPassword,
  onCurrentPassword, onNewPassword, onConfirmPassword, onSubmitPassword,
  passwordError, busy, onLogout, profile, onRequestUpdate,
}: ProfileProps) {
  const name = agencyDisplayName(info);
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">Meu perfil</h1>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Nome</dt>
            <dd className="mt-1 text-sm text-foreground">{clientName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">E-mail de login</dt>
            <dd className="mt-1 break-all text-sm text-foreground">{clientEmail}</dd>
          </div>
          {profile?.phone ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</dt>
              <dd className="mt-1 text-sm text-foreground">{profile.phone}</dd>
            </div>
          ) : null}
          {profile?.city || profile?.state ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Cidade</dt>
              <dd className="mt-1 text-sm text-foreground">
                {[profile?.city, profile?.state].filter(Boolean).join(" · ")}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Agência</dt>
            <dd className="mt-1 text-sm text-foreground"><BrandText>{name}</BrandText></dd>
          </div>
        </dl>

        <p className="mt-5 text-xs text-muted-foreground">
          Estes dados são mantidos pela agência. Para corrigir algo, peça a atualização por aqui.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Button variant="outline" className="min-h-11" onClick={onToggleChange} aria-expanded={showChange}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" /> Alterar senha
          </Button>
          {onRequestUpdate ? (
            <Button variant="outline" className="min-h-11" onClick={onRequestUpdate}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Solicitar atualização
            </Button>
          ) : null}
          <Button variant="ghost" className="min-h-11 text-muted-foreground" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sair
          </Button>
        </div>

        {showChange && (
          <form onSubmit={onSubmitPassword} className="mt-6 space-y-4 border-t border-border/60 pt-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="ca-current">Senha atual</Label>
              <Input
                id="ca-current"
                type="password"
                value={currentPassword}
                onChange={(e) => onCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="min-h-11"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ca-new">Nova senha</Label>
                <Input
                  id="ca-new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => onNewPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "ca-password-error" : undefined}
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ca-confirm">Confirmar nova senha</Label>
                <Input
                  id="ca-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "ca-password-error" : undefined}
                  className="min-h-11"
                />
              </div>
            </div>
            {passwordError && (
              <p id="ca-password-error" role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            )}
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />} Salvar nova senha
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

export function ClientAreaSupportSection({ info }: { info: AgencyDomainInfo }) {
  return <ClientAreaSupportCard info={info} />;
}
