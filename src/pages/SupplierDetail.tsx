import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";
import {
  ArrowLeft,
  Building2,
  Globe,
  Instagram,
  Phone,
  Mail,
  MessageCircle,
  User,
  ExternalLink,
  Youtube,
  Linkedin,
  Send,
  Info,
  ShoppingCart,
  Users,
  FileText,
  Tag,
} from "lucide-react";

interface SocialMedia {
  type: string;
  url: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface TradeSupplier {
  id: string;
  name: string;
  category: string;
  how_to_sell: string | null;
  sales_channel: string | null;
  practical_notes: string | null;
  website_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  other_social_media: SocialMedia[] | null;
  is_active: boolean;
  created_at: string;
  specialties?: Specialty[];
}

interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

const socialIcons: Record<string, any> = {
  youtube: Youtube,
  linkedin: Linkedin,
  telegram: Send,
  default: Globe,
};

const safeOpen = (url: string | null | undefined) => {
  if (!url) return;
  const sanitized = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  window.open(sanitized, "_blank", "noopener,noreferrer");
};

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ["trade-supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select(`
          *,
          supplier_specialties (
            specialty_id,
            specialties (
              id,
              name
            )
          )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const socialMedia = Array.isArray(data.other_social_media) 
        ? (data.other_social_media as unknown as SocialMedia[]) 
        : [];
      const specialties = data.supplier_specialties?.map((ss: any) => ss.specialties) || [];
      return {
        ...data,
        other_social_media: socialMedia,
        specialties,
      } as TradeSupplier;
    },
    enabled: !!id,
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ["supplier-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_contacts")
        .select("*")
        .eq("supplier_id", id)
        .order("name");
      if (error) throw error;
      return data as SupplierContact[];
    },
    enabled: !!id,
  });

  const getSocialIcon = (type: string) => {
    const IconComponent = socialIcons[type.toLowerCase()] || socialIcons.default;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatWhatsAppLink = (whatsapp: string) => {
    const numbers = whatsapp.replace(/\D/g, "");
    return `https://wa.me/55${numbers}`;
  };

  if (loadingSupplier) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Fornecedor não encontrado
          </h2>
          <p className="text-muted-foreground mt-2">
            O fornecedor que você está procurando não existe ou foi removido.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate("/mapa-turismo")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao diretório
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/mapa-turismo")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao diretório
        </Button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Logo or fallback */}
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
              {supplier.logo_url ? (
                <img
                  src={supplier.logo_url}
                  alt={supplier.name}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {supplier.name}
              </h1>
              <Badge variant="secondary" className="mt-2">
                {supplier.category}
              </Badge>
              
              {/* Specialties */}
              {supplier.specialties && supplier.specialties.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {supplier.specialties.map((specialty) => (
                    <Badge
                      key={specialty.id}
                      variant="outline"
                      className="text-xs bg-primary/5"
                    >
                      <Tag className="mr-1 h-3 w-3" />
                      {specialty.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {supplier.website_url && (
              <Button
                variant="outline"
                onClick={() => safeOpen(supplier.website_url)}
              >
                <Globe className="mr-2 h-4 w-4" />
                Site
              </Button>
            )}
            {supplier.instagram_url && (
              <Button
                variant="outline"
                onClick={() => window.open(supplier.instagram_url!, "_blank")}
              >
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* How to Sell */}
            {supplier.how_to_sell && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Como Vender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {supplier.how_to_sell}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sales Channel */}
            {supplier.sales_channel && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Canal de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {supplier.sales_channel}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Practical Notes */}
            {supplier.practical_notes && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Observações Práticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {supplier.practical_notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Contatos Comerciais
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContacts ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : contacts?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum contato cadastrado
                  </p>
                ) : (
                  <div className="space-y-4">
                    {contacts?.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex flex-col gap-3 p-4 rounded-lg border bg-card sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {contact.name}
                          </p>
                          {contact.position && (
                            <p className="text-sm text-muted-foreground">
                              {contact.position}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {contact.whatsapp && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  formatWhatsAppLink(contact.whatsapp!),
                                  "_blank"
                                )
                              }
                            >
                              <MessageCircle className="mr-1 h-3 w-3" />
                              WhatsApp
                            </Button>
                          )}
                          {contact.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(`tel:${contact.phone}`, "_blank")
                              }
                            >
                              <Phone className="mr-1 h-3 w-3" />
                              Ligar
                            </Button>
                          )}
                          {contact.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(`mailto:${contact.email}`, "_blank")
                              }
                            >
                              <Mail className="mr-1 h-3 w-3" />
                              Email
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marketing Materials */}
            <SupplierMaterialsCard 
              supplierId={supplier.id} 
              supplierName={supplier.name} 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Specialties Card */}
            {supplier.specialties && supplier.specialties.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="h-5 w-5" />
                    Especialidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {supplier.specialties.map((specialty) => (
                      <Badge
                        key={specialty.id}
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
                        {specialty.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Media */}
            {supplier.other_social_media &&
              supplier.other_social_media.length > 0 && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Outras Redes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {supplier.other_social_media.map((social, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(social.url, "_blank")}
                      >
                        {getSocialIcon(social.type)}
                        <span className="ml-2 capitalize">{social.type}</span>
                        <ExternalLink className="ml-auto h-3 w-3" />
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}

            {/* Info Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  <p className="font-medium text-foreground">
                    {supplier.category}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium text-foreground">
                    {new Date(supplier.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
