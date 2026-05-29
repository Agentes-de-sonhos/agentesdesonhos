import { useState } from "react";
import { useTradeProfile, useUpdateTradeProfile } from "@/hooks/useTradeConnect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TagSelector } from "@/components/trade-connect/TagSelector";
import {
  User, Briefcase, Tag, Loader2, Save, CheckCircle2, AlertCircle,
  Heart, Handshake, Users, Edit,
} from "lucide-react";

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

const PARTNERSHIP_OPTIONS = [
  "Receptivo", "Grupos", "Corporativo", "Luxo", "Intercâmbio",
  "Cruzeiros", "Disney & Parques", "Lua de Mel", "Aventura",
];

export function CommunityProfileCard() {
  const { profile, isLoading, profileCompleteness } = useTradeProfile();
  const updateProfile = useUpdateTradeProfile();
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    bio: "",
    specialties: [] as string[],
    services: [] as string[],
    niches: [] as string[],
    years_in_business: null as number | null,
    help_offer: "",
    partnership_interests: [] as string[],
  });

  const startEditing = () => {
    if (profile) {
      setForm({
        bio: profile.bio || "",
        specialties: profile.specialties || [],
        services: profile.services || [],
        niches: profile.niches || [],
        years_in_business: profile.years_in_business,
        help_offer: profile.help_offer || "",
        partnership_interests: profile.partnership_interests || [],
      });
    }
    setEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate(form, { onSuccess: () => setEditing(false) });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Meu Perfil na Comunidade
          </CardTitle>
          {!editing && !isLoading && (
            <Button onClick={startEditing} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar perfil da comunidade
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Como você aparece para outros agentes na rede da comunidade
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Completeness */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
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

            <Separator />

            {editing ? (
              <div className="space-y-6">
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

                <TagSelector
                  label="Nichos principais"
                  options={NICHE_OPTIONS}
                  selected={form.niches}
                  onChange={(v) => setForm({ ...form, niches: v })}
                  maxItems={5}
                  customPlaceholder="Adicionar novo nicho..."
                />

                <TagSelector
                  label="Especialidades"
                  options={SPECIALTY_OPTIONS}
                  selected={form.specialties}
                  onChange={(v) => setForm({ ...form, specialties: v })}
                  maxItems={10}
                  customPlaceholder="Adicionar especialidade..."
                />

                <TagSelector
                  label="Serviços oferecidos"
                  options={SERVICE_OPTIONS}
                  selected={form.services}
                  onChange={(v) => setForm({ ...form, services: v })}
                  customPlaceholder="Adicionar serviço..."
                />

                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Heart className="h-4 w-4 text-rose-500" />
                    Como posso ajudar outros agentes?
                  </Label>
                  <Textarea
                    value={form.help_offer}
                    onChange={(e) => setForm({ ...form, help_offer: e.target.value })}
                    placeholder="Ex: Consigo ajudar com grupos Disney, tenho experiência com luxo na Europa..."
                    className="mt-1.5 min-h-[80px]"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.help_offer.length}/300 caracteres</p>
                </div>

                <TagSelector
                  label="Busco parcerias em"
                  options={PARTNERSHIP_OPTIONS}
                  selected={form.partnership_interests}
                  onChange={(v) => setForm({ ...form, partnership_interests: v })}
                  maxItems={10}
                  customPlaceholder="Adicionar interesse..."
                />

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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <User className="h-4 w-4" /> Sobre
                  </h3>
                  <p className="text-sm text-foreground">
                    {profile?.bio || <span className="text-muted-foreground italic">Nenhuma bio adicionada</span>}
                  </p>
                </div>

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
                    <Tag className="h-4 w-4" /> Nichos principais
                  </h3>
                  {profile?.niches?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.niches.map((n) => (
                        <Badge key={n} variant="default" className="text-xs">{n}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Não informado</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Especialidades</h3>
                  {profile?.specialties?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma especialidade adicionada</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Serviços</h3>
                  {profile?.services?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.services.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum serviço adicionado</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" /> Como posso ajudar outros agentes
                  </h3>
                  <p className="text-sm text-foreground">
                    {profile?.help_offer || <span className="text-muted-foreground italic">Não preenchido</span>}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Handshake className="h-4 w-4" /> Busco parcerias em
                  </h3>
                  {profile?.partnership_interests?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.partnership_interests.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma parceria informada</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}