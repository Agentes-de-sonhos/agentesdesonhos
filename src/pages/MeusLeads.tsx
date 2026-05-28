import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLeadCapture } from "@/hooks/useLeadCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Copy,
  ExternalLink,
  MessageCircle,
  Link2,
  Inbox,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function MeusLeadsContent() {
  const { form } = useLeadCapture();
  const navigate = useNavigate();

  const formUrl = form?.token
    ? `${PUBLIC_DOMAIN}/formulario/${form.token}`
    : "";

  const copyLink = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      toast.success("Link copiado!");
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-600" />
            Formulário Conversacional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure seu formulário e compartilhe o link de captação.
          </p>
        </div>

        {/* Share Link Card */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link2 className="h-5 w-5 text-emerald-600 shrink-0 mt-1 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  Seu link de captação de leads
                </p>
                <p className="text-xs text-emerald-600 truncate font-mono">{formUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyLink} className="border-emerald-300">
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(formUrl, "_blank")}
                  className="border-emerald-300"
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pointer to unified leads */}
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">A gestão dos leads foi unificada</p>
              <p className="text-xs text-muted-foreground">
                Os leads recebidos agora aparecem na tela principal de Captação de Leads.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/meus-leads")}>
              Ver Leads Recebidos
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function MeusLeads() {
  return (
    <SubscriptionGuard feature="lead_capture">
      <MeusLeadsContent />
    </SubscriptionGuard>
  );
}
