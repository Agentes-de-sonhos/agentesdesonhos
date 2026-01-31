import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, Play, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OnlineMeeting } from "@/types/community";

interface OnlineMeetingsSectionProps {
  upcoming: OnlineMeeting[];
  past: OnlineMeeting[];
}

export function OnlineMeetingsSection({ upcoming, past }: OnlineMeetingsSectionProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Video className="h-5 w-5 text-primary" />
        Encontros Semanais Online
      </h2>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximos Encontros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum encontro agendado.
              </p>
            ) : (
              upcoming.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{meeting.topic}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(meeting.meeting_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => meeting.meeting_url && window.open(meeting.meeting_url, "_blank")}
                    disabled={!meeting.meeting_url}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Entrar
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Past Meetings Archive */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4" />
              Arquivo de Gravações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma gravação disponível.
              </p>
            ) : (
              past.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{meeting.topic}</p>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(meeting.meeting_datetime), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  {meeting.recording_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(meeting.recording_url!, "_blank")}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Assistir
                    </Button>
                  ) : (
                    <Badge variant="secondary">Em breve</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
