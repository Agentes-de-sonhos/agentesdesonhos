import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video, Calendar, Clock, MapPin, Users, Play, FileText, ExternalLink,
  CalendarPlus, Sparkles, Handshake, Film,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCommunityMeetings, buildGoogleCalendarUrl, type CommunityMeeting } from "@/hooks/useCommunityMeetings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABEL: Record<string, string> = {
  online: "Online",
  presential: "Presencial",
  hybrid: "Híbrido",
};
const TYPE_COLOR: Record<string, string> = {
  online: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  presential: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  hybrid: "bg-violet-500/15 text-violet-700 border-violet-500/30",
};
const CATEGORY_LABEL: Record<string, string> = {
  encontro: "Encontro",
  workshop: "Workshop",
  palestra: "Palestra",
  networking: "Networking",
  treinamento: "Treinamento",
  especialista: "Especialista",
  outro: "Outro",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={TYPE_COLOR[type] ?? ""}>
      {TYPE_LABEL[type] ?? type}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category || category === "encontro") return null;
  return <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABEL[category] ?? category}</Badge>;
}

function locationText(m: CommunityMeeting) {
  if (m.meeting_type === "online") return m.meeting_platform || "Online";
  const parts = [m.location_name, m.city, m.state].filter(Boolean);
  return parts.join(" · ") || "Local a confirmar";
}

