import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Loader2, Tag, Check } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

interface Specialty {
  id: string;
  name: string;
}

interface SupplierSpecialtiesManagerProps {
  supplierId: string | null;
  selectedSpecialties: Specialty[];
  onSpecialtiesChange: (specialties: Specialty[]) => void;
}

export function SupplierSpecialtiesManager({
  supplierId,
  selectedSpecialties,
  onSpecialtiesChange,
}: SupplierSpecialtiesManagerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all existing specialties
  const { data: allSpecialties = [], isLoading } = useQuery({
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

  // Create new specialty mutation
  const createSpecialtyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("specialties")
        .insert({ name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      return data as Specialty;
    },
    onSuccess: (newSpecialty) => {
      queryClient.invalidateQueries({ queryKey: ["specialties"] });
      // Add to selected
      onSpecialtiesChange([...selectedSpecialties, newSpecialty]);
      setInputValue("");
      toast.success(`Especialidade "${newSpecialty.name}" criada!`);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Esta especialidade já existe");
      } else {
        toast.error("Erro ao criar especialidade");
      }
    },
  });

  const handleSelectSpecialty = (specialty: Specialty) => {
    const isSelected = selectedSpecialties.some((s) => s.id === specialty.id);
    if (isSelected) {
      onSpecialtiesChange(selectedSpecialties.filter((s) => s.id !== specialty.id));
    } else {
      onSpecialtiesChange([...selectedSpecialties, specialty]);
    }
    setInputValue("");
  };

  const handleRemoveSpecialty = (specialtyId: string) => {
    onSpecialtiesChange(selectedSpecialties.filter((s) => s.id !== specialtyId));
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      setIsCreating(true);
      createSpecialtyMutation.mutate(inputValue.trim());
      setIsCreating(false);
    }
  };

  // Filter specialties based on input
  const filteredSpecialties = allSpecialties.filter((s) =>
    s.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if exact match exists
  const exactMatch = allSpecialties.some(
    (s) => s.name.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Especialidades
      </Label>

      {/* Selected specialties */}
      {selectedSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSpecialties.map((specialty) => (
            <Badge
              key={specialty.id}
              variant="secondary"
              className="gap-1 pl-3 pr-1 py-1"
            >
              {specialty.name}
              <button
                type="button"
                onClick={() => handleRemoveSpecialty(specialty.id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add specialty combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start font-normal"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar especialidade...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Digite para buscar ou criar..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Create new option */}
                  {inputValue && !exactMatch && (
                    <CommandGroup heading="Criar nova">
                      <CommandItem
                        onSelect={handleCreateNew}
                        disabled={createSpecialtyMutation.isPending}
                        className="cursor-pointer"
                      >
                        {createSpecialtyMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Criar "{inputValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {/* Existing specialties */}
                  {filteredSpecialties.length > 0 && (
                    <CommandGroup heading="Especialidades">
                      {filteredSpecialties.map((specialty) => {
                        const isSelected = selectedSpecialties.some(
                          (s) => s.id === specialty.id
                        );
                        return (
                          <CommandItem
                            key={specialty.id}
                            value={specialty.id}
                            onSelect={() => handleSelectSpecialty(specialty)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {specialty.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {filteredSpecialties.length === 0 && !inputValue && (
                    <CommandEmpty>
                      Digite para buscar ou criar especialidades
                    </CommandEmpty>
                  )}

                  {filteredSpecialties.length === 0 && inputValue && exactMatch && (
                    <CommandEmpty>
                      Nenhuma especialidade encontrada
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        Ex: África do Sul, Cruzeiros, Lua de Mel, Disney, Mergulho...
      </p>
    </div>
  );
}
