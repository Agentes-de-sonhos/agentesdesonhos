import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceCourses, useMarketplaceCourseMutations } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap, Plus, BookOpen, Users, Video, Clock, DollarSign, Star,
  ArrowRight, Handshake, Sparkles, Eye, Edit, Send, AlertCircle, CheckCircle, XCircle,
} from "lucide-react";
import { COURSE_CATEGORIES, PRODUCT_TYPES } from "@/types/marketplace";
import { CourseCreateDialog } from "@/components/marketplace/CourseCreateDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    draft: { label: "Rascunho", variant: "secondary", icon: Edit },
    pending_review: { label: "Em Análise", variant: "outline", icon: Clock },
    approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
    rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle },
  };
  const s = map[status] || map.draft;
  return (
    <Badge variant={s.variant} className="gap-1">
      <s.icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

function ProductTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: any }> = {
    course: { label: "Curso", icon: Video },
    mentorship: { label: "Mentoria", icon: Handshake },
    hybrid: { label: "Híbrido", icon: Sparkles },
  };
  const t = map[type] || map.course;
  return (
    <Badge variant="outline" className="gap-1">
      <t.icon className="h-3 w-3" />
      {t.label}
    </Badge>
  );
}

function CourseCard({
  course,
  isCreator,
  isEnrolled,
  onView,
  onBuy,
}: {
  course: any;
  isCreator?: boolean;
  isEnrolled?: boolean;
  onView: () => void;
  onBuy?: () => void;
}) {
  const levelMap: Record<string, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="relative h-44 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <GraduationCap className="h-16 w-16 text-primary/30" />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <ProductTypeBadge type={course.product_type} />
        </div>
        {isCreator && (
          <div className="absolute top-3 right-3">
            <StatusBadge status={course.status} />
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        {course.creator_name && (
          <CardDescription className="text-xs">por {course.creator_name}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {course.total_lessons} aulas
          </span>
          <Badge variant="secondary" className="text-xs">{levelMap[course.level] || course.level}</Badge>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">
            {course.price > 0 ? `R$ ${Number(course.price).toFixed(2)}` : "Gratuito"}
          </span>
          {isEnrolled ? (
            <Button size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" /> Acessar
            </Button>
          ) : isCreator ? (
            <Button size="sm" variant="outline" onClick={onView}>
              <Edit className="h-4 w-4 mr-1" /> Gerenciar
            </Button>
          ) : (
            <Button size="sm" onClick={onBuy || onView}>
              {course.price > 0 ? (
                <><DollarSign className="h-4 w-4 mr-1" /> Comprar</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-1" /> Inscrever-se</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CursosMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses, isLoading, myCourses, loadingMyCourses, enrollments, isEnrolled } = useMarketplaceCourses();
  const { enrollFree } = useMarketplaceCourseMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("catalog");

  const enrolledCourseIds = enrollments.map((e) => e.course_id);
  const enrolledCourses = courses.filter((c) => enrolledCourseIds.includes(c.id));

  const handleBuy = async (course: any) => {
    if (course.price <= 0) {
      enrollFree.mutate(course.id);
      return;
    }
    // Stripe checkout
    try {
      const { data, error } = await supabase.functions.invoke("create-course-checkout", {
        body: { course_id: course.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("Erro ao iniciar pagamento");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="mentorias"
          title="Cursos e Mentorias"
          subtitle="Aprenda com especialistas ou compartilhe seu conhecimento criando seus próprios cursos."
          icon={GraduationCap}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="catalog" className="gap-1">
                <BookOpen className="h-4 w-4" /> Catálogo
              </TabsTrigger>
              <TabsTrigger value="enrolled" className="gap-1">
                <Star className="h-4 w-4" /> Meus Cursos
              </TabsTrigger>
              <TabsTrigger value="created" className="gap-1">
                <Users className="h-4 w-4" /> Criador
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Criar Curso
            </Button>
          </div>

          <TabsContent value="catalog" className="mt-6">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><Skeleton className="h-44" /><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader></Card>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <GraduationCap className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum curso disponível ainda</h3>
                <p className="text-muted-foreground text-sm">Seja o primeiro a criar e publicar um curso!</p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isEnrolled={isEnrolled(c.id)}
                    isCreator={c.creator_id === user?.id}
                    onView={() => navigate(`/cursos/${c.id}`)}
                    onBuy={() => handleBuy(c)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled" className="mt-6">
            {enrolledCourses.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <BookOpen className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Você ainda não se matriculou em nenhum curso</h3>
                <p className="text-muted-foreground text-sm mb-4">Explore o catálogo e encontre cursos ideais para você!</p>
                <Button variant="outline" onClick={() => setTab("catalog")}>Ver Catálogo</Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isEnrolled
                    onView={() => navigate(`/cursos/${c.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="created" className="mt-6">
            {loadingMyCourses ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2].map((i) => (
                  <Card key={i}><Skeleton className="h-44" /><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader></Card>
                ))}
              </div>
            ) : myCourses.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <Sparkles className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Você ainda não criou nenhum curso</h3>
                <p className="text-muted-foreground text-sm mb-4">Compartilhe seu conhecimento e monetize sua experiência!</p>
                <Button onClick={() => setShowCreate(true)} className="gap-1">
                  <Plus className="h-4 w-4" /> Criar Meu Primeiro Curso
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isCreator
                    onView={() => navigate(`/cursos/${c.id}/editar`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CourseCreateDialog open={showCreate} onOpenChange={setShowCreate} />
      </div>
    </DashboardLayout>
  );
}
