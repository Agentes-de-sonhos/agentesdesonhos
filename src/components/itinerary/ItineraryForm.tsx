import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ItineraryFormData } from "@/types/itinerary";

const formSchema = z.object({
  destination: z.string().min(2, "Destino é obrigatório"),
  startDate: z.date({ required_error: "Data de início é obrigatória" }),
  endDate: z.date({ required_error: "Data de fim é obrigatória" }),
  travelersCount: z.number().min(1, "Mínimo 1 viajante"),
  tripType: z.enum(["familia", "casal", "lua_de_mel", "sozinho", "corporativo"]),
  budgetLevel: z.enum(["economico", "conforto", "luxo"]),
});

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export function ItineraryForm({ onSubmit, isLoading }: ItineraryFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      travelersCount: 2,
      tripType: "casal",
      budgetLevel: "conforto",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values as ItineraryFormData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="destination">Destino</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="destination"
              placeholder="Ex: Paris, França"
              className="pl-10"
              {...form.register("destination")}
            />
          </div>
          {form.formState.errors.destination && (
            <p className="text-sm text-destructive">
              {form.formState.errors.destination.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (date) {
                      form.setValue("startDate", date);
                      if (!endDate || endDate < date) {
                        const newEndDate = addDays(date, 5);
                        setEndDate(newEndDate);
                        form.setValue("endDate", newEndDate);
                      }
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data de Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    if (date) form.setValue("endDate", date);
                  }}
                  disabled={(date) =>
                    date < new Date() || (startDate ? date < startDate : false)
                  }
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="travelersCount">Número de Viajantes</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="travelersCount"
              type="number"
              min={1}
              className="pl-10"
              {...form.register("travelersCount", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Viagem</Label>
          <Select
            defaultValue="casal"
            onValueChange={(value) =>
              form.setValue("tripType", value as ItineraryFormData["tripType"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="familia">Família</SelectItem>
              <SelectItem value="casal">Casal</SelectItem>
              <SelectItem value="lua_de_mel">Lua de Mel</SelectItem>
              <SelectItem value="sozinho">Sozinho</SelectItem>
              <SelectItem value="corporativo">Corporativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Nível de Orçamento</Label>
          <Select
            defaultValue="conforto"
            onValueChange={(value) =>
              form.setValue(
                "budgetLevel",
                value as ItineraryFormData["budgetLevel"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o orçamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economico">
                Econômico (3 estrelas)
              </SelectItem>
              <SelectItem value="conforto">Conforto (4 estrelas)</SelectItem>
              <SelectItem value="luxo">Luxo (5 estrelas)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
            Gerando roteiro com IA...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Roteiro com IA
          </>
        )}
      </Button>
    </form>
  );
}
