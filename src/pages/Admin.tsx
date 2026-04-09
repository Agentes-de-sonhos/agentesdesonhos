import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, UserCheck, Mail } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminTradeUpdatesManager } from "@/components/admin/AdminTradeUpdatesManager";
import { AdminSuppliersManager } from "@/components/admin/AdminSuppliersManager";
import { AdminTradeSuppliersManager } from "@/components/admin/AdminTradeSuppliersManager";
import { AdminMaterialsManager } from "@/components/admin/AdminMaterialsManager";
import { AdminFlightBlocksManager } from "@/components/admin/AdminFlightBlocksManager";
import { AdminAirBlocksTable } from "@/components/admin/AdminAirBlocksTable";
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
import { AdminSurveyManager } from "@/components/admin/AdminSurveyManager";
import { AdminBusinessCardsManager } from "@/components/admin/AdminBusinessCardsManager";
import { AdminCommunityRoomsManager } from "@/components/admin/AdminCommunityRoomsManager";
import { AdminCrmContacts } from "@/components/admin/crm/AdminCrmContacts";
import { AdminCrmTemplates } from "@/components/admin/crm/AdminCrmTemplates";
import { AdminCrmLogs } from "@/components/admin/crm/AdminCrmLogs";
import { AdminTourOperatorsManager } from "@/components/admin/AdminTourOperatorsManager";
import { AdminMentorshipsManager } from "@/components/admin/AdminMentorshipsManager";
import { AdminMarketplaceManager } from "@/components/admin/AdminMarketplaceManager";
import { AdminBenefitsManager } from "@/components/admin/AdminBenefitsManager";
import { AdminRegistrationLinksManager } from "@/components/admin/AdminRegistrationLinksManager";
import { AdminTicketsManager } from "@/components/admin/AdminTicketsManager";
import { AdminFeedbackManager } from "@/components/admin/AdminFeedbackManager";
import { AdminUserAnalytics } from "@/components/admin/AdminUserAnalytics";
import { AdminDriveImportManager } from "@/components/admin/AdminDriveImportManager";
import { AdminCruisesManager } from "@/components/admin/AdminCruisesManager";
import { AdminSupportMode } from "@/components/admin/AdminSupportMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TAB_LABELS: Record<string, string> = {
  users: "Usuários",
  crm: "CRM",
  "agenda-events": "Agenda",
  "business-cards": "Cartões",
  materials: "Materiais",
  mentorships: "Cursos",
  academy: "Academy",
  playbooks: "Playbooks",
  curadoria: "Notícias",
  "menu-order": "Menu",
  popups: "Pop-ups",
  suppliers: "Links",
  "registration-links": "Links Cadastro",
  "page-banners": "Capas",
  "trade-suppliers": "Diretório",
  hotels: "Hotéis",
  trade: "Trade",
  "flight-blocks": "Bloqueios",
  benefits: "Benefícios",
  community: "Comunidade",
  feedback: "Feedback",
  tickets: "Suporte",
  analytics: "Analytics",
  surveys: "Pesquisas",
  "drive-import": "Drive",
  "support-mode": "Modo Suporte",
};

function AdminContent({ tab }: { tab: string }) {
  switch (tab) {
    case "users":
      return <AdminUserManager />;
    case "menu-order":
      return <AdminMenuOrderManager />;
    case "popups":
      return <AdminPopupsManager />;
    case "trade-suppliers":
      return (
        <>
          <AdminTourOperatorsManager />
          <div className="mt-6"><AdminTradeSuppliersManager /></div>
          <div className="mt-6"><AdminCruisesManager /></div>
        </>
      );
    case "materials":
      return <AdminMaterialsManager />;
    case "flight-blocks":
      return (
        <div className="space-y-6">
          <AdminFlightBlocksManager />
          <AdminAirBlocksTable />
        </div>
      );
    case "agenda-events":
      return <AdminAgendaEventsManager />;
    case "trade":
      return <AdminTradeUpdatesManager />;
    case "suppliers":
      return <AdminSuppliersManager />;
    case "academy":
      return <AdminAcademyManager />;
    case "community":
      return (
        <div className="space-y-6">
          <AdminCommunityRoomsManager />
          <AdminCommunityManager />
        </div>
      );
    case "mentorships":
      return (
        <Tabs defaultValue="marketplace">
          <TabsList className="mb-4">
            <TabsTrigger value="marketplace">Marketplace de Cursos</TabsTrigger>
            <TabsTrigger value="admin-mentorships">Mentorias (Admin)</TabsTrigger>
          </TabsList>
          <TabsContent value="marketplace"><AdminMarketplaceManager /></TabsContent>
          <TabsContent value="admin-mentorships"><AdminMentorshipsManager /></TabsContent>
        </Tabs>
      );
    case "playbooks":
      return <AdminPlaybookManager />;
    case "curadoria":
      return <AdminNewsCurationManager />;
    case "hotels":
      return (
        <div className="space-y-6">
          <AdminHotelRecommendationsManager />
          <AdminHotelsManager />
        </div>
      );
    case "page-banners":
      return <AdminPageBannersManager />;
    case "surveys":
      return <AdminSurveyManager />;
    case "business-cards":
      return <AdminBusinessCardsManager />;
    case "crm":
      return (
        <div className="space-y-6">
          <AdminCrmContacts />
          <AdminCrmTemplates />
          <AdminCrmLogs />
        </div>
      );
    case "benefits":
      return <AdminBenefitsManager />;
    case "registration-links":
      return <AdminRegistrationLinksManager />;
    case "tickets":
      return <AdminTicketsManager />;
    case "feedback":
      return <AdminFeedbackManager />;
    case "analytics":
      return <AdminUserAnalytics />;
    case "drive-import":
      return <AdminDriveImportManager />;
    case "support-mode":
      return <AdminSupportMode />;
    default:
      return <AdminUserManager />;
  }
}

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "users");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const { data: userStats } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      const { data: roles } = await supabase.from("user_roles").select("role");
      const { data: subscriptions } = await supabase.from("subscriptions").select("plan");
      const total = profiles?.length || 0;
      const admins = roles?.filter((r) => r.role === "admin").length || 0;
      const fundadores = subscriptions?.filter((s) => s.plan === "profissional").length || 0;
      return { total, admins, premium: fundadores };
    },
  });

  const stats = [
    { title: "Total de Usuários", value: userStats?.total || 0, icon: Users, color: "text-primary" },
    { title: "Administradores", value: userStats?.admins || 0, icon: Shield, color: "text-accent" },
    { title: "Plano Fundador", value: userStats?.premium || 0, icon: UserCheck, color: "text-green-500" },
  ];

  return (
    <DashboardLayout>
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Painel Administrativo
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {TAB_LABELS[activeTab] || "Gestão"}
              </p>
            </div>
            <Button onClick={() => navigate("/admin/crm")} size="sm" className="gap-2">
              <Mail className="h-4 w-4" />
              CRM / Emails
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-muted ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tab content */}
          <AdminContent tab={activeTab} />
        </div>
      </div>
    </DashboardLayout>
  );
}
