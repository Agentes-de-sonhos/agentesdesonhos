import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSalesLandings } from "@/hooks/useSalesLandings";
import {
  Plus,
  Globe,
  Eye,
  Users,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LP_DOMAIN = "lp.vitrine.tur.br";

function buildPublicUrl(slug: string): string {
  if (typeof window !== "undefined" && window.location.hostname === LP_DOMAIN) {
    return `https://${LP_DOMAIN}/${slug}`;
  }
  return `https://${LP_DOMAIN}/${slug}`;
}

export default function SalesLandings() {
  const navigate = useNavigate();
  const { list, remove } = useSalesLandings();
  const landings = list.data || [];

  const handleCopy = (slug: string) => {
    navigator.clipboard.writeText(buildPublicUrl(slug));
    toast.success("Link copiado!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => navigate("/meus-leads")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-3 w-3" /> Captação de Leads
            </button>
            <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-pink-600" />
              Páginas de Vendas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Páginas simples e diretas para captar leads.
            </p>
          </div>
          <Button
            onClick={() => navigate("/meus-leads/landings/nova")}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Criar nova página
          </Button>
        </div>

        {list.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : landings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                <Globe className="h-7 w-7" />
              </div>
              <div>
                <p className="font-medium">Nenhuma página criada ainda</p>
                <p className="text-sm text-muted-foreground">
                  Comece criando sua primeira página de vendas.
                </p>
              </div>
              <Button
                onClick={() => navigate("/meus-leads/landings/nova")}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Criar primeira página
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {landings.map((lp) => {
              const conversion =
                lp.views_count > 0
                  ? ((lp.leads_count / lp.views_count) * 100).toFixed(1)
                  : "0";
              return (
                <Card key={lp.id} className="border-0 shadow-card overflow-hidden">
                  {lp.image_url && (
                    <div
                      className="h-32 bg-cover bg-center"
                      style={{ backgroundImage: `url(${lp.image_url})` }}
                    />
                  )}
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{lp.headline}</h3>
                        {!lp.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Pausada
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {LP_DOMAIN}/{lp.slug}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-muted p-2">
                        <Eye className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                        <p className="font-semibold">{lp.views_count}</p>
                        <p className="text-muted-foreground">visitas</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                        <p className="font-semibold">{lp.leads_count}</p>
                        <p className="text-muted-foreground">leads</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="font-semibold text-pink-600">{conversion}%</p>
                        <p className="text-muted-foreground">conv.</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Criada em {format(new Date(lp.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/meus-leads/landings/${lp.id}/editar`)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(buildPublicUrl(lp.slug), "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(lp.slug)}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Link
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A página ficará indisponível, mas
                              os leads já capturados continuam no seu CRM.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => remove.mutate(lp.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}