import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Lightbulb, Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";
import { SocialLinks } from "@/hooks/useBusinessCard";

const SOCIAL_CONFIG: { key: keyof SocialLinks; label: string; icon: React.ComponentType<any>; prefix: string }[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, prefix: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", icon: Facebook, prefix: "https://facebook.com/" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, prefix: "https://linkedin.com/in/" },
  { key: "twitter", label: "X (Twitter)", icon: Twitter, prefix: "https://x.com/" },
  { key: "youtube", label: "YouTube", icon: Youtube, prefix: "https://youtube.com/@" },
  { key: "tiktok", label: "TikTok", icon: Youtube, prefix: "https://tiktok.com/@" },
];

function extractUsername(value: string, prefix: string): string {
  let v = value.trim();
  if (!v) return "";
  if (v.startsWith("@")) v = v.substring(1);
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
  v = v.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return v;
}

interface StepSocialProps {
  socialLinks: SocialLinks;
  setSocialLinks: (links: SocialLinks) => void;
  onSave: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function StepSocial({ socialLinks, setSocialLinks, onSave, onBack, isPending }: StepSocialProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Redes sociais</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione suas redes sociais para que seus clientes possam acompanhar seu trabalho.
          </p>
        </div>

        {/* Tip */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <p className="font-medium text-foreground">Você só precisa inserir o nome do usuário</p>
          </div>
          <div className="text-muted-foreground pl-6 space-y-1">
            <p>Instagram completo: <span className="font-mono text-xs">https://instagram.com/seuusuario</span></p>
            <p>Você precisa inserir apenas: <span className="font-semibold text-foreground">seuusuario</span></p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">Preencha apenas as redes que você possui.</p>

        <div className="space-y-4">
          {SOCIAL_CONFIG.map(({ key, label, icon: Icon, prefix }) => {
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
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = extractUsername(raw, prefix);
                      setSocialLinks({ ...socialLinks, [key]: cleaned });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            <Check className="h-4 w-4 mr-1" /> Salvar e finalizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { SOCIAL_CONFIG, extractUsername };
