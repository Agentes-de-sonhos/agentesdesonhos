import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Upload, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
import type { TripServiceType } from "@/types/trip";

interface TripServiceFormProps {
  serviceType: TripServiceType;
  onSubmit: (data: any, file?: File) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: any;
  isEditing?: boolean;
}

interface VoucherUploadProps {
  file: File | null;
  setFile: (file: File | null) => void;
  label?: string;
}

function VoucherUpload({ file, setFile, label = "Voucher/Documento" }: VoucherUploadProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {file ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm truncate flex-1">{file.name}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Clique para enviar</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );
}

// Flight Form
const flightSchema = z.object({
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  airline: z.string().min(2, "Companhia aérea é obrigatória"),
  departure_date: z.date({ required_error: "Data de ida é obrigatória" }),
  return_date: z.date({ required_error: "Data de volta é obrigatória" }),
  notes: z.string().optional(),
});

function FlightForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      origin_city: defaultValues?.origin_city || "",
      destination_city: defaultValues?.destination_city || "",
      airline: defaultValues?.airline || "",
      notes: defaultValues?.notes || "",
      ...(defaultValues?.departure_date ? { departure_date: parseLocal(defaultValues.departure_date) } : {}),
      ...(defaultValues?.return_date ? { return_date: parseLocal(defaultValues.return_date) } : {}),
    },
  });

  const handleSubmit = (values: z.infer<typeof flightSchema>) => {
    onSubmit(
      {
        origin_city: values.origin_city,
        destination_city: values.destination_city,
        airline: values.airline,
        departure_date: format(values.departure_date, "yyyy-MM-dd"),
        return_date: format(values.return_date, "yyyy-MM-dd"),
        notes: values.notes || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Origem</FormLabel>
              <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Destino</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="airline" render={({ field }) => (
          <FormItem>
            <FormLabel>Companhia Aérea</FormLabel>
            <FormControl><Input placeholder="LATAM, GOL, Air France..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="departure_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Ida</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
          <FormField control={form.control} name="return_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Volta</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Voucher/Ticket/Boarding Pass" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isEditing ? <><Pencil className="mr-2 h-4 w-4" /> Salvar</> : <><Plus className="mr-2 h-4 w-4" /> Adicionar</>}
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
  notes: z.string().optional(),
});

function HotelForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      hotel_name: defaultValues?.hotel_name || "",
      city: defaultValues?.city || "",
      notes: defaultValues?.notes || "",
      ...(defaultValues?.check_in ? { check_in: parseLocal(defaultValues.check_in) } : {}),
      ...(defaultValues?.check_out ? { check_out: parseLocal(defaultValues.check_out) } : {}),
    },
  });

  const handleSubmit = (values: z.infer<typeof hotelSchema>) => {
    onSubmit(
      {
        hotel_name: values.hotel_name,
        city: values.city,
        check_in: format(values.check_in, "yyyy-MM-dd"),
        check_out: format(values.check_out, "yyyy-MM-dd"),
        notes: values.notes || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="hotel_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Hotel</FormLabel>
              <FormControl><Input placeholder="Hotel Marriott" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="check_in" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-in</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
          <FormField control={form.control} name="check_out" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Check-out</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea placeholder="Tipo de quarto, regime..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Voucher do Hotel" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
  notes: z.string().optional(),
});

function CarRentalForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof carRentalSchema>>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: { pickup_location: "", dropoff_location: "", car_type: "", notes: "" },
  });

  const handleSubmit = (values: z.infer<typeof carRentalSchema>) => {
    onSubmit(
      {
        pickup_location: values.pickup_location,
        dropoff_location: values.dropoff_location,
        car_type: values.car_type,
        notes: values.notes || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="pickup_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Local de Retirada</FormLabel>
              <FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dropoff_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Local de Devolução</FormLabel>
              <FormControl><Input placeholder="Aeroporto CDG" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="car_type" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Carro</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
});

function TransferForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { transfer_type: "arrival", location: "" },
  });

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    onSubmit(
      {
        transfer_type: values.transfer_type,
        location: values.location,
        date: format(values.date, "yyyy-MM-dd"),
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="transfer_type" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Transfer</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="arrival">Chegada (Aeroporto → Hotel)</SelectItem>
                <SelectItem value="departure">Saída (Hotel → Aeroporto)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Local</FormLabel>
            <FormControl><Input placeholder="Aeroporto CDG → Hotel Marriott" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
        )} />

        <VoucherUpload file={file} setFile={setFile} />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
});

function AttractionForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof attractionSchema>>({
    resolver: zodResolver(attractionSchema),
    defaultValues: { name: "", quantity: 1 },
  });

  const handleSubmit = (values: z.infer<typeof attractionSchema>) => {
    onSubmit(
      {
        name: values.name,
        date: format(values.date, "yyyy-MM-dd"),
        quantity: values.quantity,
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Atração/Ingresso</FormLabel>
            <FormControl><Input placeholder="Torre Eiffel, Museu do Louvre..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
          <FormField control={form.control} name="quantity" render={({ field }) => (
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
          )} />
        </div>

        <VoucherUpload file={file} setFile={setFile} label="Voucher/Ingresso" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
});

function InsuranceForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { provider: "", coverage: "" },
  });

  const handleSubmit = (values: z.infer<typeof insuranceSchema>) => {
    onSubmit(
      {
        provider: values.provider,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        coverage: values.coverage,
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="provider" render={({ field }) => (
          <FormItem>
            <FormLabel>Seguradora</FormLabel>
            <FormControl><Input placeholder="Assist Card, Travel Ace..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Início</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Fim</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
        </div>

        <FormField control={form.control} name="coverage" render={({ field }) => (
          <FormItem>
            <FormLabel>Cobertura</FormLabel>
            <FormControl><Input placeholder="USD 60.000, USD 100.000..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Apólice" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
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
});

function CruiseForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: { ship_name: "", route: "" },
  });

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    onSubmit(
      {
        ship_name: values.ship_name,
        route: values.route,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="ship_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Navio</FormLabel>
            <FormControl><Input placeholder="MSC Seaview, Costa Diadema..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="route" render={({ field }) => (
          <FormItem>
            <FormLabel>Rota</FormLabel>
            <FormControl><Input placeholder="Santos → Búzios → Ilha Grande → Santos" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Embarque</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
          <FormField control={form.control} name="end_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Desembarque</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
          )} />
        </div>

        <VoucherUpload file={file} setFile={setFile} />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Other Form
const otherSchema = z.object({
  description: z.string().min(5, "Descrição é obrigatória"),
});

function OtherForm({ onSubmit, onCancel, isLoading }: Omit<TripServiceFormProps, "serviceType">) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof otherSchema>>({
    resolver: zodResolver(otherSchema),
    defaultValues: { description: "" },
  });

  const handleSubmit = (values: z.infer<typeof otherSchema>) => {
    onSubmit({ description: values.description }, file || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição do Serviço</FormLabel>
            <FormControl><Textarea placeholder="Descreva o serviço..." rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <VoucherUpload file={file} setFile={setFile} label="Documento" />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Service Form component
export function TripServiceForm({ serviceType, onSubmit, onCancel, isLoading, defaultValues, isEditing }: TripServiceFormProps) {
  const props = { onSubmit, onCancel, isLoading, defaultValues, isEditing };
  switch (serviceType) {
    case "flight": return <FlightForm {...props} />;
    case "hotel": return <HotelForm {...props} />;
    case "car_rental": return <CarRentalForm {...props} />;
    case "transfer": return <TransferForm {...props} />;
    case "attraction": return <AttractionForm {...props} />;
    case "insurance": return <InsuranceForm {...props} />;
    case "cruise": return <CruiseForm {...props} />;
    case "other": return <OtherForm {...props} />;
    default: return null;
  }
}
