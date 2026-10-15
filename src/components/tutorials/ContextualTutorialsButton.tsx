import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, CheckCircle2, SkipForward, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tutorialContextKey, tutorialEmbedUrl } from "@/lib/tutorialContext";

type Tutorial = { id: string; title: string; description: string | null; video_url: string; duration_seconds: number | null };

export function ContextualTutorialsButton() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = tutorialContextKey(pathname);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const { data: tutorials = [] } = useQuery({
    queryKey: ["contextual-tutorials", key],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("contextual_tutorials")
        .select("id,title,description,video_url,duration_seconds")
        .eq("context_key", key).eq("is_active", true).order("sort_order");
      return (data ?? []) as Tutorial[];
    },
  });

  const ids = tutorials.map((t) => t.id);
  const { data: done = {} } = useQuery({
    queryKey: ["contextual-tutorial-views", user?.id, ids.join(",")],
    enabled: !!user && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("contextual_tutorial_views")
        .select("tutorial_id,status").in("tutorial_id", ids);
      return Object.fromEntries((data ?? []).map((r) => [r.tutorial_id, r.status])) as Record<string, string>;
    },
  });

  const pending = tutorials.filter((t) => !done[t.id]).length;
  const firstPending = useMemo(() => Math.max(0, tutorials.findIndex((t) => !done[t.id])), [tutorials, done]);
  useEffect(() => { if (open) setIndex(firstPending); /* eslint-disable-next-line */ }, [open]);

  if (!user || tutorials.length === 0) return null;
  const current = tutorials[Math.min(index, tutorials.length - 1)];

  const mark = async (status: "watched" | "skipped", advance = true) => {
    await supabase.from("contextual_tutorial_views").upsert({ user_id: user.id, tutorial_id: current.id, status, updated_at: new Date().toISOString() });
    await qc.invalidateQueries({ queryKey: ["contextual-tutorial-views"] });
    if (advance && index < tutorials.length - 1) setIndex(index + 1);
  };
  const unmark = async () => {
    await supabase.from("contextual_tutorial_views").delete().eq("tutorial_id", current.id);
    await qc.invalidateQueries({ queryKey: ["contextual-tutorial-views"] });
  };

  return (
    <>
      <Button variant="outline" size="sm" className="relative gap-1.5 rounded-full" onClick={() => setOpen(true)}>
        <PlayCircle className="h-4 w-4 text-primary" /> Videoaulas
        {pending > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
            {pending}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Videoaulas {pending > 0 ? `· faltam ${pending}` : "· tudo assistido"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <div className="relative w-full overflow-hidden rounded-xl bg-muted" style={{ paddingBottom: "56.25%" }}>
                <iframe key={current.id} src={tutorialEmbedUrl(current.video_url)} title={current.title}
                  className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
              <div>
                <h3 className="font-semibold">{index + 1}. {current.title}</h3>
                {current.description && <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                {done[current.id] ? (
                  <Button variant="outline" size="sm" onClick={unmark}>Desmarcar</Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => mark("watched")}><CheckCircle2 className="mr-1 h-4 w-4" /> Marcar como assistido</Button>
                    <Button variant="outline" size="sm" onClick={() => mark("skipped")}><SkipForward className="mr-1 h-4 w-4" /> Já sei, pular</Button>
                  </>
                )}
                <Button variant="ghost" size="sm" disabled={index >= tutorials.length - 1} onClick={() => setIndex(index + 1)}>Próximo <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <ol className="space-y-1">
              {tutorials.map((t, i) => (
                <li key={t.id}>
                  <button onClick={() => setIndex(i)} className={cn("flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted", i === index && "bg-muted font-medium")}>
                    {done[t.id] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1">{i + 1}. {t.title}
                      {done[t.id] === "skipped" && <span className="ml-1 text-xs text-muted-foreground">(pulado)</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
