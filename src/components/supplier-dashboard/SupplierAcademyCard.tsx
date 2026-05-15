import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  BookOpen,
  Clock,
  Play,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SupplierCourse {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  level: string | null;
  status: string;
  is_active: boolean;
  total_lessons: number | null;
  total_duration_minutes: number | null;
  enrolled_count: number | null;
}

function CourseCard({
  course,
  onSelect,
}: {
  course: SupplierCourse;
  onSelect: (c: SupplierCourse) => void;
}) {
  const minutes = course.total_duration_minutes || 0;
  const statusLabel =
    course.status === "approved"
      ? "Publicado"
      : course.status === "pending"
      ? "Em análise"
      : course.status === "rejected"
      ? "Reprovado"
      : "Rascunho";

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 h-full"
      onClick={() => onSelect(course)}
    >
      <div className="flex flex-col sm:flex-row h-full">
        <div className="relative sm:w-40 sm:flex-shrink-0 aspect-video sm:aspect-auto sm:self-stretch sm:h-auto bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <GraduationCap className="h-10 w-10 text-primary/40" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary text-primary-foreground shadow-md text-[10px]">
              {statusLabel}
            </Badge>
          </div>
        </div>

        <CardContent className="flex-1 p-4 flex flex-col justify-between gap-2 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {course.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {course.total_lessons || 0} aulas
              </span>
              {minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes} min`}
                </span>
              )}
              {course.enrolled_count != null && (
                <span className="flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  {course.enrolled_count} inscritos
                </span>
              )}
            </div>
          </div>

          <Button size="sm" variant="ghost" className="w-full group-hover:bg-primary/10">
            Gerenciar curso
            <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

export function SupplierAcademyCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["supplier-academy-courses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as SupplierCourse[];
      const { data, error } = await supabase
        .from("marketplace_courses")
        .select(
          "id, title, description, cover_image_url, category, level, status, is_active, total_lessons, total_duration_minutes, enrolled_count"
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SupplierCourse[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const openCourse = (course: SupplierCourse) => {
    navigate(`/cursos/${course.id}/editar`);
  };

  return (
    <Card className="border-0 shadow-card h-full">
      <CardContent className="pt-5 pb-5 space-y-4 h-full flex flex-col">
        <div className="w-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            EducaTravel Academy
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground flex-1 flex flex-col items-center justify-center gap-3">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
              <p className="max-w-xs">
                Você ainda não possui cursos cadastrados na Edukatravel Academy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 auto-rows-fr gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} onSelect={openCourse} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full text-emerald-700 hover:text-emerald-800 hover:bg-emerald-600/5"
            onClick={() => navigate("/cursos")}
          >
            Ver marketplace de cursos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}