import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useTradeConnect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2, MapPin, Briefcase, Tag, MessageCircle,
  UserPlus, UserCheck, Clock, Loader2, ArrowLeft, User,
  Heart, Handshake,
} from "lucide-react";

export default function AgentProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getConnectionStatus, getConnectionId, sendRequest, respondRequest, isSending } = useConnections();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["agent-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, agency_logo_url, city, state, bio, specialties, services, niches, niche, years_in_business, phone, help_offer, partnership_interests")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const connectionStatus = userId ? getConnectionStatus(userId) : "none";
  const connectionId = userId ? getConnectionId(userId) : null;
  const isOwnProfile = user?.id === userId;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Perfil não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardContent className="pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">{profile.agency_name || "Agência não informada"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {[profile.city, profile.state].filter(Boolean).join(", ") || "Localização não informada"}
                  </span>
                </div>

                {/* Actions */}
                {!isOwnProfile && (
                  <div className="flex gap-2 mt-3">
                    {connectionStatus === "none" && (
                      <Button size="sm" onClick={() => userId && sendRequest(userId)} disabled={isSending}>
                        <UserPlus className="h-4 w-4 mr-1" /> Conectar
                      </Button>
                    )}
                    {connectionStatus === "pending_sent" && (
                      <Button size="sm" variant="outline" disabled>
                        <Clock className="h-4 w-4 mr-1" /> Solicitação enviada
                      </Button>
                    )}
                    {connectionStatus === "pending_received" && connectionId && (
                      <>
                        <Button size="sm" onClick={() => respondRequest({ connectionId, accept: true })}>
                          <UserCheck className="h-4 w-4 mr-1" /> Aceitar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondRequest({ connectionId, accept: false })}>
                          Recusar
                        </Button>
                      </>
                    )}
                    {connectionStatus === "accepted" && (
                      <Button size="sm" variant="secondary" disabled>
                        <UserCheck className="h-4 w-4 mr-1" /> Conectado
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/comunidade?dm=${userId}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" /> Mensagem
                    </Button>
                  </div>
                )}
              </div>
              {profile.agency_logo_url && (
                <img
                  src={profile.agency_logo_url}
                  alt="Logo"
                  className="h-16 w-16 object-contain rounded-lg border border-border"
                />
              )}
            </div>

            <Separator className="mb-6" />

            {/* Content */}
            <div className="space-y-5">
              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <User className="h-4 w-4" /> Sobre
                  </h3>
                  <p className="text-sm text-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Years + Niches */}
              <div className="grid grid-cols-2 gap-4">
                {profile.years_in_business && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Tempo de atuação
                    </h3>
                    <p className="text-sm text-foreground">{profile.years_in_business} anos</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Nichos principais
                  </h3>
                  {profile.niches?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.niches.map((n: string) => (
                        <Badge key={n} variant="default" className="text-xs">{n}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Não informado</p>
                  )}
                </div>
              </div>

              {/* Specialties */}
              {profile.specialties?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Especialidades</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.specialties.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {profile.services?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Serviços</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.services.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Offer */}
              {profile.help_offer && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" /> Como posso ajudar outros agentes
                  </h3>
                  <p className="text-sm text-foreground">{profile.help_offer}</p>
                </div>
              )}

              {/* Partnership Interests */}
              {profile.partnership_interests?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Handshake className="h-4 w-4" /> Busco parcerias em
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.partnership_interests.map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
