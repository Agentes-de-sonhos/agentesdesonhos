import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Shield,
  UserCheck,
  Newspaper,
  TrendingUp,
  Building2,
  FileText,
  Plane,
  CalendarDays,
  GraduationCap,
  Heart,
  Megaphone,
  BookOpen,
  Sparkles,
  Menu,
  Image,
} from "lucide-react";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminTradeUpdatesManager } from "@/components/admin/AdminTradeUpdatesManager";
import { AdminSuppliersManager } from "@/components/admin/AdminSuppliersManager";
import { AdminTradeSuppliersManager } from "@/components/admin/AdminTradeSuppliersManager";
import { AdminMaterialsManager } from "@/components/admin/AdminMaterialsManager";
import { AdminFlightBlocksManager } from "@/components/admin/AdminFlightBlocksManager";
import { AdminAgendaEventsManager } from "@/components/admin/AdminAgendaEventsManager";
import { AdminAcademyManager } from "@/components/admin/AdminAcademyManager";
import { AdminCommunityManager } from "@/components/admin/AdminCommunityManager";
import { AdminUserManager } from "@/components/admin/AdminUserManager";
import { AdminPopupsManager } from "@/components/admin/AdminPopupsManager";
import { AdminPlaybookManager } from "@/components/admin/AdminPlaybookManager";
import { AdminNewsCurationManager } from "@/components/admin/AdminNewsCurationManager";
import { AdminHotelsManager } from "@/components/admin/AdminHotelsManager";
import { AdminHotelRecommendationsManager } from "@/components/admin/AdminHotelRecommendationsManager";
import { AdminMenuOrderManager } from "@/components/admin/AdminMenuOrderManager";
import { AdminPageBannersManager } from "@/components/admin/AdminPageBannersManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const { data: userStats } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id");
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role");
      
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("plan");

      const total = profiles?.length || 0;
      const admins = roles?.filter(r => r.role === "admin").length || 0;
      const premium = subscriptions?.filter(s => s.plan === "premium").length || 0;

      return { total, admins, premium };
    },
  });

  const stats = [
    {
      title: "Total de Usuários",
      value: userStats?.total || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Administradores",
      value: userStats?.admins || 0,
      icon: Shield,
      color: "text-accent",
    },
    {
      title: "Premium",
      value: userStats?.premium || 0,
      icon: UserCheck,
      color: "text-green-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, conteúdo, cursos e toda a plataforma
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for Content Management */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-15">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="menu-order" className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="popups" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Pop-ups</span>
            </TabsTrigger>
            <TabsTrigger value="trade-suppliers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Diretório</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Materiais</span>
            </TabsTrigger>
            <TabsTrigger value="flight-blocks" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">Bloqueios</span>
            </TabsTrigger>
            <TabsTrigger value="agenda-events" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="academy" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Academy</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Comunidade</span>
            </TabsTrigger>
            <TabsTrigger value="playbooks" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Playbooks</span>
            </TabsTrigger>
            <TabsTrigger value="curadoria" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Notícias</span>
            </TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hotéis</span>
            </TabsTrigger>
            <TabsTrigger value="page-banners" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Capas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUserManager />
          </TabsContent>

          <TabsContent value="menu-order">
            <AdminMenuOrderManager />
          </TabsContent>

          <TabsContent value="popups">
            <AdminPopupsManager />
          </TabsContent>

          <TabsContent value="trade-suppliers">
            <AdminTradeSuppliersManager />
          </TabsContent>

          <TabsContent value="materials">
            <AdminMaterialsManager />
          </TabsContent>

          <TabsContent value="flight-blocks">
            <AdminFlightBlocksManager />
          </TabsContent>

          <TabsContent value="agenda-events">
            <AdminAgendaEventsManager />
          </TabsContent>


          <TabsContent value="trade">
            <AdminTradeUpdatesManager />
          </TabsContent>

          <TabsContent value="suppliers">
            <AdminSuppliersManager />
          </TabsContent>

          <TabsContent value="academy">
            <AdminAcademyManager />
          </TabsContent>

          <TabsContent value="community">
            <AdminCommunityManager />
          </TabsContent>

          <TabsContent value="playbooks">
            <AdminPlaybookManager />
          </TabsContent>

          <TabsContent value="curadoria">
            <AdminNewsCurationManager />
          </TabsContent>

          <TabsContent value="hotels" className="space-y-6">
            <AdminHotelRecommendationsManager />
            <AdminHotelsManager />
          </TabsContent>

          <TabsContent value="page-banners">
            <AdminPageBannersManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
