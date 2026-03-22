import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Plane,
  DollarSign,
  TrendingUp,
  Heart,
  Cake,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientDetails } from "@/hooks/useCRM";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, type Client, type ClientStatus } from "@/types/crm";
import { cn } from "@/lib/utils";
import { AddTripDialog, type TripFormData } from "./AddTripDialog";
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

interface ClientProfileProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
}

const TRIP_STATUS_LABELS: Record<string, string> = {
  budget: "Orçamento",
  confirmed: "Vendida",
  cancelled: "Cancelada",
};

const TRIP_STATUS_COLORS: Record<string, string> = {
  budget: "bg-yellow-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
};

export function ClientProfile({ client, onBack, onEdit }: ClientProfileProps) {
  const { sales, opportunities, isLoading, createTrip, updateTrip, deleteTrip, isCreatingTrip } =
    useClientDetails(client.id);

  const totalSpent = sales.reduce((sum, s) => sum + s.sale_amount, 0);
  const tripsCount = sales.length;
  const averageTicket = tripsCount > 0 ? totalSpent / tripsCount : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleCreateTrip = async (data: TripFormData) => {
    await createTrip({
      ...data,
      client_name: client.name,
    });
  };

  const handleUpdateTrip = async (id: string, data: TripFormData) => {
    await updateTrip({
      id,
      destination: data.destination,
      sale_amount: data.sale_amount,
      sale_date: data.sale_date,
      start_date: data.start_date,
      end_date: data.end_date,
      trip_type: data.trip_type,
      trip_status: data.trip_status,
      commission: data.commission,
      payment_method: data.payment_method,
      include_in_billing: data.include_in_billing,
      notes: data.notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <Badge
              variant="secondary"
              className={cn("mt-1 text-white", CLIENT_STATUS_COLORS[client.status as ClientStatus] || "bg-gray-500")}
            >
              {CLIENT_STATUS_LABELS[client.status as ClientStatus] || "Lead"}
            </Badge>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline">
          <Edit2 className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
                <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Plane className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Viagens</p>
                <p className="text-xl font-bold">{tripsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold">{formatCurrency(averageTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList>
          <TabsTrigger value="dados">Dados do Cliente</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Viagens</TabsTrigger>
          <TabsTrigger value="financeiro">Resumo Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4 space-y-4">
          <ClientDataTab client={client} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Histórico de Viagens</CardTitle>
              <AddTripDialog onSubmit={handleCreateTrip} isSubmitting={isCreatingTrip} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma viagem registrada</p>
                  <p className="text-sm mt-1">Adicione viagens manualmente ou feche oportunidades no funil.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Plane className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{sale.destination}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {sale.origin === "manual" ? "Manual" : "Funil"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium text-green-600">{formatCurrency(sale.sale_amount)}</p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs text-white",
                              TRIP_STATUS_COLORS[sale.trip_status] || "bg-green-500"
                            )}
                          >
                            {TRIP_STATUS_LABELS[sale.trip_status] || "Realizada"}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <AddTripDialog
                            onSubmit={(data) => handleUpdateTrip(sale.id, data)}
                            initialData={{
                              destination: sale.destination,
                              start_date: sale.start_date,
                              end_date: sale.end_date,
                              trip_type: sale.trip_type || "past",
                              trip_status: sale.trip_status || "confirmed",
                              sale_amount: sale.sale_amount,
                              commission: sale.commission || 0,
                              payment_method: sale.payment_method || "",
                              include_in_billing: sale.include_in_billing ?? true,
                              sale_date: sale.sale_date,
                              notes: sale.notes || "",
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir viagem?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá a viagem para {sale.destination} do histórico do cliente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTrip(sale.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Gasto</span>
                  <span className="font-bold text-lg">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Número de Viagens</span>
                  <span className="font-bold text-lg">{tripsCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Ticket Médio</span>
                  <span className="font-bold text-lg">{formatCurrency(averageTicket)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Oportunidades em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                {opportunities.filter((o) => o.stage !== "closed" && o.stage !== "lost").length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma oportunidade em andamento</p>
                ) : (
                  <div className="space-y-3">
                    {opportunities
                      .filter((o) => o.stage !== "closed" && o.stage !== "lost")
                      .map((opp) => (
                        <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{opp.destination}</p>
                            <p className="text-xs text-muted-foreground">{opp.passengers_count} passageiros</p>
                          </div>
                          <span className="font-medium">{formatCurrency(opp.estimated_value)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientDataTab({ client }: { client: Client }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.city && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{client.city}</span>
            </div>
          )}
          {client.birthday_day && client.birthday_month && (
            <div className="flex items-center gap-3">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <span>
                {String(client.birthday_day).padStart(2, "0")}/{String(client.birthday_month).padStart(2, "0")}
                {client.birthday_year ? `/${client.birthday_year}` : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {client.travel_preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Preferências de Viagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{client.travel_preferences}</p>
          </CardContent>
        </Card>
      )}

      {(client.notes || client.internal_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Observações Gerais</p>
                <p className="text-muted-foreground">{client.notes}</p>
              </div>
            )}
            {client.internal_notes && (
              <div>
                <p className="text-sm font-medium mb-1">Observações Internas</p>
                <p className="text-muted-foreground">{client.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
