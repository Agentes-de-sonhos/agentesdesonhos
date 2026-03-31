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
import {
  User, Building2, MapPin, Briefcase, Tag, Loader2, Edit,
  Users, UserCheck, UserPlus, Clock, CheckCircle2, AlertCircle,
  Heart, Handshake, Camera, Eye, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { QAFeed } from "@/components/qa/QAFeed";

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
      updateProfile.mutate({ cover_image_url: url });
    } catch {
      toast.error("Erro ao enviar imagem de capa");
    } finally {
      setUploadingCover(false);
    }
  };

  // Check if left column has any content beyond progress
  const hasProfileBio = !!profile?.bio;
  const hasNiches = (profile?.niches?.length || 0) > 0;
  const hasSpecialties = (profile?.specialties?.length || 0) > 0;
  const hasYears = !!profile?.years_in_business;
  const hasProfileInfo = hasProfileBio || hasNiches || hasSpecialties || hasYears;
  const hasHelpOffer = !!profile?.help_offer;
  const hasPartnershipInterests = (profile?.partnership_interests?.length || 0) > 0;

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
      <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* ── COVER + HEADER ── */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative h-44 sm:h-56 bg-muted">
            <img
              src={profile?.cover_image_url || DEFAULT_COVER}
              alt="Capa"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <Button
              size="sm"
              className="absolute top-3 right-3 gap-1.5 bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-200"
              variant="outline"
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
            <div className="flex flex-col sm:flex-row items-start gap-4 -mt-14 sm:-mt-16">
              <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-3xl font-bold">
                  {profile?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-2 sm:pt-8">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground shadow-none opacity-100 bg-secondary-foreground"
                  style={{ textShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
                >
                  {profile?.name || "Sem nome"}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  {profile?.agency_name && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                      <Building2 className="h-4 w-4 text-primary/60" />{profile.agency_name}
                    </span>
                  )}
                  {(profile?.city || profile?.state) && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-rose-400" />{[profile.city, profile.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="mt-2 sm:mt-8 gap-1.5 rounded-full px-5 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => navigate("/comunidade/perfil")}
              >
                <Edit className="h-3.5 w-3.5" /> Editar perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 3-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className="lg:col-span-3 space-y-4">
            {/* Profile completeness */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2.5 mb-3">
                  {profileCompleteness === 100 ? (
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-bold text-foreground">{profileCompleteness}%</span>
                    <p className="text-xs text-muted-foreground">Perfil completo</p>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={profileCompleteness} className="h-2.5 bg-blue-100 dark:bg-blue-900/30" />
                </div>
                {profileCompleteness < 100 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 mt-2.5 h-auto text-xs font-semibold text-primary"
                    onClick={() => navigate("/comunidade/perfil")}
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Completar perfil →
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Mini profile info - only show if has content */}
            {hasProfileInfo && (
              <Card className="border-0 shadow-md">
                <CardContent className="pt-5 pb-5 space-y-4">
                  {profile?.bio && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary/60" /> Sobre
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-4">{profile.bio}</p>
                    </div>
                  )}
                  {hasNiches && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-violet-500" /> Nichos
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {profile!.niches!.slice(0, 5).map((n) => (
                          <Badge key={n} className="text-[11px] px-2.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 font-medium">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasSpecialties && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Especialidades</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {profile!.specialties!.slice(0, 5).map((s) => (
                          <Badge key={s} className="text-[11px] px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 font-medium">
                            {s}
                          </Badge>
                        ))}
                        {profile!.specialties!.length > 5 && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5">+{profile!.specialties!.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {profile?.years_in_business && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                      <Briefcase className="h-4 w-4 text-primary/50" />
                      <span className="font-medium">{profile.years_in_business} anos</span> de atuação
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Help offer - only show if has content */}
            {hasHelpOffer && (
              <Card className="border-0 shadow-md bg-gradient-to-br from-rose-50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/10">
                <CardContent className="pt-5 pb-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" /> Como posso ajudar
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">{profile!.help_offer}</p>
                </CardContent>
              </Card>
            )}

            {/* Partnership interests - only show if has content */}
            {hasPartnershipInterests && (
              <Card className="border-0 shadow-md">
                <CardContent className="pt-5 pb-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Handshake className="h-3.5 w-3.5 text-emerald-500" /> Busco parcerias
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile!.partnership_interests!.map((p) => (
                      <Badge key={p} className="text-[11px] px-2.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 font-medium">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ═══ CENTER COLUMN: Full Q&A Feed ═══ */}
          <div className="lg:col-span-5 space-y-4">
            <QAFeed />
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="lg:col-span-4 space-y-4">
            {/* Pending requests */}
            {pendingReceived.length > 0 && (
              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    Solicitações
                    <Badge className="ml-auto bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-0 font-bold">
                      {pendingReceived.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {pendingReceived.map((conn) => {
                    const p = getProfile(conn.requester_id);
                    return (
                      <div key={conn.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 shadow-sm">
                        <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-amber-200/50" onClick={() => navigate(`/comunidade/agente/${conn.requester_id}`)}>
                          <AvatarImage src={p?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-amber-100 text-amber-700">{p?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p?.name || "Agente"}</p>
                          <p className="text-xs text-muted-foreground truncate">{p?.agency_name || ""}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 px-3 gap-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                            onClick={() => respondRequest({ connectionId: conn.id, accept: true })}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 gap-1 rounded-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
                            onClick={() => respondRequest({ connectionId: conn.id, accept: false })}
                          >
                            <User className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Connections */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Minhas Conexões
                  {acceptedConnections.length > 0 && (
                    <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 font-bold">
                      {acceptedConnections.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                {connectionsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : acceptedConnections.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-14 w-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3">
                      <UserPlus className="h-6 w-6 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma conexão ainda</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Conecte-se com agentes online ou nas comunidades</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {acceptedConnections.slice(0, 8).map((conn) => {
                      const otherId = conn.requester_id === user?.id ? conn.receiver_id : conn.requester_id;
                      const p = getProfile(otherId);
                      return (
                        <div
                          key={conn.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all duration-200 hover:shadow-sm"
                          onClick={() => navigate(`/comunidade/agente/${otherId}`)}
                        >
                          <Avatar className="h-9 w-9 ring-1 ring-blue-200/50">
                            <AvatarImage src={p?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">{p?.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{p?.name || "Agente"}</p>
                            <p className="text-xs text-muted-foreground truncate">{p?.agency_name || ""}</p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      );
                    })}
                    {acceptedConnections.length > 8 && (
                      <p className="text-xs text-center text-primary font-medium pt-2 cursor-pointer hover:underline">
                        Ver todas (+{acceptedConnections.length - 8})
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Communities */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  Comunidades
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 space-y-2">
                {membershipLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {isMember ? (
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 hover:shadow-md cursor-pointer transition-all duration-200"
                        onClick={() => navigate("/comunidade/chat")}
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">Travel Experts</p>
                          <p className="text-xs text-muted-foreground">Comunidade premium de agentes</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] font-bold">
                          Membro
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">Travel Experts</p>
                          <p className="text-xs text-muted-foreground">Comunidade premium de agentes</p>
                        </div>
                        <Button size="sm" className="rounded-full px-4 h-8 text-xs font-semibold shadow-sm" onClick={() => navigate("/comunidade/chat")}>
                          Participar
                        </Button>
                      </div>
                    )}
                    <div className="text-center pt-2 pb-1">
                      <p className="text-xs text-muted-foreground/70">Novas comunidades em breve! 🚀</p>
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
