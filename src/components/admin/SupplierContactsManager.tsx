import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface FormData {
  name: string;
  position: string;
  phone: string;
  whatsapp: string;
  email: string;
}

const initialFormData: FormData = {
  name: "",
  position: "",
  phone: "",
  whatsapp: "",
  email: "",
};

interface Props {
  supplierId: string;
}

export function SupplierContactsManager({ supplierId }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-supplier-contacts", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_contacts")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("name");
      if (error) throw error;
      return data as SupplierContact[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("supplier_contacts").insert({
        supplier_id: supplierId,
        name: data.name,
        position: data.position || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-supplier-contacts", supplierId],
      });
      queryClient.invalidateQueries({ queryKey: ["supplier-contacts"] });
      toast({ title: "Contato adicionado!" });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from("supplier_contacts")
        .update({
          name: data.name,
          position: data.position || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-supplier-contacts", supplierId],
      });
      queryClient.invalidateQueries({ queryKey: ["supplier-contacts"] });
      toast({ title: "Contato atualizado!" });
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
        .from("supplier_contacts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-supplier-contacts", supplierId],
      });
      queryClient.invalidateQueries({ queryKey: ["supplier-contacts"] });
      toast({ title: "Contato removido!" });
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
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do contato",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (contact: SupplierContact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      position: contact.position || "",
      phone: contact.phone || "",
      whatsapp: contact.whatsapp || "",
      email: contact.email || "",
    });
    setIsAdding(false);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nome do representante"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="Ex: Gerente comercial"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: formatPhone(e.target.value) })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsapp: formatPhone(e.target.value),
                  })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={resetForm}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              <Check className="h-4 w-4 mr-1" />
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!isAdding && !editingId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFormData(initialFormData);
            setIsAdding(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar Contato
        </Button>
      )}

      {/* Contacts List */}
      {contacts?.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">
          Nenhum contato cadastrado
        </p>
      ) : (
        <div className="space-y-2">
          {contacts?.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <div className="text-xs text-muted-foreground space-x-2">
                    {contact.position && <span>{contact.position}</span>}
                    {contact.email && <span>• {contact.email}</span>}
                    {contact.whatsapp && <span>• {contact.whatsapp}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(contact)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(contact.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
