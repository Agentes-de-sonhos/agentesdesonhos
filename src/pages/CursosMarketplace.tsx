import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useMarketplaceCourses, useMarketplaceCourseMutations } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap, Plus, BookOpen, Users, Video, Clock, DollarSign,
  ArrowRight, Handshake, Sparkles, Eye, Edit, Play, ChevronRight,
} from "lucide-react";
import { CourseCreateDialog } from "@/components/marketplace/CourseCreateDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  iniciante: { label: "Iniciante", color: "bg-emerald-500/90 text-white" },
  intermediario: { label: "Intermediário", color: "bg-amber-500/90 text-white" },
  avancado: { label: "Avançado", color: "bg-rose-500/90 text-white" },
};

const TYPE_ICONS: Record<string, any> = {
  course: Video,
  mentorship: Handshake,
  hybrid: Sparkles,
};

/* ───────────────────────── Course Card ───────────────────────── */

function CourseCard({
  course,
  isCreator,
  isEnrolled,
  onView,
  onBuy,
  featured = false,
}: {
  course: any;
  isCreator?: boolean;
  isEnrolled?: boolean;
  onView: () => void;
  onBuy?: () => void;
  featured?: boolean;
}) {
  const level = LEVEL_MAP[course.level] || LEVEL_MAP.iniciante;
  const TypeIcon = TYPE_ICONS[course.product_type] || Video;
  const hasLessons = course.total_lessons > 0;

  const buttonLabel = isEnrolled ? "Continuar" : "Assistir";
  const ButtonIcon = isEnrolled ? Play : Eye;

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
      onClick={onView}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
              <GraduationCap className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {/* Dark overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </AspectRatio>

        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-black/50 backdrop-blur-md text-white border-0 text-[11px] gap-1 px-2.5 py-1">
            <TypeIcon className="h-3 w-3" />
            {course.product_type === "course" ? "Curso" : course.product_type === "mentorship" ? "Mentoria" : "Híbrido"}
          </Badge>
          <Badge className={`${level.color} border-0 text-[11px] px-2.5 py-1`}>
            {level.label}
          </Badge>
        </div>

        {/* Price badge top-right */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-white/95 text-foreground border-0 font-bold text-sm px-3 py-1 shadow-lg">
            {course.price > 0 ? `R$ ${Number(course.price).toFixed(0)}` : "Grátis"}
          </Badge>
        </div>

        {/* Title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
          <h3 className={`text-white font-bold leading-tight line-clamp-2 drop-shadow-lg ${
            featured ? "text-xl md:text-2xl" : "text-base"
          }`}>
            {course.title}
          </h3>
          {course.creator_name && (
            <p className="text-white/75 text-sm mt-1 drop-shadow">
              por {course.creator_name}
            </p>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col p-4 pt-3 gap-3">
        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {hasLessons ? (
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {course.total_lessons} {course.total_lessons === 1 ? "aula" : "aulas"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Em breve
            </span>
          )}
          {course.total_duration_hours > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {course.total_duration_hours}h
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-auto pt-1 flex gap-2">
          {isCreator ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Gerenciar
            </Button>
          ) : isEnrolled ? (
            <Button
              size="sm"
              className="w-full rounded-xl bg-primary hover:bg-primary/90"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <ButtonIcon className="h-4 w-4 mr-1.5" />
              {buttonLabel}
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={(e) => { e.stopPropagation(); onBuy ? onBuy() : onView(); }}
            >
              {course.price > 0 ? (
                <><DollarSign className="h-4 w-4 mr-1.5" /> Comprar</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-1.5" /> Inscrever-se</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Enrolled Card with Progress ───────────────────── */

function EnrolledCourseCard({
  course,
  onView,
}: {
  course: any;
  onView: () => void;
}) {
  // Simulated progress (would come from enrollment data in production)
  const progressPercent = 0;

  return (
    <div
      className="group flex gap-4 items-center p-3 rounded-2xl bg-card border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      <div className="relative w-28 h-16 flex-shrink-0 rounded-xl overflow-hidden">
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </h4>
        <div className="flex items-center gap-2 mt-1.5">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="rounded-xl flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ───────────────────────── Section Header ───────────────────────── */

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
      {action && onAction && (
        <Button variant="ghost" size="sm" className="text-primary gap-1 rounded-xl" onClick={onAction}>
          {action}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function CursosMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses, isLoading, myCourses, loadingMyCourses, enrollments, isEnrolled } = useMarketplaceCourses();
  const { enrollFree } = useMarketplaceCourseMutations();
  const [showCreate, setShowCreate] = useState(false);

  const enrolledCourseIds = enrollments.map((e) => e.course_id);
  const enrolledCourses = courses.filter((c) => enrolledCourseIds.includes(c.id));
  const catalogCourses = courses.filter((c) => c.creator_id !== user?.id);
  const featuredCourse = catalogCourses[0];
  const restCourses = catalogCourses.slice(1);

  const handleBuy = async (course: any) => {
    if (course.price <= 0) {
      enrollFree.mutate(course.id);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-course-checkout", {
        body: { course_id: course.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao iniciar pagamento");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <PageHeader
            pageKey="mentorias"
            title="Cursos e Mentorias"
            subtitle="Aprenda com especialistas ou compartilhe seu conhecimento."
            icon={GraduationCap}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-1.5"
              onClick={() => navigate("/cursos")}
            >
              <Users className="h-4 w-4" />
              Meus Cursos
            </Button>
            <Button className="rounded-xl gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Criar Curso
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border/50">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-5" />
            <h3 className="text-xl font-bold mb-2">Nenhum curso disponível ainda</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Seja o primeiro a criar e publicar um curso!
            </p>
            <Button className="rounded-xl" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Meu Primeiro Curso
            </Button>
          </div>
        ) : (
          <>
            {/* ─── Destaque ─── */}
            {featuredCourse && (
              <section>
                <SectionHeader title="Em destaque" />
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <CourseCard
                      course={featuredCourse}
                      isEnrolled={isEnrolled(featuredCourse.id)}
                      isCreator={featuredCourse.creator_id === user?.id}
                      onView={() => navigate(`/cursos/${featuredCourse.id}`)}
                      onBuy={() => handleBuy(featuredCourse)}
                      featured
                    />
                  </div>
                  {restCourses.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {restCourses.slice(0, 2).map((c) => (
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
                </div>
              </section>
            )}

            {/* ─── Continuar assistindo ─── */}
            {enrolledCourses.length > 0 && (
              <section>
                <SectionHeader title="Continuar assistindo" />
                <div className="grid gap-3 md:grid-cols-2">
                  {enrolledCourses.map((c) => (
                    <EnrolledCourseCard
                      key={c.id}
                      course={c}
                      onView={() => navigate(`/cursos/${c.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Catálogo ─── */}
            {restCourses.length > 2 && (
              <section>
                <SectionHeader title="Catálogo" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {restCourses.slice(2).map((c) => (
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
              </section>
            )}

            {/* ─── Meus Cursos (Criador) ─── */}
            {myCourses.length > 0 && (
              <section>
                <SectionHeader title="Meus cursos criados" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {myCourses.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      isCreator
                      onView={() => navigate(`/cursos/${c.id}/editar`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <CourseCreateDialog open={showCreate} onOpenChange={setShowCreate} />
      </div>
    </DashboardLayout>
  );
}
