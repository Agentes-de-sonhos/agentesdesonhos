import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTradeProfile, useUpdateTradeProfile, useConnections } from "@/hooks/useTradeConnect";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User, Building2, MapPin, Briefcase, Tag, Loader2, Edit,
  Users, UserCheck, UserPlus, Clock, CheckCircle2, AlertCircle,
  MessageCircle, ArrowRight, Heart, Handshake, Camera,
  MessageCircleQuestion, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&h=300&fit=crop&q=80";

export default function TradeConnectHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, profileCompleteness } = useTradeProfile();
  const updateProfile = useUpdateTradeProfile();
  const {
    acceptedConnections, pendingReceived, isLoading: connectionsLoading,
    respondRequest,
  } = useConnections();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Fetch profiles for accepted connections
  const connectedUserIds = acceptedConnections.map(c =>
    c.requester_id === user?.id ? c.receiver_id : c.requester_id
  );
  const pendingUserIds = pendingReceived.map(c => c.requester_id);
  const allProfileIds = [...new Set([...connectedUserIds, ...pendingUserIds])];

  const { data: connectionProfiles = [] } = useQuery({
    queryKey: ["connection-profiles", allProfileIds],
    queryFn: async () => {
      if (!allProfileIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city, state")
        .in("user_id", allProfileIds);
      return data || [];
    },
    enabled: allProfileIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Community membership
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["community-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("community_members")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Latest Q&A questions
  const { data: latestQuestions = [] } = useQuery({
    queryKey: ["trade-connect-qa-latest"],
    queryFn: async () => {
      const { data } = await supabase
        .from("qa_questions")
        .select("id, title, category, answers_count, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const isMember = membership && ["approved_unverified", "verified"].includes(membership.status);

  const getProfile = (userId: string) =>
    connectionProfiles.find(p => p.user_id === userId);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      updateProfile.mutate({ cover_image_url: url } as any);
    } catch {
      toast.error("Erro ao enviar imagem de capa");
    } finally {
      setUploadingCover(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* ── COVER + HEADER ── */}
        <Card className="overflow-hidden">
          <div className="relative h-40 sm:h-52 bg-muted">
            <img
              src={(profile as any)?.cover_image_url || DEFAULT_COVER}
              alt="Capa"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 gap-1.5 opacity-80 hover:opacity-100"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Alterar capa
            </Button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>
          <CardContent className="relative pt-0 pb-5 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12 sm:-mt-14">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-2 sm:pt-6">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profile?.name || "Sem nome"}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm mt-1">
                  {profile?.agency_name && (
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{profile.agency_name}</span>
                  )}
                  {(profile?.city || profile?.state) && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[profile.city, profile.state].filter(Boolean).join(", ")}</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-2 sm:mt-6 gap-1.5" onClick={() => navigate("/trade-connect/perfil")}>
                <Edit className="h-3.5 w-3.5" /> Editar perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 3-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Profile summary */}
          <div className="lg:col-span-3 space-y-4">
            {/* Profile completeness */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {profileCompleteness === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">{profileCompleteness}% completo</span>
                </div>
                <Progress value={profileCompleteness} className="h-2" />
                {profileCompleteness < 100 && (
                  <Button variant="link" size="sm" className="px-0 mt-2 h-auto text-xs" onClick={() => navigate("/trade-connect/perfil")}>
                    Completar perfil →
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Mini profile */}
            <Card>
              <CardContent className="pt-4 pb-4 space-y-3">
                {profile?.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{profile.bio}</p>
                )}
                {profile?.niches && profile.niches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Tag className="h-3 w-3" /> Nichos</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.niches.slice(0, 5).map((n) => (
                        <Badge key={n} variant="default" className="text-[10px] px-1.5 py-0">{n}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile?.specialties && profile.specialties.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Especialidades</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.specialties.slice(0, 5).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                      {profile.specialties.length > 5 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{profile.specialties.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                )}
                {profile?.years_in_business && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> {profile.years_in_business} anos de atuação
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Q&A Widget + Activity */}
          <div className="lg:col-span-5 space-y-4">
            {/* Help offer card */}
            {profile?.help_offer && (
              <Card className="border-rose-200 dark:border-rose-900/30">
                <CardContent className="pt-4 pb-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Heart className="h-4 w-4 text-rose-500" /> Como posso ajudar outros agentes
                  </h4>
                  <p className="text-sm text-muted-foreground">{profile.help_offer}</p>
                </CardContent>
              </Card>
            )}

            {/* Partnership interests */}
            {profile?.partnership_interests && profile.partnership_interests.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Handshake className="h-4 w-4" /> Busco parcerias em
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.partnership_interests.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Q&A Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 text-primary" />
                  Perguntas e Respostas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {latestQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta ainda</p>
                ) : (
                  <>
                    {latestQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/perguntas-respostas?q=${q.id}`)}
                      >
                        <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{q.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {q.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.category}</Badge>}
                            <span>{q.answers_count} resposta{q.answers_count !== 1 ? "s" : ""}</span>
                            <span>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={() => navigate("/perguntas-respostas")}>
                      Ver todas as perguntas <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Connections + Communities */}
          <div className="lg:col-span-4 space-y-4">
            {/* Pending requests */}
            {pendingReceived.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Solicitações pendentes
                    <Badge variant="secondary" className="ml-auto">{pendingReceived.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {pendingReceived.map((conn) => {
                    const p = getProfile(conn.requester_id);
                    return (
                      <div key={conn.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate(`/trade-connect/agente/${conn.requester_id}`)}>
                          <AvatarImage src={p?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{p?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p?.name || "Agente"}</p>
                          <p className="text-xs text-muted-foreground truncate">{p?.agency_name || ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => respondRequest({ connectionId: conn.id, accept: true })}>
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => respondRequest({ connectionId: conn.id, accept: false })}>
                            <User className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Accepted connections */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Minhas Conexões
                  {acceptedConnections.length > 0 && (
                    <Badge variant="outline" className="ml-auto">{acceptedConnections.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {connectionsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : acceptedConnections.length === 0 ? (
                  <div className="text-center py-6">
                    <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma conexão ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Conecte-se com agentes online ou nas comunidades</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {acceptedConnections.slice(0, 8).map((conn) => {
                      const otherId = conn.requester_id === user?.id ? conn.receiver_id : conn.requester_id;
                      const p = getProfile(otherId);
                      return (
                        <div
                          key={conn.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/trade-connect/agente/${otherId}`)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{p?.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p?.name || "Agente"}</p>
                            <p className="text-xs text-muted-foreground truncate">{p?.agency_name || ""}</p>
                          </div>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      );
                    })}
                    {acceptedConnections.length > 8 && (
                      <p className="text-xs text-center text-muted-foreground pt-1">
                        +{acceptedConnections.length - 8} conexões
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Communities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Comunidades
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {membershipLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {isMember ? (
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate("/comunidade")}
                      >
                        <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Travel Experts</p>
                          <p className="text-xs text-muted-foreground">Comunidade premium</p>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                          Membro
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                        <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Travel Experts</p>
                          <p className="text-xs text-muted-foreground">Comunidade premium</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate("/comunidade")}>
                          Participar
                        </Button>
                      </div>
                    )}
                    <div className="text-center pt-1">
                      <p className="text-xs text-muted-foreground">Novas comunidades em breve! 🚀</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
