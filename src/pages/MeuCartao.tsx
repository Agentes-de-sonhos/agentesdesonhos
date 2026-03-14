import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBusinessCard, CardButton, SocialLinks } from "@/hooks/useBusinessCard";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  CreditCard, Plus, Trash2, Copy, ExternalLink, Upload, Save, Eye,
  Instagram, Facebook, Linkedin, Twitter, Youtube, GripVertical, ImageIcon, Check,
} from "lucide-react";

const COVER_OPTIONS = [
  "/images/card-covers/cover-1.png",
  "/images/card-covers/cover-2.png",
  "/images/card-covers/cover-3.png",
  "/images/card-covers/cover-4.png",
  "/images/card-covers/cover-5.png",
  "/images/card-covers/cover-6.png",
  "/images/card-covers/cover-7.png",
];

const PUBLIC_DOMAIN = "https://contato.tur.br";
const MAX_BUTTONS = 6;

const SOCIAL_CONFIG: { key: keyof SocialLinks; label: string; icon: React.ComponentType<any>; prefix: string }[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, prefix: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", icon: Facebook, prefix: "https://facebook.com/" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, prefix: "https://linkedin.com/in/" },
  { key: "twitter", label: "X (Twitter)", icon: Twitter, prefix: "https://x.com/" },
  { key: "youtube", label: "YouTube", icon: Youtube, prefix: "https://youtube.com/@" },
  { key: "tiktok", label: "TikTok", icon: Youtube, prefix: "https://tiktok.com/@" },
];

/** Extract username/slug from a full URL or @handle */
function extractUsername(value: string, prefix: string): string {
  let v = value.trim();
  if (!v) return "";
  // Remove @ prefix
  if (v.startsWith("@")) v = v.substring(1);
  // Try to extract from full URL variants
  const patterns = [
    prefix,
    prefix.replace("https://", "http://"),
    prefix.replace("https://", "https://www."),
    prefix.replace("https://", "http://www."),
    prefix.replace("https://", ""),
    prefix.replace("https://", "www."),
  ];
  for (const p of patterns) {
    if (v.toLowerCase().startsWith(p.toLowerCase())) {
      v = v.substring(p.length);
      break;
    }
  }
  // Remove trailing slashes and query params
  v = v.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return v;
}