export function MeetingsSection() {
  const { isLoading, upcoming, past, nextMeeting, attendanceMap, rsvp, isRsvping } = useCommunityMeetings();
  const [filterUpcoming, setFilterUpcoming] = useState<string>("all");
  const [filterPast, setFilterPast] = useState<string>("all");
  const [detail, setDetail] = useState<CommunityMeeting | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const filteredUpcoming = useMemo(() => {
    const list = upcoming.filter((m) => m.id !== nextMeeting?.id);
    if (filterUpcoming === "all") return list;
    return list.filter((m) => m.meeting_type === filterUpcoming);
  }, [upcoming, nextMeeting, filterUpcoming]);

  const filteredPast = useMemo(() => {
    return past.filter((m) => {
      if (filterPast === "all") return true;
      if (filterPast === "recording") return !!m.recording_url;
      if (filterPast === "materials") return Array.isArray(m.materials) && m.materials.length > 0;
      return m.meeting_type === filterPast;
    });
  }, [past, filterPast]);

  const hasAny = upcoming.length > 0 || past.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Encontros da Comunidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Participe dos próximos encontros online e presenciais, conecte-se com outros agentes de viagens e acompanhe tudo o que já aconteceu na comunidade.
        </p>
      </header>

      {/* Next meeting highlight */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Próximo encontro</h3>
        {nextMeeting ? (
          <NextMeetingCard
            meeting={nextMeeting}
            attendance={attendanceMap.get(nextMeeting.id)}
            onRsvp={(status) => rsvp({ meetingId: nextMeeting.id, status })}
            isRsvping={isRsvping}
            onOpenDetail={() => setDetail(nextMeeting)}
          />
        ) : hasAny ? (
          <EmptyNext />
        ) : (
          <InitialEmptyState />
        )}
      </section>

      {/* Upcoming */}
      {(filteredUpcoming.length > 0 || nextMeeting) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-foreground">Próximos encontros</h3>
            <Tabs value={filterUpcoming} onValueChange={setFilterUpcoming}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="presential">Presenciais</TabsTrigger>
                {upcoming.some((m) => m.meeting_type === "hybrid") && (
                  <TabsTrigger value="hybrid">Híbridos</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
          {filteredUpcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum encontro nesta categoria.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(showAllUpcoming ? filteredUpcoming : filteredUpcoming.slice(0, 4)).map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  attendance={attendanceMap.get(m.id)}
                  onRsvp={(status) => rsvp({ meetingId: m.id, status })}
                  isRsvping={isRsvping}
                  onOpenDetail={() => setDetail(m)}
                />
              ))}
            </div>
          )}
          {filteredUpcoming.length > 4 && !showAllUpcoming && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setShowAllUpcoming(true)}>
                Carregar mais encontros
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Past meetings */}
      {past.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Encontros realizados</h3>
            <p className="text-sm text-muted-foreground">
              Reveja os últimos encontros, acesse as gravações e confira os materiais compartilhados com a comunidade.
            </p>
          </div>
          <Tabs value={filterPast} onValueChange={setFilterPast}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="online">Online</TabsTrigger>
              <TabsTrigger value="presential">Presenciais</TabsTrigger>
              <TabsTrigger value="recording">Com gravação</TabsTrigger>
              <TabsTrigger value="materials">Com materiais</TabsTrigger>
            </TabsList>
          </Tabs>
          {filteredPast.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum encontro encontrado.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPast.map((m) => (
                <PastMeetingCard key={m.id} meeting={m} onOpenDetail={() => setDetail(m)} />
              ))}
            </div>
          )}
        </section>
      )}

      <MeetingDetailDialog meeting={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function NextMeetingCard({
  meeting: m, attendance, onRsvp, isRsvping, onOpenDetail,
}: {
  meeting: CommunityMeeting;
  attendance: string | undefined;
  onRsvp: (status: "confirmed" | "cancelled") => void;
  isRsvping: boolean;
  onOpenDetail: () => void;
}) {
  const start = new Date(m.start_at);
  const confirmed = attendance === "confirmed";
  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="grid md:grid-cols-[240px_1fr]">
        {m.cover_image_url && (
          <div className="h-40 md:h-full bg-muted">
            <img src={m.cover_image_url} alt={m.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={m.meeting_type} />
            <CategoryBadge category={m.category} />
            <Badge variant="secondary" className="text-[10px]">
              {formatDistanceToNow(start, { locale: ptBR, addSuffix: true })}
            </Badge>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-foreground">{m.title}</h4>
            {m.short_description && (
              <p className="text-sm text-muted-foreground mt-1">{m.short_description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(start, "EEEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {locationText(m)}
            </span>
            {m.organizer_name && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {m.organizer_name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {m.meeting_type !== "presential" && m.meeting_url && (
              <Button size="sm" onClick={() => window.open(m.meeting_url!, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-1.5" /> Participar do encontro
              </Button>
            )}
            {m.meeting_type !== "online" && !m.meeting_url && (
              <Button
                size="sm"
                variant={confirmed ? "outline" : "default"}
                disabled={isRsvping}
                onClick={() => onRsvp(confirmed ? "cancelled" : "confirmed")}
              >
                {confirmed ? "Presença confirmada" : "Confirmar presença"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onOpenDetail}>
              Ver detalhes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(buildGoogleCalendarUrl(m), "_blank")}
            >
              <CalendarPlus className="h-4 w-4 mr-1.5" /> Adicionar à agenda
            </Button>
            {m.meeting_type !== "online" && m.maps_url && (
              <Button size="sm" variant="outline" onClick={() => window.open(m.maps_url!, "_blank")}>
                <MapPin className="h-4 w-4 mr-1.5" /> Como chegar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MeetingCard({
  meeting: m, attendance, onRsvp, isRsvping, onOpenDetail,
}: {
  meeting: CommunityMeeting;
  attendance: string | undefined;
  onRsvp: (status: "confirmed" | "cancelled") => void;
  isRsvping: boolean;
  onOpenDetail: () => void;
}) {
  const start = new Date(m.start_at);
  const confirmed = attendance === "confirmed";
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {m.cover_image_url && (
        <div className="h-32 bg-muted">
          <img src={m.cover_image_url} alt={m.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <TypeBadge type={m.meeting_type} />
          <div className="flex items-center gap-1.5">
            <CategoryBadge category={m.category} />
            <span className="text-xs font-medium text-primary">
            {format(start, "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-1">{m.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {m.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{m.short_description}</p>
        )}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {format(start, "HH:mm", { locale: ptBR })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {locationText(m)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onOpenDetail}>Ver detalhes</Button>
          <Button size="sm" variant="outline" onClick={() => window.open(buildGoogleCalendarUrl(m), "_blank")}>
            <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Agenda
          </Button>
          {m.meeting_type !== "online" && (
            <Button
              size="sm"
              variant={confirmed ? "secondary" : "default"}
              disabled={isRsvping}
              onClick={() => onRsvp(confirmed ? "cancelled" : "confirmed")}
            >
              {confirmed ? "Você confirmou" : "Confirmar presença"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PastMeetingCard({ meeting: m, onOpenDetail }: { meeting: CommunityMeeting; onOpenDetail: () => void }) {
  const start = new Date(m.start_at);
  const materials = Array.isArray(m.materials) ? m.materials : [];
  const photos = Array.isArray(m.photos) ? m.photos : [];
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {m.cover_image_url && (
        <div className="h-32 bg-muted">
          <img src={m.cover_image_url} alt={m.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <TypeBadge type={m.meeting_type} />
          <div className="flex items-center gap-1.5">
            <CategoryBadge category={m.category} />
            <span className="text-xs text-muted-foreground">
            {format(start, "dd 'de' MMM yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-1">{m.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {m.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{m.short_description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {m.recording_url && (
            <Button size="sm" onClick={() => window.open(m.recording_url!, "_blank")}>
              <Play className="h-3.5 w-3.5 mr-1" /> Assistir gravação
            </Button>
          )}
          {photos.length > 0 && (
            <Button size="sm" variant="outline" onClick={onOpenDetail}>
              <Film className="h-3.5 w-3.5 mr-1" /> Ver fotos
            </Button>
          )}
          {materials.length > 0 && (
            <Button size="sm" variant="outline" onClick={onOpenDetail}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Materiais
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onOpenDetail}>Ver detalhes</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingDetailDialog({ meeting: m, onClose }: { meeting: CommunityMeeting | null; onClose: () => void }) {
  if (!m) return null;
  const start = new Date(m.start_at);
  const materials = Array.isArray(m.materials) ? (m.materials as any[]) : [];
  const photos = Array.isArray(m.photos) ? (m.photos as any[]) : [];
  const speakers = Array.isArray(m.speakers) ? (m.speakers as any[]) : [];
  const agenda = Array.isArray(m.agenda) ? (m.agenda as any[]) : [];
  const links = Array.isArray(m.related_links) ? (m.related_links as any[]) : [];
  return (
    <Dialog open={!!m} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {m.cover_image_url && (
          <img src={m.cover_image_url} alt={m.title} className="w-full h-48 object-cover rounded-md" />
        )}
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={m.meeting_type} />
            <CategoryBadge category={m.category} />
          </div>
          <DialogTitle>{m.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {m.description && <p className="whitespace-pre-wrap text-muted-foreground">{m.description}</p>}

          <div className="grid sm:grid-cols-2 gap-3">
            <InfoRow icon={Calendar} label={format(start, "EEEE, dd 'de' MMM yyyy 'às' HH:mm", { locale: ptBR })} />
            {m.location_name && <InfoRow icon={MapPin} label={locationText(m)} />}
            {m.organizer_name && <InfoRow icon={Users} label={`Organizador: ${m.organizer_name}`} />}
            {m.meeting_platform && m.meeting_type !== "presential" && (
              <InfoRow icon={Video} label={m.meeting_platform} />
            )}
          </div>

          {speakers.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Palestrantes</h4>
              <ul className="list-disc pl-5 text-muted-foreground">
                {speakers.map((s: any, i) => (
                  <li key={i}>{typeof s === "string" ? s : s.name}</li>
                ))}
              </ul>
            </div>
          )}
          {agenda.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">Programação</h4>
              <ul className="list-disc pl-5 text-muted-foreground">
                {agenda.map((a: any, i) => (
                  <li key={i}>{typeof a === "string" ? a : `${a.time ?? ""} — ${a.title ?? ""}`}</li>
                ))}
              </ul>
            </div>
          )}

          {m.recording_url && (
            <Button onClick={() => window.open(m.recording_url!, "_blank")}>
              <Play className="h-4 w-4 mr-1.5" /> Assistir gravação
            </Button>
          )}

          {photos.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Fotos</h4>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p: any, i) => (
                  <img
                    key={i}
                    src={typeof p === "string" ? p : p.url}
                    alt=""
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {materials.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Materiais</h4>
              <ul className="space-y-1">
                {materials.map((doc: any, i) => (
                  <li key={i}>
                    <a
                      href={typeof doc === "string" ? doc : doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {typeof doc === "string" ? doc : doc.name || doc.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {links.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Links relacionados</h4>
              <ul className="space-y-1">
                {links.map((l: any, i) => (
                  <li key={i}>
                    <a
                      href={typeof l === "string" ? l : l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {typeof l === "string" ? l : l.label || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" /> {label}
    </span>
  );
}

function EmptyNext() {
  return (
    <Card>
      <CardContent className="py-10 text-center space-y-2">
        <Sparkles className="h-8 w-8 mx-auto text-primary/60" />
        <h4 className="font-semibold">Novos encontros em breve</h4>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Estamos preparando os próximos encontros da Comunidade Agentes de Sonhos. Assim que uma nova data for confirmada, ela aparecerá aqui.
        </p>
      </CardContent>
    </Card>
  );
}

function InitialEmptyState() {
  const items = [
    { icon: Video, label: "Encontros online" },
    { icon: Users, label: "Encontros presenciais" },
    { icon: Film, label: "Conteúdos gravados" },
    { icon: Handshake, label: "Networking entre agentes" },
  ];
  return (
    <Card className="border-primary/20">
      <CardContent className="py-12 text-center space-y-4">
        <Sparkles className="h-10 w-10 mx-auto text-primary" />
        <div className="space-y-1">
          <h4 className="text-lg font-semibold">Os encontros da nossa comunidade estão começando</h4>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Em breve, você poderá participar de encontros online e presenciais para trocar experiências, conhecer outros agentes de viagens, aprender sobre o mercado e criar novas oportunidades.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {items.map((it) => (
            <div
              key={it.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs text-foreground/80"
            >
              <it.icon className="h-3.5 w-3.5 text-primary" /> {it.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}