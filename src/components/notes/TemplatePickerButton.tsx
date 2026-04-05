import { useState } from "react";
import { FileText, Search, LayoutTemplate } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Note } from "@/types/notes";

interface TemplatePickerButtonProps {
  onInsert: (content: string) => void;
  variant?: "icon" | "button";
}

export function TemplatePickerButton({ onInsert, variant = "icon" }: TemplatePickerButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["note-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, updated_at")
        .eq("user_id", user.id)
        .eq("is_template", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Pick<Note, "id" | "title" | "content" | "updated_at">[];
    },
    enabled: !!user?.id && open,
  });

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (template: Pick<Note, "id" | "title" | "content">) => {
    onInsert(template.content || "");
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {variant === "icon" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
              >
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <LayoutTemplate className="h-4 w-4" />
                Inserir modelo
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Inserir modelo de texto</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Inserir Modelo
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[320px]">
          <div className="space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search ? "Nenhum modelo encontrado" : "Nenhum modelo criado ainda"}
              </div>
            ) : (
              filtered.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {template.content?.slice(0, 120) || "Sem conteúdo"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
