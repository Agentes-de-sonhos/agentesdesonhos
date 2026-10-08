import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarClock, ChevronDown, Loader2, Send, Undo2, XCircle } from "lucide-react";
import { blogAction, type BlogPostRow } from "@/hooks/useBlogAdmin";
import { BLOG_DEFAULT_TZ, formatInZone, zonedWallTimeToUtc } from "@/lib/blog/blogUtils";
import { BLOG_TIMEZONES } from "@/components/blog/BlogPanelDialogs";

export function BlogPublishControls({
  post,
  defaultTz,
  beforeAction,
  onDone,
}: {
  post: BlogPostRow;
  defaultTz?: string;
  beforeAction: () => Promise<boolean>;
  onDone: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const tz0 = defaultTz || BLOG_DEFAULT_TZ;
  const [tz, setTz] = useState(tz0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  const run = async (action: string, at?: string, timezone?: string, ok?: string) => {
    setBusy(true);
    try {
      if (!(await beforeAction())) return;
      await blogAction(post.id, action, at, timezone);
      toast.success(ok ?? "Pronto.");
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSchedule = async () => {
    if (!date || !time) return toast.error("Escolha data e hora.");
    const at = zonedWallTimeToUtc(date, time, tz);
    if (at.getTime() <= Date.now() + 60_000) return toast.error("Escolha uma data e hora no futuro.");
    await run("schedule", at.toISOString(), tz, `Agendado para ${formatInZone(at, tz)} (${tz}).`);
    setSchedOpen(false);
  };

  const isLive = post.status === "published";
  return (
    <>
      <div className="flex">
        <Button size="sm" disabled={busy} className="rounded-r-none" onClick={() => run("publish", undefined, undefined, isLive ? "Alterações publicadas." : "Artigo publicado.")}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          {isLive ? "Publicar alterações" : "Publicar agora"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={busy} className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="Mais opções de publicação"><ChevronDown className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isLive && <DropdownMenuItem onClick={() => setSchedOpen(true)}><CalendarClock className="mr-2 h-4 w-4" /> Agendar publicação</DropdownMenuItem>}
            {post.status === "scheduled" && (
              <DropdownMenuItem onClick={() => run("cancel_schedule", undefined, undefined, "Agendamento cancelado.")}><XCircle className="mr-2 h-4 w-4" /> Cancelar agendamento</DropdownMenuItem>
            )}
            {(isLive || post.status === "scheduled") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => run("unpublish", undefined, undefined, "Artigo retirado do ar. O conteúdo foi mantido.")}><Undo2 className="mr-2 h-4 w-4" /> Retirar do ar</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {post.status === "scheduled" && post.scheduled_at && (
        <span className="text-xs text-muted-foreground">Agendado: {formatInZone(post.scheduled_at, post.schedule_timezone ?? tz0)} ({post.schedule_timezone})</span>
      )}

      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar publicação</DialogTitle>
            <DialogDescription>O texto atual do rascunho será publicado automaticamente no horário escolhido, mesmo com esta página fechada.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            <div className="col-span-2 space-y-1">
              <Label>Fuso horário</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={tz} onChange={(e) => setTz(e.target.value)}>
                {BLOG_TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <Button disabled={busy} onClick={confirmSchedule}>Confirmar agendamento</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
