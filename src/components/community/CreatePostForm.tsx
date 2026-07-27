import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Image as ImageIcon, Video, FileText, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePostFormProps {
  onSubmit: (data: { content: string; tags: string[] }) => void;
  isCreating: boolean;
}

export function CreatePostForm({ onSubmit, isCreating }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const name = profile?.name || "Você";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const canSubmit = content.trim().length > 0 && !isCreating;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ content: content.trim(), tags: [] });
    setContent("");
  };

  const notifyComingSoon = (feature: string) => {
    toast.info(`${feature}: recurso sendo preparado — em breve.`);
  };

  return (
    <Card className="border-primary/30 shadow-sm ring-1 ring-primary/10">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Compartilhe com a comunidade</p>
          <p className="text-xs text-muted-foreground">
            Uma dúvida, experiência, dica, oportunidade ou conteúdo — todo mundo aprende junto.
          </p>
        </div>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="O que você quer compartilhar hoje? Dúvida, experiência, dica, oportunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Foto")}
            >
              <ImageIcon className="h-4 w-4" /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Vídeo")}
            >
              <Video className="h-4 w-4" /> Vídeo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Documento")}
            >
              <FileText className="h-4 w-4" /> Documento
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Enquete")}
            >
              <BarChart3 className="h-4 w-4" /> Enquete
            </Button>
          </div>

          <Button size="sm" onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
