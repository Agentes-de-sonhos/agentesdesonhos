import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
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
import { AdminNewsCollectorManager } from "@/components/admin/AdminNewsCollectorManager";
import { AdminHotelsManager } from "@/components/admin/AdminHotelsManager";
import { AdminHotelRecommendationsManager } from "@/components/admin/AdminHotelRecommendationsManager";
import { AdminMenuOrderManager } from "@/components/admin/AdminMenuOrderManager";
import { AdminPageBannersManager } from "@/components/admin/AdminPageBannersManager";
import { AdminDashboardBannersManager } from "@/components/admin/AdminDashboardBannersManager";
import { AdminSurveyManager } from "@/components/admin/AdminSurveyManager";
import { AdminBusinessCardsManager } from "@/components/admin/AdminBusinessCardsManager";
import { AdminCommunityRoomsManager } from "@/components/admin/AdminCommunityRoomsManager";
import { AdminCommunityMeetingsManager } from "@/components/admin/AdminCommunityMeetingsManager";
import { AdminMonthlyAwardManager } from "@/components/admin/AdminMonthlyAwardManager";
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
import { AdminPlanSwitcher } from "@/components/admin/AdminPlanSwitcher";
import { AdminVitrineCategoriesManager } from "@/components/admin/AdminVitrineCategoriesManager";
import { AdminCardCaptureManager } from "@/components/admin/AdminCardCaptureManager";
import { AdminTravelMeetManager } from "@/components/admin/AdminTravelMeetManager";
import { AdminPendingApprovalsManager } from "@/components/admin/AdminPendingApprovalsManager";
import { AdminTourGuidesManager } from "@/components/admin/AdminTourGuidesManager";
import { AdminTelegramManager } from "@/components/admin/AdminTelegramManager";
import { AdminTradeEventsManager } from "@/components/admin/AdminTradeEventsManager";
import { AdminUserProjectsManager } from "@/components/admin/AdminUserProjectsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_LABELS: Record<string, string> = {
  users: "Usuários",
  crm: "CRM",
  "agenda-events": "Agenda",
  "card-capture": "Leitor de Cartão",
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
  "dashboard-banners": "Banners Dashboard",
  "pending-approvals": "Aprovações",
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
  vitrine: "Vitrine",
  "plan-switcher": "Testar Planos",
  travelmeet: "TravelMeet",
  "tour-guides": "Guias de Turismo",
  telegram: "Telegram",
  "trade-events": "Agenda do Trade",
  "user-projects": "Projetos dos Usuários",
};

function AdminContent({ tab }: { tab: string }) {
  switch (tab) {
    case "users":
      return <AdminUserManager />;
    case "menu-order":
      return <AdminMenuOrderManager />;
    case "popups":
      return <AdminPopupsManager />;
    case "pending-approvals":
      return <AdminPendingApprovalsManager />;
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
    case "telegram":
      return <AdminTelegramManager />;
    case "trade-events":
      return <AdminTradeEventsManager />;
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
          <AdminCommunityMeetingsManager />
          <AdminMonthlyAwardManager />
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
      return (
        <Tabs defaultValue="collector">
          <TabsList className="mb-4">
            <TabsTrigger value="collector">Coleta Automática</TabsTrigger>
            <TabsTrigger value="curation">Curadoria (Legado)</TabsTrigger>
          </TabsList>
          <TabsContent value="collector"><AdminNewsCollectorManager /></TabsContent>
          <TabsContent value="curation"><AdminNewsCurationManager /></TabsContent>
        </Tabs>
      );
    case "hotels":
      return (
        <div className="space-y-6">
          <AdminHotelRecommendationsManager />
          <AdminHotelsManager />
        </div>
      );
    case "page-banners":
      return <AdminPageBannersManager />;
    case "dashboard-banners":
      return <AdminDashboardBannersManager />;
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
    case "card-capture":
      return <AdminCardCaptureManager />;
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
    case "vitrine":
      return <AdminVitrineCategoriesManager />;
    case "plan-switcher":
      return <AdminPlanSwitcher />;
    case "travelmeet":
      return <AdminTravelMeetManager />;
    case "tour-guides":
      return <AdminTourGuidesManager />;
    case "user-projects":
      return <AdminUserProjectsManager />;
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

          {/* Tab content */}
          <AdminContent tab={activeTab} />
        </div>
      </div>
    </DashboardLayout>
  );
}
