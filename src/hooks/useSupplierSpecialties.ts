import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Specialty {
  id: string;
  name: string;
}

interface SupplierSpecialty {
  id: string;
  supplier_id: string;
  specialty_id: string;
  specialty: Specialty;
}

export function useSupplierSpecialties(supplierId: string | null) {
  const queryClient = useQueryClient();

  // Fetch specialties for a specific supplier
  const { data: supplierSpecialties = [], isLoading } = useQuery({
    queryKey: ["supplier-specialties", supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      const { data, error } = await supabase
        .from("supplier_specialties")
        .select(`
          id,
          supplier_id,
          specialty_id,
          specialties (
            id,
            name
          )
        `)
        .eq("supplier_id", supplierId);
      
      if (error) throw error;
      
      // Transform the data to flatten the specialty object
      return data.map((item: any) => ({
        id: item.id,
        supplier_id: item.supplier_id,
        specialty_id: item.specialty_id,
        specialty: item.specialties,
      })) as SupplierSpecialty[];
    },
    enabled: !!supplierId,
  });

  // Save specialties for a supplier
  const saveSpecialtiesMutation = useMutation({
    mutationFn: async ({
      supplierId,
      specialtyIds,
    }: {
      supplierId: string;
      specialtyIds: string[];
    }) => {
      // First, delete existing specialties for this supplier
      const { error: deleteError } = await supabase
        .from("supplier_specialties")
        .delete()
        .eq("supplier_id", supplierId);
      
      if (deleteError) throw deleteError;

      // Then, insert new specialties
      if (specialtyIds.length > 0) {
        const inserts = specialtyIds.map((specialtyId) => ({
          supplier_id: supplierId,
          specialty_id: specialtyId,
        }));

        const { error: insertError } = await supabase
          .from("supplier_specialties")
          .insert(inserts);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["supplier-specialties", variables.supplierId],
      });
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers"] });
    },
  });

  return {
    supplierSpecialties,
    isLoading,
    saveSpecialties: saveSpecialtiesMutation.mutateAsync,
    isSaving: saveSpecialtiesMutation.isPending,
  };
}

// Hook to get all specialties for filtering
export function useAllSpecialties() {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Specialty[];
    },
  });
}

// Hook to get suppliers with their specialties
export function useSuppliersWithSpecialties() {
  return useQuery({
    queryKey: ["suppliers-with-specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
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
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      
      return data.map((supplier: any) => ({
        ...supplier,
        specialties: supplier.supplier_specialties?.map((ss: any) => ss.specialties) || [],
      }));
    },
  });
}
