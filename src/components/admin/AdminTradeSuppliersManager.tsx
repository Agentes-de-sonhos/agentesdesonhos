import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Users,
  X,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SupplierContactsManager } from "./SupplierContactsManager";
import { SupplierLogoUpload } from "./SupplierLogoUpload";
import { SupplierSpecialtiesManager } from "./SupplierSpecialtiesManager";
import { useSupplierSpecialties } from "@/hooks/useSupplierSpecialties";

const CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
];

const SOCIAL_TYPES = ["YouTube", "Telegram", "LinkedIn", "TikTok", "Facebook"];

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
  other_social_media: SocialMedia[];
  is_active: boolean;
  created_at: string;
}

interface FormData {
  name: string;
  category: string;
  how_to_sell: string;
  sales_channel: string;
  practical_notes: string;
  website_url: string;
  instagram_url: string;
  logo_url: string | null;
  other_social_media: { type: string; url: string }[];
}

const initialFormData: FormData = {
  name: "",
  category: "",
  how_to_sell: "",
  sales_channel: "",
  practical_notes: "",
  website_url: "",
  instagram_url: "",
  logo_url: null,
  other_social_media: [],
};

export function AdminTradeSuppliersManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradeSupplier | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<Specialty[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get supplier specialties when editing
  const { supplierSpecialties, saveSpecialties, isSaving } = useSupplierSpecialties(
    editingItem?.id || null
  );

  // Update selected specialties when editing supplier changes
  useEffect(() => {
    if (editingItem && supplierSpecialties) {
      setSelectedSpecialties(supplierSpecialties.map((ss) => ss.specialty));
    }
  }, [editingItem, supplierSpecialties]);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["admin-trade-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((item: any) => {
        const socialMedia = Array.isArray(item.other_social_media)
          ? (item.other_social_media as unknown as SocialMedia[])
          : [];
        return {
          ...item,
          other_social_media: socialMedia,
        };
      }) as TradeSupplier[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: newSupplier, error } = await supabase
        .from("trade_suppliers")
        .insert({
          name: data.name,
          category: data.category,
          how_to_sell: data.how_to_sell || null,
          sales_channel: data.sales_channel || null,
          practical_notes: data.practical_notes || null,
          website_url: data.website_url || null,
          instagram_url: data.instagram_url || null,
          logo_url: data.logo_url || null,
          other_social_media: data.other_social_media,
        })
        .select()
        .single();
      if (error) throw error;
      return newSupplier;
    },
    onSuccess: async (newSupplier) => {
      // Save specialties for new supplier
      if (selectedSpecialties.length > 0) {
        await saveSpecialties({
          supplierId: newSupplier.id,
          specialtyIds: selectedSpecialties.map((s) => s.id),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-with-specialties"] });
      toast({ title: "Fornecedor criado com sucesso!" });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        category?: string;
        how_to_sell?: string | null;
        sales_channel?: string | null;
        practical_notes?: string | null;
        website_url?: string | null;
        instagram_url?: string | null;
        logo_url?: string | null;
        other_social_media?: unknown;
        is_active?: boolean;
      };
    }) => {
      const { error } = await supabase
        .from("trade_suppliers")
        .update(data as any)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      // Save specialties
      await saveSpecialties({
        supplierId: id,
        specialtyIds: selectedSpecialties.map((s) => s.id),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-with-specialties"] });
      toast({ title: "Fornecedor atualizado!" });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trade_suppliers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-with-specialties"] });
      toast({ title: "Fornecedor removido!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingItem(null);
    setSelectedSpecialties([]);
    setIsOpen(false);
    setActiveTab("info");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e categoria",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          name: formData.name,
          category: formData.category,
          how_to_sell: formData.how_to_sell || null,
          sales_channel: formData.sales_channel || null,
          practical_notes: formData.practical_notes || null,
          website_url: formData.website_url || null,
          instagram_url: formData.instagram_url || null,
          logo_url: formData.logo_url || null,
          other_social_media: formData.other_social_media,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: TradeSupplier) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      how_to_sell: item.how_to_sell || "",
      sales_channel: item.sales_channel || "",
      practical_notes: item.practical_notes || "",
      website_url: item.website_url || "",
      instagram_url: item.instagram_url || "",
      logo_url: item.logo_url || null,
      other_social_media: item.other_social_media || [],
    });
    setIsOpen(true);
  };

  const toggleActive = (item: TradeSupplier) => {
    updateMutation.mutate({
      id: item.id,
      data: { is_active: !item.is_active },
    });
  };

  const addSocialMedia = () => {
    setFormData((prev) => ({
      ...prev,
      other_social_media: [...prev.other_social_media, { type: "", url: "" }],
    }));
  };

  const updateSocialMedia = (
    index: number,
    field: "type" | "url",
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.other_social_media];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, other_social_media: updated };
    });
  };

  const removeSocialMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      other_social_media: prev.other_social_media.filter((_, i) => i !== index),
    }));
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Fornecedores do Trade
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="specialties">Especialidades</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="social">Redes Sociais</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  {/* Logo Upload */}
                  <SupplierLogoUpload
                    logoUrl={formData.logo_url}
                    onLogoChange={(url) =>
                      setFormData({ ...formData, logo_url: url })
                    }
                    supplierId={editingItem?.id}
                  />

                  <div>
                    <Label>Nome da Empresa *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Site</Label>
                    <Input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) =>
                        setFormData({ ...formData, website_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input
                      type="url"
                      value={formData.instagram_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          instagram_url: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="specialties" className="space-y-4 mt-4">
                  <SupplierSpecialtiesManager
                    supplierId={editingItem?.id || null}
                    selectedSpecialties={selectedSpecialties}
                    onSpecialtiesChange={setSelectedSpecialties}
                  />
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div>
                    <Label>Como Vender</Label>
                    <Textarea
                      value={formData.how_to_sell}
                      onChange={(e) =>
                        setFormData({ ...formData, how_to_sell: e.target.value })
                      }
                      placeholder="Instruções para venda..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Canal de Vendas</Label>
                    <Textarea
                      value={formData.sales_channel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sales_channel: e.target.value,
                        })
                      }
                      placeholder="Portal, telefone, email..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Observações Práticas</Label>
                    <Textarea
                      value={formData.practical_notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practical_notes: e.target.value,
                        })
                      }
                      placeholder="Dicas e observações importantes..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Label>Outras Redes Sociais</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSocialMedia}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {formData.other_social_media.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma rede social adicionada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.other_social_media.map((social, index) => (
                        <div
                          key={index}
                          className="flex gap-2 items-start p-3 border rounded-lg"
                        >
                          <Select
                            value={social.type}
                            onValueChange={(value) =>
                              updateSocialMedia(index, "type", value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOCIAL_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="url"
                            value={social.url}
                            onChange={(e) =>
                              updateSocialMedia(index, "url", e.target.value)
                            }
                            placeholder="https://..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSocialMedia(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending || isSaving}
              >
                {(createMutation.isPending || updateMutation.isPending || isSaving) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Salvar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : suppliers?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum fornecedor cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {suppliers?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Logo or placeholder */}
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                  <Badge variant={item.is_active ? "default" : "outline"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(item)}
                    title={item.is_active ? "Desativar" : "Ativar"}
                  >
                    {item.is_active ? "🟢" : "⚪"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSupplierId(item.id)}
                    title="Gerenciar contatos"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Contacts Dialog */}
      <Dialog
        open={!!selectedSupplierId}
        onOpenChange={(open) => !open && setSelectedSupplierId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contatos do Fornecedor</DialogTitle>
          </DialogHeader>
          {selectedSupplierId && (
            <SupplierContactsManager supplierId={selectedSupplierId} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
