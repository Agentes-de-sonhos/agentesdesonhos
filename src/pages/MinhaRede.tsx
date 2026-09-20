import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, RefreshCw, UserMinus, Users2, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCommunityNetwork, type NetworkConnection } from "@/hooks/useCommunityNetwork";

interface PublicProfile {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  agency_name: string | null;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PersonRow({
  profile,
  children,
}: {
  profile: PublicProfile | undefined;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "Membro"} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials(profile?.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{profile?.name || "Membro"}</p>
        {profile?.agency_name && (
          <p className="truncate text-xs text-muted-foreground">{profile.agency_name}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title} <span className="text-muted-foreground/70">({count})</span>
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
        <Users2 className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

/** Minha Rede: conexões, solicitações recebidas e solicitações enviadas. */
export default function MinhaRede() {
  const {
    currentUserId,
    acceptedConnections,
    pendingReceived,
    pendingSent,
    isLoading,
    isError,
    refetch,
    respondRequest,
    cancelRequest,
    removeConnection,
    isMutating,
  } = useCommunityNetwork();

  const otherId = (connection: NetworkConnection) =>
    connection.requester_id === currentUserId ? connection.receiver_id : connection.requester_id;

  const peopleIds = useMemo(() => {
    const ids = [...acceptedConnections, ...pendingReceived, ...pendingSent].map(otherId);
    return [...new Set(ids)].sort();
  }, [acceptedConnections, pendingReceived, pendingSent, currentUserId]);

  const { data: profiles } = useQuery({
    queryKey: ["minha-rede-profiles", peopleIds],
    enabled: peopleIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", peopleIds);
      if (error) throw error;
      return (data ?? []) as PublicProfile[];
    },
  });

  const profileById = useMemo(() => {
    const map = new Map<string, PublicProfile>();
    (profiles ?? []).forEach((profile) => map.set(profile.user_id, profile));
    return map;
  }, [profiles]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6" data-minha-rede>
        <MobileTopBar />

        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Minha Rede</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas conexões e solicitações na comunidade.
          </p>
        </header>

        {isLoading && (
          <div className="space-y-2" data-minha-rede-loading>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        )}

        {isError && !isLoading && (
          <Card className="border-destructive/40" data-minha-rede-error>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Não foi possível carregar sua rede.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (
          <div className="space-y-6">
            <Section title="Solicitações recebidas" count={pendingReceived.length}>
              {pendingReceived.length === 0 ? (
                <EmptyState message="Nenhuma solicitação recebida." />
              ) : (
                <div className="space-y-2">
                  {pendingReceived.map((connection) => (
                    <PersonRow key={connection.id} profile={profileById.get(otherId(connection))}>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isMutating}
                        aria-label="Aceitar solicitação"
                        onClick={() => respondRequest({ connectionId: connection.id, accept: true })}
                        className="h-8 gap-1 px-2 text-xs"
                      >
                        {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Aceitar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={isMutating}
                        aria-label="Recusar solicitação"
                        onClick={() => respondRequest({ connectionId: connection.id, accept: false })}
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </PersonRow>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Solicitações enviadas" count={pendingSent.length}>
              {pendingSent.length === 0 ? (
                <EmptyState message="Você não tem solicitações aguardando resposta." />
              ) : (
                <div className="space-y-2">
                  {pendingSent.map((connection) => (
                    <PersonRow key={connection.id} profile={profileById.get(otherId(connection))}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isMutating}
                        aria-label="Cancelar solicitação enviada"
                        onClick={() => cancelRequest(connection.id)}
                        className="h-8 px-2 text-xs"
                      >
                        Cancelar
                      </Button>
                    </PersonRow>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Conexões" count={acceptedConnections.length}>
              {acceptedConnections.length === 0 ? (
                <EmptyState message="Você ainda não tem conexões. Conecte-se pelo feed ou pela busca." />
              ) : (
                <div className="space-y-2">
                  {acceptedConnections.map((connection) => (
                    <PersonRow key={connection.id} profile={profileById.get(otherId(connection))}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isMutating}
                        aria-label="Remover conexão"
                        onClick={() => removeConnection(connection.id)}
                        className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </PersonRow>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
