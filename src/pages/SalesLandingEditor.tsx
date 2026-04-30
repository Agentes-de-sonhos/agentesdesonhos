import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSalesLandings, useSalesLanding, slugify } from "@/hooks/useSalesLandings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ImagePlus, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

const LP_DOMAIN = "lp.vitrine.tur.br";

export default function SalesLandingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const { create, update } = useSalesLandings();
  const { data: existing, isLoading } = useSalesLanding(id);

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("Quero saber mais");
  const [imageUrl, setImageUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [agentWhatsapp, setAgentWhatsapp] = useState("");
  const [agentName, setAgentName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existing) {
      setHeadline(existing.headline);
      setSubheadline(existing.subheadline || "");
      setDescription(existing.description || "");
      setCtaText(existing.cta_text);
      setImageUrl(existing.image_url || "");
      setPrimaryColor(existing.primary_color);
      setAgentWhatsapp(existing.agent_whatsapp);
      setAgentName(existing.agent_name || "");
      setSlug(existing.slug);
      setSlugTouched(true);
      setIsActive(existing.is_active);
    }
  }, [existing]);

  // Auto-generate slug from headline (only on create, before user touches it)
  useEffect(() => {
    if (!isEdit && !slugTouched && headline) {
      setSlug(slugify(headline));
    }
  }, [headline, isEdit, slugTouched]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/sales-landings/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("media-files")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("media-files").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err) {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const cleanSlug = slugify(slug);
    if (!headline.trim()) return toast.error("Headline é obrigatória");
    if (!ctaText.trim()) return toast.error("Texto do botão é obrigatório");
    if (!agentWhatsapp.trim()) return toast.error("WhatsApp é obrigatório");
    if (!cleanSlug) return toast.error("Link inválido");

    const payload = {
      slug: cleanSlug,
      headline: headline.trim(),
      subheadline: subheadline.trim() || null,
      description: description.trim() || null,
      cta_text: ctaText.trim(),
      image_url: imageUrl || null,
      primary_color: primaryColor,
      agent_whatsapp: agentWhatsapp.trim(),
      agent_name: agentName.trim() || null,
      is_active: isActive,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, ...payload });
      navigate("/meus-leads/landings");
    } else {
      try {
        await create.mutateAsync(payload);
        navigate("/meus-leads/landings");
      } catch {
        /* toast tratado no hook */
      }
    }
  }

  if (isEdit && isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <button
            onClick={() => navigate("/meus-leads/landings")}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </button>
          <h1 className="font-display text-2xl font-bold">
            {isEdit ? "Editar página" : "Nova página de vendas"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Em poucos minutos sua página estará no ar.
          </p>
        </div>

        {/* Conteúdo */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold">Conteúdo</h2>

            <div className="space-y-2">
              <Label>
                Headline <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ex: Réveillon em Cancún por R$ 4.999"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label>Subheadline (opcional)</Label>
              <Input
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Ex: 7 noites • Resort all-inclusive • Aéreo incluso"
                maxLength={160}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhe a oferta, destino, datas, diferenciais..."
                rows={4}
                maxLength={1500}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Texto do botão <span className="text-destructive">*</span>
              </Label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Quero saber mais"
                maxLength={40}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold">Visual</h2>

            <div className="space-y-2">
              <Label>Imagem principal</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div
                    className="h-24 w-32 rounded-lg bg-cover bg-center border"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                ) : (
                  <div className="h-24 w-32 rounded-lg bg-muted flex items-center justify-center">
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-3 py-2 rounded-md border bg-background text-sm cursor-pointer hover:bg-accent"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    {imageUrl ? "Trocar imagem" : "Enviar imagem"}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou WEBP. Máx. 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor principal</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono w-32"
                  maxLength={7}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuração */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold">Configuração</h2>

            <div className="space-y-2">
              <Label>
                WhatsApp do agente <span className="text-destructive">*</span>
              </Label>
              <Input
                value={agentWhatsapp}
                onChange={(e) => setAgentWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do agente (opcional)</Label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Ex: Maria"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label>Link público</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {LP_DOMAIN}/
                </span>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="reveillon-cancun"
                  maxLength={60}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens.
              </p>
            </div>

            {isEdit && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Página ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando desativada, o link fica indisponível.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pb-8">
          <Button variant="outline" onClick={() => navigate("/meus-leads/landings")}>
            Cancelar
          </Button>
          {isEdit && imageUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(`https://${LP_DOMAIN}/${slug}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" /> Ver no ar
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={create.isPending || update.isPending}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {(create.isPending || update.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isEdit ? "Salvar alterações" : "Publicar página"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}