export default function MeuCartao() {
  const { card, isLoading, createCard, updateCard, uploadImage } = useBusinessCard();
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState({
    name: "", title: "", agency_name: "", phone: "", whatsapp: "", email: "", website: "",
    primary_color: "#0284c7", secondary_color: "#f97316",
  });
  const [buttons, setButtons] = useState<CardButton[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  useEffect(() => {
    if (card) {
      setForm({
        name: card.name, title: card.title, agency_name: card.agency_name,
        phone: card.phone, whatsapp: card.whatsapp, email: card.email,
        website: card.website, primary_color: card.primary_color,
        secondary_color: card.secondary_color,
      });
      setButtons(card.buttons);
      setSocialLinks(card.social_links);
    }
  }, [card]);

  const handleCreate = () => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
    if (!clean || clean.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres.");
      return;
    }
    createCard.mutate(clean);
  };

  const handleSave = () => {
    // Build full URLs from usernames for social links
    const fullSocialLinks: SocialLinks = {};
    for (const { key, prefix } of SOCIAL_CONFIG) {
      const username = socialLinks[key];
      if (username && username.trim()) {
        const clean = extractUsername(username, prefix);
        fullSocialLinks[key] = clean ? `${prefix}${clean}` : "";
      }
    }
    updateCard.mutate({ ...form, buttons, social_links: fullSocialLinks } as any);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "photo");
      if (url) updateCard.mutate({ photo_url: url } as any);
    } catch { toast.error("Erro ao enviar imagem."); }
  };

  const [coverDialogOpen, setCoverDialogOpen] = useState(false);

  const handleSelectCover = (url: string) => {
    updateCard.mutate({ cover_url: url } as any);
    setCoverDialogOpen(false);
  };

  const addButton = () => {
    if (buttons.length >= MAX_BUTTONS) {
      toast.error(`Máximo de ${MAX_BUTTONS} botões.`);
      return;
    }
    setButtons([...buttons, { text: "", url: "" }]);
  };

  const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));

  const updateButton = (i: number, field: keyof CardButton, value: string) => {
    const updated = [...buttons];
    updated[i] = { ...updated[i], [field]: value };
    setButtons(updated);
  };

  const copyLink = () => {
    if (card) {
      navigator.clipboard.writeText(`${PUBLIC_DOMAIN}/${card.slug}`);
      toast.success("Link copiado!");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!card) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto space-y-6 p-4">
          <div className="text-center space-y-2">
            <CreditCard className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Criar Cartão Virtual</h1>
            <p className="text-muted-foreground">Crie seu cartão de visita digital profissional.</p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>URL do seu cartão</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">contato.tur.br/</span>
                  <Input
                    placeholder="seu-nome"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createCard.isPending} className="w-full">
                {createCard.isPending ? "Criando..." : "Criar Cartão"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          pageKey="meu-cartao"
          title="Cartão de Visita Virtual"
          subtitle="Gerencie seu cartão de visita digital profissional."
          icon={CreditCard}
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1" /> Copiar link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/${card.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-1" /> Visualizar
            </a>
          </Button>
        </div>

        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2 flex-wrap">
          <ExternalLink className="h-4 w-4" />
          <span className="font-medium">{publicUrl}</span>
        </div>

        {/* Photo & Cover */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Imagens</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Foto do agente</Label>
                <div className="mt-2 flex items-center gap-3">
                  {card.photo_url && (
                    <img src={card.photo_url} alt="Foto" className="h-16 w-16 rounded-full object-cover border" />
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" /> Enviar foto
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
              <div>
                <Label>Logotipo da empresa</Label>
                <div className="mt-2 flex items-center gap-3">
                  {card.logos.length > 0 && (
                    <img src={card.logos[0]} alt="Logo" className="h-16 object-contain border rounded p-1" />
                  )}
                  <div className="space-y-1">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" /> {card.logos.length > 0 ? "Trocar logo" : "Enviar logo"}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadImage(file, "logo");
                            if (url) updateCard.mutate({ logos: [url] } as any);
                          } catch { toast.error("Erro ao enviar logotipo."); }
                        }}
                      />
                    </label>
                    {card.logos.length > 0 && (
                      <button
                        onClick={() => updateCard.mutate({ logos: [] } as any)}
                        className="flex items-center gap-1 text-xs text-destructive hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG transparente, máx 400×400px</p>
                  </div>
                </div>
              </div>
              <div>
                <Label>Imagem de capa</Label>
                <div className="mt-2 flex items-center gap-3">
                  {card.cover_url && (
                    <img src={card.cover_url} alt="Capa" className="h-16 w-28 rounded object-cover border" />
                  )}
                  <Dialog open={coverDialogOpen} onOpenChange={setCoverDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ImageIcon className="h-4 w-4 mr-1" /> Escolher capa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Escolha uma imagem de capa</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Tamanho recomendado: <strong>1200 × 400 px</strong> (proporção 3:1). Formatos aceitos: JPG ou PNG.
                      </p>
                      {/* Upload custom cover */}
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Enviar sua própria imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadImage(file, "cover");
                              if (url) {
                                updateCard.mutate({ cover_url: url } as any);
                                setCoverDialogOpen(false);
                              }
                            } catch {
                              toast.error("Erro ao enviar imagem de capa.");
                            }
                          }}
                        />
                      </label>
                      <Separator />
                      <p className="text-sm font-medium text-foreground">Ou escolha uma das opções abaixo:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
                        {COVER_OPTIONS.map((url) => (
                          <button
                            key={url}
                            onClick={() => handleSelectCover(url)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all hover:ring-2 hover:ring-primary ${
                              card.cover_url === url ? "border-primary ring-2 ring-primary" : "border-border"
                            }`}
                          >
                            <img src={url} alt="Opção de capa" className="w-full h-24 sm:h-28 object-cover" />
                            {card.cover_url === url && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="h-8 w-8 text-primary-foreground drop-shadow-lg" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Nome", key: "name" },
                { label: "Cargo / Título", key: "title" },
                { label: "Nome da agência", key: "agency_name" },
                { label: "Telefone", key: "phone" },
                { label: "WhatsApp", key: "whatsapp" },
                { label: "E-mail", key: "email" },
                { label: "Site", key: "website" },
              ].map(f => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    className="mt-1"
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
           </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={updateCard.isPending} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {updateCard.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Cores</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6 flex-wrap">
              <div>
                <Label>Cor principal</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={e => setForm({ ...form, primary_color: e.target.value })}
                    className="h-10 w-10 rounded cursor-pointer border-0"
                  />
                  <span className="text-sm text-muted-foreground">{form.primary_color}</span>
                </div>
              </div>
              <div>
                <Label>Cor secundária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                    className="h-10 w-10 rounded cursor-pointer border-0"
                  />
                  <span className="text-sm text-muted-foreground">{form.secondary_color}</span>
                </div>
             </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={updateCard.isPending} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {updateCard.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Botões de ação</CardTitle>
              <Button variant="outline" size="sm" onClick={addButton}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {buttons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum botão adicionado.</p>
            )}
            {buttons.map((btn, i) => (
              <div key={i} className="flex items-start gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2.5 shrink-0" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Texto do botão"
                    value={btn.text}
                    onChange={e => updateButton(i, "text", e.target.value)}
                  />
                  <Input
                    placeholder="https://..."
                    value={btn.url}
                    onChange={e => updateButton(i, "url", e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeButton(i)} className="shrink-0 mt-0.5">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={updateCard.isPending} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {updateCard.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Redes Sociais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {SOCIAL_CONFIG.map(({ key, label, icon: Icon, prefix }) => {
              // Extract username from stored full URL for display
              const storedValue = socialLinks[key] || "";
              const displayValue = extractUsername(storedValue, prefix);
              return (
                <div key={key} className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs select-none whitespace-nowrap">
                      {prefix}
                    </span>
                    <Input
                      className="rounded-l-none"
                      placeholder="seu-usuario"
                      value={displayValue}
                      onChange={e => {
                        const raw = e.target.value;
                        const cleaned = extractUsername(raw, prefix);
                        setSocialLinks({ ...socialLinks, [key]: cleaned });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateCard.isPending} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {updateCard.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
