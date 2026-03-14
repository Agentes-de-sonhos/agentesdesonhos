import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Upload, ImageIcon, Check, Trash2, Lightbulb, ArrowRight } from "lucide-react";
import { BusinessCard } from "@/hooks/useBusinessCard";
import { toast } from "sonner";

const COVER_OPTIONS = [
  "/images/card-covers/cover-1.png",
  "/images/card-covers/cover-2.png",
  "/images/card-covers/cover-3.png",
  "/images/card-covers/cover-4.png",
  "/images/card-covers/cover-5.png",
  "/images/card-covers/cover-6.png",
  "/images/card-covers/cover-7.png",
];

interface StepImagesProps {
  card: BusinessCard;
  updateCard: any;
  uploadImage: (file: File, type: "photo" | "cover" | "logo") => Promise<string | null>;
  onNext: () => void;
  isPending: boolean;
}

export function StepImages({ card, updateCard, uploadImage, onNext, isPending }: StepImagesProps) {
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "photo");
      if (url) updateCard.mutate({ photo_url: url } as any);
    } catch {
      toast.error("Erro ao enviar imagem.");
    }
  };

  const handleSelectCover = (url: string) => {
    updateCard.mutate({ cover_url: url } as any);
    setCoverDialogOpen(false);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Imagens do seu cartão</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Comece adicionando as imagens que aparecerão no seu cartão virtual.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm text-muted-foreground">
          <p>• Adicione sua foto profissional</p>
          <p>• Insira o logotipo da sua empresa</p>
          <p>• Escolha uma imagem de capa</p>
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Foto do agente</Label>
          <div className="flex items-center gap-4">
            {card.photo_url && (
              <img src={card.photo_url} alt="Foto" className="h-20 w-20 rounded-full object-cover border-2 border-border" />
            )}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Upload className="h-4 w-4" /> {card.photo_url ? "Trocar foto" : "Enviar foto"}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <Separator />

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Logotipo da empresa</Label>
          <div className="flex items-center gap-4">
            {card.logos.length > 0 && (
              <img src={card.logos[0]} alt="Logo" className="h-16 object-contain border rounded-lg p-1" />
            )}
            <div className="space-y-1">
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
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
                    } catch {
                      toast.error("Erro ao enviar logotipo.");
                    }
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

        <Separator />

        {/* Cover */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Imagem de capa</Label>
          <div className="flex items-center gap-4">
            {card.cover_url && (
              <img src={card.cover_url} alt="Capa" className="h-16 w-28 rounded-lg object-cover border" />
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
                  Tamanho recomendado: <strong>1200 × 400 px</strong> (proporção 3:1).
                </p>
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

        {/* Tip */}
        <div className="flex items-start gap-2 bg-accent/50 rounded-lg p-3">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> imagens claras e bem iluminadas deixam seu cartão mais profissional.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={isPending}>
            Salvar e continuar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
