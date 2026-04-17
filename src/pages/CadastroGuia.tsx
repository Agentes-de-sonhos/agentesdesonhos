import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BrandText } from "@/components/ui/brand-text";
import logoTravelMeet from "@/assets/logo-travelmeet.png";
import {
  COUNTRY_OPTIONS, SPECIALTY_OPTIONS, SERVICE_OPTIONS,
} from "@/i18n/cadastroGuia";
import {
  GuideLanguagesEditor, CertificationsEditor, ChipsMultiSelect, type GuideLanguage,
} from "@/components/tour-guides/GuideFormFields";
import { GuideGalleryUploader, GuidePhotoUploader } from "@/components/tour-guides/GuideGalleryUploader";

export default function CadastroGuia() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tempUid] = useState(() => crypto.randomUUID());

  const [form, setForm] = useState({
    full_name: "",
    professional_name: "",
    photo_url: null as string | null,
    city: "",
    country: "Brasil",
    regions: "" as string, // comma separated
    languages: [] as GuideLanguage[],
    specialties: [] as string[],
    services: [] as string[],
    bio: "",
    differentials: "",
    certifications: [] as string[],
    gallery_urls: [] as string[],
    whatsapp: "",
    contact_email: "",
    instagram: "",
    website: "",
    email: "",
    password: "",
    password_confirm: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = useMemo(() => {
    return (
      form.full_name.trim() &&
      form.email.trim() &&
      form.password.length >= 6 &&
      form.password === form.password_confirm &&
      form.whatsapp.trim() &&
      form.photo_url &&
      form.languages.length > 0 &&
      form.languages.every((l) => l.code && l.level)
    );
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("guide-register", {
        body: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
          professional_name: form.professional_name.trim() || null,
          photo_url: form.photo_url,
          city: form.city.trim(),
          country: form.country,
          regions: form.regions.split(",").map((s) => s.trim()).filter(Boolean),
          languages: form.languages,
          specialties: form.specialties,
          services: form.services,
          bio: form.bio.trim(),
          differentials: form.differentials.trim(),
          certifications: form.certifications.filter((c) => c.trim()),
          gallery_urls: form.gallery_urls,
          whatsapp: form.whatsapp.trim(),
          contact_email: form.contact_email.trim() || null,
          instagram: form.instagram.trim(),
          website: form.website.trim(),
        },
      });

      if (error) {
        let msg = "Erro ao enviar cadastro.";
        try {
          const body = error.context?.body
            ? JSON.parse(new TextDecoder().decode(await new Response(error.context.body).arrayBuffer()))
            : null;
          if (body?.error) msg = body.error;
        } catch {}
        toast.error(msg);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Cadastro enviado!</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Seu perfil foi enviado para análise. Nossa equipe irá validar suas informações antes da
            publicação no Mapa do Turismo.
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-6 w-full rounded-xl h-11">
            Acessar minha conta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <BrandText>
            <img src={logoTravelMeet} alt="TravelMeet" className="h-24 w-auto" />
          </BrandText>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Guia de Turismo</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Crie seu perfil profissional. Após análise, ele aparecerá no Mapa do Turismo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-8 shadow-lg">
          {/* Seção 1 */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">1. Informações básicas</h2>
            <div>
              <Label>Foto de perfil *</Label>
              <div className="mt-2">
                <GuidePhotoUploader uid={tempUid} value={form.photo_url} onChange={(v) => update("photo_url", v)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="mt-1 rounded-xl" required />
              </div>
              <div>
                <Label>Nome profissional</Label>
                <Input value={form.professional_name} onChange={(e) => update("professional_name", e.target.value)} placeholder="Ex: Guia João Paris" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Cidade de atuação</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>País</Label>
                <Select value={form.country} onValueChange={(v) => update("country", v)}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Regiões atendidas (separadas por vírgula)</Label>
              <Input value={form.regions} onChange={(e) => update("regions", e.target.value)} placeholder="Ex: Rio de Janeiro, Búzios, Petrópolis" className="mt-1 rounded-xl" />
            </div>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">2. Idiomas *</h2>
            <GuideLanguagesEditor value={form.languages} onChange={(v) => update("languages", v)} />
            <p className="text-xs text-muted-foreground">Adicione pelo menos um idioma com nível.</p>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">3. Especialidades</h2>
            <ChipsMultiSelect options={SPECIALTY_OPTIONS} value={form.specialties} onChange={(v) => update("specialties", v)} />
          </section>

          {/* Seção 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">4. Serviços oferecidos</h2>
            <ChipsMultiSelect options={SERVICE_OPTIONS} value={form.services} onChange={(v) => update("services", v)} />
          </section>

          {/* Seção 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">5. Sobre o guia</h2>
            <div>
              <Label>Descrição profissional (bio)</Label>
              <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={4} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Diferenciais</Label>
              <Textarea value={form.differentials} onChange={(e) => update("differentials", e.target.value)} rows={3} className="mt-1 rounded-xl" placeholder="O que torna seu trabalho único?" />
            </div>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">6. Certificações</h2>
            <CertificationsEditor value={form.certifications} onChange={(v) => update("certifications", v)} />
          </section>

          {/* Seção 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">7. Galeria de fotos</h2>
            <GuideGalleryUploader uid={tempUid} value={form.gallery_urls} onChange={(v) => update("gallery_urls", v)} />
          </section>

          {/* Seção 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">8. Contato</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp *</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+55 21 99999-9999" className="mt-1 rounded-xl" required />
              </div>
              <div>
                <Label>E-mail de contato</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="(opcional, padrão: e-mail de login)" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@seuusuario" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Site</Label>
                <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" className="mt-1 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Conta */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground border-b pb-2">9. Acesso à plataforma</h2>
            <div>
              <Label>E-mail de login *</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1 rounded-xl" required />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Senha *</Label>
                <div className="relative mt-1">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} className="rounded-xl pr-10" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirmar senha *</Label>
                <Input type={showPassword ? "text" : "password"} value={form.password_confirm} onChange={(e) => update("password_confirm", e.target.value)} className="mt-1 rounded-xl" required />
              </div>
            </div>
          </section>

          <Button type="submit" className="w-full rounded-xl h-12 text-base" disabled={loading || !valid}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar cadastro para análise
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <button type="button" onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">Entrar</button>
          </p>
        </form>
      </div>
    </div>
  );
}
