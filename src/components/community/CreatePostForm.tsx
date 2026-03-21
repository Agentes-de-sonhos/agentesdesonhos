import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Hash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreatePostFormProps {
  onSubmit: (data: { content: string; tags: string[] }) => void;
  isCreating: boolean;
}

export function CreatePostForm({ onSubmit, isCreating }: CreatePostFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);

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

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9_]/gi, "");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({ content: content.trim(), tags });
    setContent("");
    setTags([]);
    setShowTagInput(false);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="Compartilhe algo com a comunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-13">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
              >
                #{t} ×
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pl-13">
          <div className="flex items-center gap-2">
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="h-7 w-32 text-xs"
                />
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground gap-1"
                onClick={() => setShowTagInput(true)}
              >
                <Hash className="h-3.5 w-3.5" /> Tags
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isCreating}
            className="gap-1.5"
          >
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
