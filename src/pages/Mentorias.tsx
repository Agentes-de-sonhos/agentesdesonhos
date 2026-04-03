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
import {
  Clock,
  GraduationCap,
  Users,
  ArrowRight,
  Lock,
  BookOpen,
  Handshake,
  DollarSign,
  Sparkles,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const featureCards = [
  {
    icon: BookOpen,
    title: "Crie seu curso",
    description:
      "Publique treinamentos sobre destinos, vendas, marketing turístico, ferramentas ou gestão de agência.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    icon: Handshake,
    title: "Ofereça mentorias",
    description:
      "Compartilhe sua experiência com outros agentes e ajude profissionais a evoluírem no mercado.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    icon: DollarSign,
    title: "Monetize seu conhecimento",
    description:
      "Venda seus cursos e mentorias dentro da plataforma e transforme sua experiência em renda.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
];

export default function Mentorias() {
  const navigate = useNavigate();
  const { mentorships, loadingMentorships } = useMentorships();
  const { isAdmin } = useUserRole();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showMentorInterest, setShowMentorInterest] = useState(false);

  const handleAccessMentorship = (mentorshipId: string) => {
    if (isAdmin) {
      navigate(`/mentorias/${mentorshipId}`);
    } else {
      setShowComingSoon(true);
    }
  };

  return (
    <DashboardLayout>
      <ComingSoonOverlay pageKey="mentorias" />
      <div className="space-y-8">
        <PageHeader
          pageKey="mentorias"
          title="Cursos e Mentorias para Agentes de Viagem"
          subtitle="Aprenda com especialistas do turismo ou compartilhe seu conhecimento criando seus próprios cursos e mentorias."
          icon={GraduationCap}
          adminTab="mentorships"
        />

        {/* Banner de anúncio */}
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0 hidden md:flex">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl md:text-2xl font-bold">
                    Compartilhe seu conhecimento e gere renda
                  </h3>
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Em breve
                  </Badge>
                </div>
                <p className="text-white/85 text-sm md:text-base leading-relaxed max-w-2xl">
                  Em breve você poderá criar e vender seus próprios cursos e mentorias dentro da
                  plataforma. Assim como em plataformas de educação online, especialistas do turismo
                  poderão publicar treinamentos, compartilhar experiências e monetizar seu
                  conhecimento com outros agentes.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-white text-violet-700 hover:bg-white/90 font-semibold shadow-md flex-shrink-0"
                onClick={() => navigate("/cursos")}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Explorar Cursos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards explicativos */}
        <div className="grid gap-5 md:grid-cols-3">
          {featureCards.map((card) => (
            <Card
              key={card.title}
              className={`border ${card.border} ${card.bg} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
            >
              <CardContent className="p-6 space-y-3">
                <div
                  className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center border ${card.border}`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <h4 className="text-lg font-semibold text-foreground">{card.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cursos e mentorias disponíveis */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Cursos e Mentorias Disponíveis
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

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
            <Card className="p-10 text-center border-dashed">
              <GraduationCap className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum curso ou mentoria disponível ainda</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Novos cursos e programas de mentoria estão sendo preparados. Em breve você terá acesso a conteúdos exclusivos!
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mentorships.map((mentorship) => (
                <Card
                  key={mentorship.id}
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300"
                >
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
                          Acessar
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
        </div>

        {/* Seção futura: criadores */}
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Em breve: criadores de conteúdo
            </h3>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
              Estamos preparando um espaço onde agentes de viagens poderão publicar seus próprios
              cursos e mentorias dentro da plataforma. Isso permitirá que especialistas do turismo
              compartilhem conhecimento, fortaleçam sua autoridade no mercado e gerem novas fontes
              de renda.
            </p>
            <Badge variant="outline" className="text-xs uppercase tracking-wider">
              <Clock className="h-3 w-3 mr-1" />
              Lançamento em breve
            </Badge>
          </CardContent>
        </Card>

        {/* Dialog Coming Soon */}
        <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Área de Cursos e Mentorias em Breve
              </DialogTitle>
              <DialogDescription className="pt-4 text-base">
                Novos cursos e programas de mentoria estão sendo preparados especialmente para você.
                <br /><br />
                Em breve você terá acesso a conteúdos exclusivos, encontros semanais com mentores
                especializados e materiais práticos para acelerar sua carreira no turismo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowComingSoon(false)}>Entendi</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Quero ser mentor */}
        <Dialog open={showMentorInterest} onOpenChange={setShowMentorInterest}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-violet-600" />
                Quero ser mentor
              </DialogTitle>
              <DialogDescription className="pt-4 text-base">
                Obrigado pelo seu interesse! Estamos desenvolvendo a funcionalidade de criação de
                cursos e mentorias para agentes de viagens.
                <br /><br />
                Em breve você poderá se inscrever como mentor, publicar seus treinamentos e
                compartilhar seu conhecimento com a comunidade.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowMentorInterest(false)}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Entendi, quero ser avisado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
