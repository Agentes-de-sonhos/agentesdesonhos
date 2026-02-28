import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Mail, MessageCircle, Users } from "lucide-react";
import type { TrailSpeaker } from "@/types/academy";

interface SpeakersTabProps {
  speakers: TrailSpeaker[];
}

export function SpeakersTab({ speakers }: SpeakersTabProps) {
  if (speakers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-5 rounded-2xl bg-muted mb-5">
          <Users className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Palestrantes</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os palestrantes desta trilha ainda não foram adicionados. Em breve estarão disponíveis aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {speakers.map((speaker) => {
        const initials = speaker.full_name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        const whatsappUrl = speaker.whatsapp_number
          ? `https://wa.me/${speaker.whatsapp_number.replace(/\D/g, "")}`
          : null;

        return (
          <Card key={speaker.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex flex-col items-center text-center gap-3">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={speaker.photo_url || undefined} alt={speaker.full_name} />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h4 className="font-semibold text-base">{speaker.full_name}</h4>
                  {speaker.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{speaker.bio}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  {speaker.linkedin_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(speaker.linkedin_url!, "_blank")}
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </Button>
                  )}
                  {whatsappUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => window.open(whatsappUrl, "_blank")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  )}
                  {speaker.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(`mailto:${speaker.email}`, "_blank")}
                    >
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
