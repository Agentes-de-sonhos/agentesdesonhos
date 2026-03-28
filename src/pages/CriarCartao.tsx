import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Check, ExternalLink, Instagram, Facebook, Linkedin, Twitter, Youtube, Plus, Trash2, Upload } from "lucide-react";
import logoImg from "@/assets/logo-agentes-de-sonhos.png";

const PUBLIC_DOMAIN = "https://contato.tur.br";
const MAX_BUTTONS = 6;

const COVER_OPTIONS = [
  "/images/card-covers/cover-1.png",
  "/images/card-covers/cover-2.png",
  "/images/card-covers/cover-3.png",
  "/images/card-covers/cover-4.png",
  "/images/card-covers/cover-5.png",
  "/images/card-covers/cover-6.png",
  "/images/card-covers/cover-7.png",
];

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "twitter", label: "X (Twitter)", icon: Twitter },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "tiktok", label: "TikTok", icon: Youtube },
] as const;

export default function CriarCartao() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [saving, setSaving] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const [form, setForm] = useState({
    slug: "",
    name: "",
    title: "",
    agency_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    primary_color: "#0284c7",
    secondary_color: "#f97316",
    cover_url: "",
  });

  const [buttons, setButtons] = useState<{ text: string; url: string }[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) { toast.error("Formato inválido."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB."); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `public-cards/logo_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast.success("Logo enviado!");
    } catch { toast.error("Erro ao enviar logo."); }
    finally { setUploadingLogo(false); }
  };

  const handleSubmit = async () => {
    const slug = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
    if (!slug || slug.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!form.name) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-business-card", {
        body: {
          slug,
          name: form.name,
          title: form.title || null,
          agency_name: form.agency_name || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          website: form.website || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          cover_url: form.cover_url || null,
          buttons: buttons.filter((b) => b.text && b.url),
          social_links: socialLinks,
          logos: logoUrl ? [logoUrl] : [],
        },
      });

      if (error) {
        toast.error("Erro ao criar cartão. Tente novamente.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setCreatedSlug(slug);
      setStep("success");
      toast.success("Cartão criado com sucesso!");
    } catch {
      toast.error("Erro ao criar cartão.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "success") {
    const publicUrl = `${PUBLIC_DOMAIN}/${createdSlug}`;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cartão criado!</h1>
              <p className="text-gray-500 mt-2">Seu cartão de visita digital já está no ar.</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-sm break-all">
              <ExternalLink className="h-4 w-4 inline mr-1" />
              {publicUrl}
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <a href={`/${createdSlug}`} target="_blank" rel="noopener noreferrer">
                  Ver meu cartão
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copiado!");
                }}
              >
                Copiar link
              </Button>
              <Button variant="ghost" onClick={() => { setStep("form"); setForm({ ...form, slug: "" }); }}>
                Criar outro cartão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoImg} alt="Agentes de Sonhos" className="h-8" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Criar Cartão de Visita Virtual</h1>
            <p className="text-xs text-gray-500">Preencha seus dados e tenha seu cartão digital em segundos.</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-12">
        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações principais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do cartão *</Label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-gray-400 whitespace-nowrap">contato.tur.br/</span>
                <Input
                  placeholder="seu-nome"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Nome *", key: "name" },
                { label: "Cargo / Título", key: "title" },
                { label: "Agência", key: "agency_name" },
                { label: "Telefone", key: "phone" },
                { label: "WhatsApp", key: "whatsapp" },
                { label: "E-mail", key: "email" },
                { label: "Site", key: "website" },
              ].map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    className="mt-1"
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cover */}
        <Card>
          <CardHeader><CardTitle className="text-base">Imagem de capa</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {COVER_OPTIONS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setForm({ ...form, cover_url: url })}
                  className={`rounded-lg overflow-hidden border-2 transition-all ${
                    form.cover_url === url ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-200"
                  }`}
                >
                  <img src={url} alt="Capa" className="w-full h-16 object-cover" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Logotipo da empresa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="Logo" className="h-20 object-contain border rounded p-1" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors flex-1">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">{uploadingLogo ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logotipo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
            <p className="text-xs text-gray-400">PNG com fundo transparente, máx 400×400px. Será exibido abaixo do seu nome no cartão.</p>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader><CardTitle className="text-base">Cores do tema</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-wrap">
              <div>
                <Label>Cor principal</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-10 rounded cursor-pointer border-0" />
                  <span className="text-sm text-gray-400">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <Label>Cor secundária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="h-10 w-10 rounded cursor-pointer border-0" />
                  <span className="text-sm text-gray-400">{form.secondary_color}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Botões de ação</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (buttons.length >= MAX_BUTTONS) { toast.error(`Máximo de ${MAX_BUTTONS} botões.`); return; }
                  setButtons([...buttons, { text: "", url: "" }]);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {buttons.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum botão adicionado.</p>}
            {buttons.map((btn, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input placeholder="Texto do botão" value={btn.text} onChange={(e) => { const u = [...buttons]; u[i] = { ...u[i], text: e.target.value }; setButtons(u); }} />
                  <Input placeholder="https://..." value={btn.url} onChange={(e) => { const u = [...buttons]; u[i] = { ...u[i], url: e.target.value }; setButtons(u); }} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader><CardTitle className="text-base">Redes Sociais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {SOCIAL_FIELDS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  placeholder={`URL do ${label}`}
                  value={socialLinks[key] || ""}
                  onChange={(e) => setSocialLinks({ ...socialLinks, [key]: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
          <CreditCard className="h-5 w-5 mr-2" />
          {saving ? "Criando..." : "Criar meu Cartão de Visita"}
        </Button>
      </div>
    </div>
  );
}
