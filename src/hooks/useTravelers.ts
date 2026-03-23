import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Traveler {
  id: string;
  client_id: string;
  user_id: string;
  nome_completo: string;
  data_nascimento: string | null;
  cpf: string | null;
  passaporte: string | null;
  validade_passaporte: string | null;
  nacionalidade: string | null;
  observacoes: string | null;
  is_responsavel: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelerDocument {
  id: string;
  traveler_id: string;
  user_id: string;
  tipo_documento: string;
  arquivo_url: string;
  nome_arquivo: string;
  created_at: string;
}

export function useTravelers(clientId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: travelers = [], isLoading } = useQuery({
    queryKey: ["travelers", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travelers")
        .select("*")
        .eq("client_id", clientId)
        .order("is_responsavel", { ascending: false })
        .order("nome_completo");
      if (error) throw error;
      return data as Traveler[];
    },
    enabled: !!clientId,
  });

  const createTraveler = useMutation({
    mutationFn: async (data: Omit<Traveler, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("travelers").insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travelers", clientId] });
      toast({ title: "Viajante adicionado" });
    },
    onError: (e) => toast({ title: "Erro ao adicionar viajante", description: e.message, variant: "destructive" }),
  });

  const updateTraveler = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Traveler> & { id: string }) => {
      const { error } = await supabase.from("travelers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travelers", clientId] });
      toast({ title: "Viajante atualizado" });
    },
    onError: (e) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const deleteTraveler = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("travelers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travelers", clientId] });
      toast({ title: "Viajante removido" });
    },
    onError: (e) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  return {
    travelers,
    isLoading,
    createTraveler: createTraveler.mutateAsync,
    updateTraveler: updateTraveler.mutateAsync,
    deleteTraveler: deleteTraveler.mutateAsync,
    isCreating: createTraveler.isPending,
  };
}

export function useTravelerDocuments(travelerId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["traveler-documents", travelerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traveler_documents")
        .select("*")
        .eq("traveler_id", travelerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TravelerDocument[];
    },
    enabled: !!travelerId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, tipoDocumento }: { file: File; tipoDocumento: string }) => {
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${travelerId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("traveler-documents").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("traveler-documents").getPublicUrl(path);
      const { error } = await supabase.from("traveler_documents").insert({
        traveler_id: travelerId,
        user_id: user.id,
        tipo_documento: tipoDocumento,
        arquivo_url: urlData.publicUrl,
        nome_arquivo: file.name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["traveler-documents", travelerId] });
      toast({ title: "Documento enviado" });
    },
    onError: (e) => toast({ title: "Erro ao enviar documento", description: e.message, variant: "destructive" }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("traveler_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["traveler-documents", travelerId] });
      toast({ title: "Documento removido" });
    },
    onError: (e) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  return {
    documents,
    isLoading,
    uploadDocument: uploadDocument.mutateAsync,
    deleteDocument: deleteDocument.mutateAsync,
    isUploading: uploadDocument.isPending,
  };
}
