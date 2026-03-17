import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ServiceType,
  FlightData,
  HotelData,
  CarRentalData,
  TransferData,
  AttractionData,
  InsuranceData,
  CruiseData,
  OtherServiceData,
  SERVICE_TYPE_LABELS,
} from "@/types/quote";

interface ServiceFormProps {
  serviceType: ServiceType;
  onSubmit: (data: any, amount: number, optionLabel?: string, description?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showOptionLabel?: boolean;
}

// Flight Form
const flightSchema = z.object({
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  airline: z.string().min(2, "Companhia aérea é obrigatória"),
  departure_date: z.date({ required_error: "Data de ida é obrigatória" }),
  return_date: z.date({ required_error: "Data de volta é obrigatória" }),
  includes_baggage: z.boolean(),
  includes_boarding_fee: z.boolean(),
  adult_price: z.number().min(0),
  child_price: z.number().min(0),
  notes: z.string().optional(),
});

function FlightForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      origin_city: "",
      destination_city: "",
      airline: "",
      includes_baggage: true,
      includes_boarding_fee: true,
      adult_price: 0,
      child_price: 0,
      notes: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    const data = {
      origin_city: values.origin_city,
      destination_city: values.destination_city,
      airline: values.airline,
      departure_date: format(values.departure_date, "yyyy-MM-dd"),
      return_date: format(values.return_date, "yyyy-MM-dd"),
      includes_baggage: values.includes_baggage,
      includes_boarding_fee: values.includes_boarding_fee,
      adult_price: values.adult_price,
      child_price: values.child_price,
      notes: values.notes || "",
    };
    const amount = values.adult_price + values.child_price;
    onSubmit(data, amount);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="origin_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade de Origem</FormLabel>
                <FormControl>
                  <Input placeholder="São Paulo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="destination_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade de Destino</FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="airline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Companhia Aérea</FormLabel>
              <FormControl>
                <Input placeholder="LATAM, GOL, Air France..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="departure_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Ida</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="return_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Volta</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="includes_baggage"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Inclui bagagem</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="includes_boarding_fee"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Inclui taxa de embarque</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="adult_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Adulto (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="child_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Criança (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Hotel Form
const hotelSchema = z.object({
  hotel_name: z.string().min(2, "Nome do hotel é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  check_in: z.date({ required_error: "Check-in é obrigatório" }),
  check_out: z.date({ required_error: "Check-out é obrigatório" }),
  room_type: z.string().min(1, "Tipo de quarto é obrigatório"),
  meal_plan: z.string().min(1, "Regime de alimentação é obrigatório"),
  price: z.number().min(0),
  notes: z.string().optional(),
});

function HotelForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      hotel_name: "",
      city: "",
      room_type: "",
      meal_plan: "",
      price: 0,
      notes: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    const data = {
      hotel_name: values.hotel_name,
      city: values.city,
      check_in: format(values.check_in, "yyyy-MM-dd"),
      check_out: format(values.check_out, "yyyy-MM-dd"),
      room_type: values.room_type,
      meal_plan: values.meal_plan,
      price: values.price,
      notes: values.notes || "",
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="hotel_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Hotel</FormLabel>
                <FormControl>
                  <Input placeholder="Hotel Marriott" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="check_in"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="check_out"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="room_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Quarto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="superior">Superior</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="suite">Suíte</SelectItem>
                    <SelectItem value="suite_junior">Suíte Júnior</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meal_plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regime de Alimentação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sem_refeicao">Sem refeição</SelectItem>
                    <SelectItem value="cafe">Café da manhã</SelectItem>
                    <SelectItem value="meia_pensao">Meia pensão</SelectItem>
                    <SelectItem value="pensao_completa">Pensão completa</SelectItem>
                    <SelectItem value="all_inclusive">All Inclusive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Total (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Car Rental Form
const carRentalSchema = z.object({
  pickup_location: z.string().min(2, "Local de retirada é obrigatório"),
  dropoff_location: z.string().min(2, "Local de devolução é obrigatório"),
  car_type: z.string().min(1, "Tipo de carro é obrigatório"),
  days: z.number().min(1, "Mínimo 1 diária"),
  price: z.number().min(0),
  notes: z.string().optional(),
});

function CarRentalForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof carRentalSchema>>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: {
      pickup_location: "",
      dropoff_location: "",
      car_type: "",
      days: 1,
      price: 0,
      notes: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof carRentalSchema>) => {
    const data = {
      pickup_location: values.pickup_location,
      dropoff_location: values.dropoff_location,
      car_type: values.car_type,
      days: values.days,
      price: values.price,
      notes: values.notes || "",
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pickup_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local de Retirada</FormLabel>
                <FormControl>
                  <Input placeholder="Aeroporto CDG" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dropoff_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local de Devolução</FormLabel>
                <FormControl>
                  <Input placeholder="Aeroporto CDG" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="car_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Carro</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="economico">Econômico</SelectItem>
                    <SelectItem value="compacto">Compacto</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="luxo">Luxo</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diárias</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Total (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Transfer Form
const transferSchema = z.object({
  transfer_type: z.enum(["arrival", "departure"]),
  location: z.string().min(2, "Local é obrigatório"),
  date: z.date({ required_error: "Data é obrigatória" }),
  price: z.number().min(0),
});

function TransferForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transfer_type: "arrival",
      location: "",
      price: 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    const data = {
      transfer_type: values.transfer_type,
      location: values.location,
      date: format(values.date, "yyyy-MM-dd"),
      price: values.price,
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="transfer_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transfer</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="arrival">Chegada (Aeroporto → Hotel)</SelectItem>
                  <SelectItem value="departure">Saída (Hotel → Aeroporto)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input placeholder="Aeroporto CDG → Hotel Marriott" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Attraction Form
const attractionSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  date: z.date({ required_error: "Data é obrigatória" }),
  quantity: z.number().min(1, "Mínimo 1 ingresso"),
  price: z.number().min(0),
});

function AttractionForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      price: 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    const data = {
      name: values.name,
      date: format(values.date, "yyyy-MM-dd"),
      quantity: values.quantity,
      price: values.price,
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Atração/Ingresso</FormLabel>
              <FormControl>
                <Input placeholder="Torre Eiffel, Museu do Louvre..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Total (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Insurance Form
const insuranceSchema = z.object({
  provider: z.string().min(2, "Seguradora é obrigatória"),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  coverage: z.string().min(2, "Cobertura é obrigatória"),
  price: z.number().min(0),
});

function InsuranceForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      provider: "",
      coverage: "",
      price: 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    const data = {
      provider: values.provider,
      start_date: format(values.start_date, "yyyy-MM-dd"),
      end_date: format(values.end_date, "yyyy-MM-dd"),
      coverage: values.coverage,
      price: values.price,
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seguradora</FormLabel>
              <FormControl>
                <Input placeholder="Assist Card, Travel Ace..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Fim</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="coverage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cobertura</FormLabel>
              <FormControl>
                <Input placeholder="USD 60.000, USD 100.000..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Cruise Form
const cruiseSchema = z.object({
  ship_name: z.string().min(2, "Nome do navio é obrigatório"),
  route: z.string().min(2, "Rota é obrigatória"),
  start_date: z.date({ required_error: "Data início é obrigatória" }),
  end_date: z.date({ required_error: "Data fim é obrigatória" }),
  cabin_type: z.string().min(1, "Tipo de cabine é obrigatório"),
  price: z.number().min(0),
});

function CruiseForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: {
      ship_name: "",
      route: "",
      cabin_type: "",
      price: 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    const data = {
      ship_name: values.ship_name,
      route: values.route,
      start_date: format(values.start_date, "yyyy-MM-dd"),
      end_date: format(values.end_date, "yyyy-MM-dd"),
      cabin_type: values.cabin_type,
      price: values.price,
    };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="ship_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Navio</FormLabel>
              <FormControl>
                <Input placeholder="MSC Seaview, Costa Diadema..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="route"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rota</FormLabel>
              <FormControl>
                <Input placeholder="Santos → Búzios → Ilha Grande → Santos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Embarque</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Desembarque</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cabin_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cabine</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="externa">Externa</SelectItem>
                  <SelectItem value="varanda">Varanda</SelectItem>
                  <SelectItem value="suite">Suíte</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Total (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Other Service Form
const otherSchema = z.object({
  description: z.string().min(5, "Descrição é obrigatória"),
  price: z.number().min(0),
});

function OtherForm({ onSubmit, onCancel, isLoading }: Omit<ServiceFormProps, "serviceType">) {
  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: {
      description: "",
      price: 0,
    },
  });

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    const data = { description: values.description, price: values.price };
    onSubmit(data, values.price);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Serviço</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o serviço..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Service Form component
export function ServiceForm({ serviceType, onSubmit, onCancel, isLoading }: ServiceFormProps) {
  switch (serviceType) {
    case "flight":
      return <FlightForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "hotel":
      return <HotelForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "car_rental":
      return <CarRentalForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "transfer":
      return <TransferForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "attraction":
      return <AttractionForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "insurance":
      return <InsuranceForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "cruise":
      return <CruiseForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    case "other":
      return <OtherForm onSubmit={onSubmit} onCancel={onCancel} isLoading={isLoading} />;
    default:
      return null;
  }
}
