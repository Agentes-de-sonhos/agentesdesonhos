import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
}

interface SupplierComboboxProps {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string, supplierName: string) => void;
  category?: string;
}

export function SupplierCombobox({
  suppliers,
  value,
  onChange,
  category,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const queryClient = useQueryClient();

  // Find selected supplier name
  const selectedSupplier = suppliers.find((s) => s.id === value);
  
  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Check if search value matches any existing supplier
  const exactMatch = suppliers.some(
    (s) => s.name.toLowerCase() === searchValue.toLowerCase()
  );

  // Mutation to create new supplier
  const createSupplierMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("tour_operators")
        .insert({
          name: name.trim(),
          category: category || "Outros",
          is_active: true,
        })
        .select("id, name")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers-for-materials"] });
      queryClient.invalidateQueries({ queryKey: ["trade-suppliers-for-filter"] });
      onChange(data.id, data.name);
      setSearchValue("");
      setOpen(false);
      toast.success(`Fornecedor "${data.name}" criado com sucesso!`);
    },
    onError: (error) => {
      console.error("Error creating supplier:", error);
      toast.error("Erro ao criar fornecedor");
    },
  });

  const handleSelect = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      onChange(supplierId, supplier.name);
    }
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      createSupplierMutation.mutate(searchValue.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedSupplier ? (
            <span className="truncate">{selectedSupplier.name}</span>
          ) : (
            <span className="text-muted-foreground">Digite ou selecione...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou criar fornecedor..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredSuppliers.length === 0 && !searchValue && (
              <CommandEmpty>Nenhum fornecedor cadastrado.</CommandEmpty>
            )}
            
            {/* Show create option when typing a new name */}
            {searchValue && !exactMatch && (
              <CommandGroup heading="Criar novo">
                <CommandItem
                  onSelect={handleCreateNew}
                  disabled={createSupplierMutation.isPending}
                  className="cursor-pointer"
                >
                  {createSupplierMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Criar "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}

            {filteredSuppliers.length > 0 && (
              <CommandGroup heading="Fornecedores">
                {filteredSuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onSelect={() => handleSelect(supplier.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === supplier.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {supplier.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
