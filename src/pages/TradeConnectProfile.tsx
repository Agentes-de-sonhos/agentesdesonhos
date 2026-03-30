import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTradeProfile, useUpdateTradeProfile } from "@/hooks/useTradeConnect";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User, Building2, MapPin, Briefcase, Tag, Loader2, Save,
  CheckCircle2, AlertCircle, X, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTY_OPTIONS = [
  "Orlando", "Nova York", "Miami", "Europa", "Portugal", "Itália", "França",
  "Caribe", "México", "Maldivas", "Japão", "Tailândia", "Austrália",
  "Argentina", "Chile", "Canadá", "África do Sul", "Egito", "Turquia",
  "Resorts All-Inclusive", "Cruzeiros", "Luxo", "Aventura", "Corporativo",
  "Ecoturismo", "Cultural", "Gastronômico", "Bem-estar & Spa",
  "Disney & Parques", "Lua de Mel", "Grupos", "Família", "Solo",
  "LGBTQ+", "Terceira Idade", "Esportivo", "Intercâmbio", "Safári",
];

const SERVICE_OPTIONS = [
  "Pacotes nacionais", "Pacotes internacionais", "Passagens aéreas",
  "Hospedagem", "Cruzeiros", "Seguro viagem", "Transfers",
  "Passeios e experiências", "Locação de veículos", "Assessoria de vistos",
  "Roteiros personalizados", "Viagens corporativas", "Lua de mel",
  "Viagens em grupo", "Consultoria de viagem",
];

const NICHE_OPTIONS = [
  "Luxo", "Econômico", "Aventura", "Cultural", "Família", "Corporativo",
  "Lua de Mel", "Terceira Idade", "Solo", "LGBTQ+", "Ecoturismo", "Gastronômico",
];

export default function TradeConnectProfile() {
  const { profile, isLoading, profileCompleteness } = useTradeProfile();
  const updateProfile = useUpdateTradeProfile();
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    bio: "",
    specialties: [] as string[],
    services: [] as string[],
    niche: "",
    years_in_business: null as number | null,
  });

  const startEditing = () => {
    if (profile) {
      setForm({
        bio: profile.bio || "",
        specialties: profile.specialties || [],
        services: profile.services || [],
        niche: profile.niche || "",
        years_in_business: profile.years_in_business,
      });
    }
    setEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate(form, {
      onSuccess: () => setEditing(false),
    });
  };

  const toggleTag = (list: string[], tag: string, setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Trade Connect — Meu Perfil
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Seu perfil profissional na rede de agentes
            </p>
          </div>
          {!editing && (
            <Button onClick={startEditing} variant="outline">
              Editar Perfil
            </Button>
          )}
        </div>

        {/* Profile Completeness */}
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              {profileCompleteness === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Seu perfil está {profileCompleteness}% completo
                </p>
                <Progress value={profileCompleteness} className="h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profile?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground">{profile?.name || "Sem nome"}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">{profile?.agency_name || "Agência não informada"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {[profile?.city, profile?.state].filter(Boolean).join(", ") || "Localização não informada"}
                  </span>
                </div>
              </div>
              {profile?.agency_logo_url && (
                <img
                  src={profile.agency_logo_url}
                  alt="Logo da agência"
                  className="h-14 w-14 object-contain rounded-lg border border-border"
                />
              )}
            </div>

            <Separator className="mb-6" />

            {/* Editable sections */}
            {editing ? (
              <div className="space-y-6">
                {/* Bio */}
                <div>
                  <Label className="text-sm font-semibold">Sobre você</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Conte sobre sua experiência e o que te motiva como agente de viagens..."
                    className="mt-1.5 min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500 caracteres</p>
                </div>

                {/* Years in business */}
                <div>
                  <Label className="text-sm font-semibold">Tempo de atuação (anos)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={form.years_in_business ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, years_in_business: e.target.value ? parseInt(e.target.value) : null })
                    }
                    className="mt-1.5 w-32"
                    placeholder="Ex: 5"
                  />
                </div>

                {/* Niche */}
                <div>
                  <Label className="text-sm font-semibold">Nicho principal</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {NICHE_OPTIONS.map((n) => (
                      <Badge
                        key={n}
                        variant={form.niche === n ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all",
                          form.niche === n && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setForm({ ...form, niche: form.niche === n ? "" : n })}
                      >
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <Label className="text-sm font-semibold">
                    Especialidades ({form.specialties.length}/10)
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SPECIALTY_OPTIONS.map((s) => (
                      <Badge
                        key={s}
                        variant={form.specialties.includes(s) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all text-xs",
                          form.specialties.includes(s) && "bg-primary text-primary-foreground",
                          !form.specialties.includes(s) && form.specialties.length >= 10 && "opacity-40 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (form.specialties.includes(s) || form.specialties.length < 10) {
                            toggleTag(form.specialties, s, (v) => setForm({ ...form, specialties: v }));
                          }
                        }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div>
                  <Label className="text-sm font-semibold">Serviços oferecidos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SERVICE_OPTIONS.map((s) => (
                      <Badge
                        key={s}
                        variant={form.services.includes(s) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all text-xs",
                          form.services.includes(s) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() =>
                          toggleTag(form.services, s, (v) => setForm({ ...form, services: v }))
                        }
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Bio */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <User className="h-4 w-4" /> Sobre
                  </h3>
                  <p className="text-sm text-foreground">
                    {profile?.bio || <span className="text-muted-foreground italic">Nenhuma bio adicionada</span>}
                  </p>
                </div>

                {/* Years + Niche */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Tempo de atuação
                    </h3>
                    <p className="text-sm text-foreground">
                      {profile?.years_in_business ? `${profile.years_in_business} anos` : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Nicho principal
                    </h3>
                    <p className="text-sm text-foreground">
                      {profile?.niche || "Não informado"}
                    </p>
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Especialidades</h3>
                  {profile?.specialties?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma especialidade adicionada</p>
                  )}
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Serviços</h3>
                  {profile?.services?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.services.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum serviço adicionado</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
