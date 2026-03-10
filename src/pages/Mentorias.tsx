import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMentorships } from "@/hooks/useMentorships";
import { useUserRole } from "@/hooks/useUserRole";
import { Clock, GraduationCap, Users, ArrowRight, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Mentorias() {
  const navigate = useNavigate();
  const { mentorships, loadingMentorships } = useMentorships();
  const { isAdmin } = useUserRole();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleAccessMentorship = (mentorshipId: string) => {
    if (isAdmin) {
      navigate(`/mentorias/${mentorshipId}`);
    } else {
      setShowComingSoon(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="mentorias"
          title="Mentorias"
          subtitle="Programas de mentoria exclusivos para acelerar seu crescimento profissional"
          icon={GraduationCap}
        />

        {/* Mentorships Grid */}
        {loadingMentorships ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mentorships.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma mentoria disponível</h3>
            <p className="text-muted-foreground">
              Novos programas de mentoria estão sendo preparados. Em breve você terá acesso!
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mentorships.map((mentorship) => (
              <Card 
                key={mentorship.id} 
                className="overflow-hidden group hover:shadow-lg transition-all duration-300"
              >
                {/* Mentor Photo */}
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {mentorship.mentor_photo_url ? (
                    <img
                      src={mentorship.mentor_photo_url}
                      alt={mentorship.mentor_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  {!isAdmin && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                        <Lock className="h-3 w-3 mr-1" />
                        Em breve
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{mentorship.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {mentorship.mentor_name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit mt-2">
                    {mentorship.specialty}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {mentorship.short_description}
                  </p>

                  <Button
                    className="w-full group-hover:bg-primary"
                    variant={isAdmin ? "default" : "outline"}
                    onClick={() => handleAccessMentorship(mentorship.id)}
                  >
                    {isAdmin ? (
                      <>
                        Acessar Mentoria
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Em Breve
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Coming Soon Dialog for non-admins */}
        <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Área de Mentorias em Breve
              </DialogTitle>
              <DialogDescription className="pt-4 text-base">
                Novos programas de mentoria estão sendo preparados especialmente para você.
                <br /><br />
                Em breve você terá acesso a conteúdos exclusivos, encontros semanais com mentores 
                especializados e materiais práticos para acelerar sua carreira no turismo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowComingSoon(false)}>
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
