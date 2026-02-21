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
  cruise_company: z.string().min(2, "Companhia marítima é obrigatória"),
  ship_name: z.string().min(2, "Nome do navio é obrigatório"),
  route: z.string().min(2, "Rota é obrigatória"),
  embarkation_port: z.string().min(2, "Porto de embarque é obrigatório"),
  disembarkation_port: z.string().optional(),
  start_date: z.date({ required_error: "Data embarque é obrigatória" }),
  end_date: z.date({ required_error: "Data desembarque é obrigatória" }),
  booking_number: z.string().optional(),
  cabin_type: z.string().optional(),
  cabin_number: z.string().optional(),
  cabin_category: z.string().optional(),
  deck: z.string().optional(),
  occupancy: z.string().optional(),
  meal_plan: z.string().optional(),
  checkin_url: z.string().optional(),
  checkin_status: z.string().optional(),
  checkin_deadline: z.string().optional(),
  boarding_terminal: z.string().optional(),
  port_address: z.string().optional(),
  port_maps_url: z.string().optional(),
  recommended_arrival: z.string().optional(),
  required_documents: z.string().optional(),
  baggage_policy: z.string().optional(),
  dress_code: z.string().optional(),
  company_rules: z.string().optional(),
  boarding_notes: z.string().optional(),
  onboard_currency: z.string().optional(),
  onboard_language: z.string().optional(),
  voltage: z.string().optional(),
  ship_website: z.string().optional(),
});

function CruiseForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [file, setFile] = useState<File | null>(null);
  const [passengers, setPassengers] = useState<{ name: string; birth_date?: string; document?: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPaxName, setNewPaxName] = useState("");
  const [newPaxBirth, setNewPaxBirth] = useState("");
  const [newPaxDoc, setNewPaxDoc] = useState("");
  const [newPaxNotes, setNewPaxNotes] = useState("");

  const [itinerary, setItinerary] = useState<{ date: string; port: string; arrival_time: string; departure_time: string; stop_type: string; notes: string }[]>(
    defaultValues?.itinerary || []
  );
  const [itDate, setItDate] = useState("");
  const [itPort, setItPort] = useState("");
  const [itArrival, setItArrival] = useState("");
  const [itDeparture, setItDeparture] = useState("");
  const [itType, setItType] = useState("parada");
  const [itNotes, setItNotes] = useState("");

  const form = useForm<z.infer<typeof cruiseSchema>>({
    resolver: zodResolver(cruiseSchema),
    defaultValues: {
      cruise_company: defaultValues?.cruise_company || "",
      ship_name: defaultValues?.ship_name || "",
      route: defaultValues?.route || "",
      embarkation_port: defaultValues?.embarkation_port || "",
      disembarkation_port: defaultValues?.disembarkation_port || "",
      booking_number: defaultValues?.booking_number || "",
      cabin_type: defaultValues?.cabin_type || "",
      cabin_number: defaultValues?.cabin_number || "",
      cabin_category: defaultValues?.cabin_category || "",
      deck: defaultValues?.deck || "",
      occupancy: defaultValues?.occupancy || "",
      meal_plan: defaultValues?.meal_plan || "",
      checkin_url: defaultValues?.checkin_url || "",
      checkin_status: defaultValues?.checkin_status || "pendente",
      checkin_deadline: defaultValues?.checkin_deadline || "",
      boarding_terminal: defaultValues?.boarding_terminal || "",
      port_address: defaultValues?.port_address || "",
      port_maps_url: defaultValues?.port_maps_url || "",
      recommended_arrival: defaultValues?.recommended_arrival || "",
      required_documents: defaultValues?.required_documents || "",
      baggage_policy: defaultValues?.baggage_policy || "",
      dress_code: defaultValues?.dress_code || "",
      company_rules: defaultValues?.company_rules || "",
      boarding_notes: defaultValues?.boarding_notes || "",
      onboard_currency: defaultValues?.onboard_currency || "",
      onboard_language: defaultValues?.onboard_language || "",
      voltage: defaultValues?.voltage || "",
      ship_website: defaultValues?.ship_website || "",
      ...(defaultValues?.start_date ? { start_date: parseLocal(defaultValues.start_date) } : {}),
      ...(defaultValues?.end_date ? { end_date: parseLocal(defaultValues.end_date) } : {}),
    },
  });

  const addPassenger = () => {
    if (!newPaxName.trim()) return;
    setPassengers([...passengers, { name: newPaxName.trim(), birth_date: newPaxBirth || undefined, document: newPaxDoc || undefined, notes: newPaxNotes || undefined }]);
    setNewPaxName(""); setNewPaxBirth(""); setNewPaxDoc(""); setNewPaxNotes("");
  };

  const addItineraryStop = () => {
    if (!itPort.trim()) return;
    setItinerary([...itinerary, { date: itDate, port: itPort.trim(), arrival_time: itArrival, departure_time: itDeparture, stop_type: itType, notes: itNotes }]);
    setItDate(""); setItPort(""); setItArrival(""); setItDeparture(""); setItType("parada"); setItNotes("");
  };

  const handleSubmit = (values: z.infer<typeof cruiseSchema>) => {
    onSubmit(
      {
        cruise_company: values.cruise_company,
        ship_name: values.ship_name,
        route: values.route,
        embarkation_port: values.embarkation_port,
        disembarkation_port: values.disembarkation_port || "",
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        booking_number: values.booking_number || "",
        cabin_type: values.cabin_type || "",
        cabin_number: values.cabin_number || "",
        cabin_category: values.cabin_category || "",
        deck: values.deck || "",
        occupancy: values.occupancy || "",
        meal_plan: values.meal_plan || "",
        passengers,
        itinerary,
        checkin_url: values.checkin_url || "",
        checkin_status: values.checkin_status || "pendente",
        checkin_deadline: values.checkin_deadline || "",
        boarding_terminal: values.boarding_terminal || "",
        port_address: values.port_address || "",
        port_maps_url: values.port_maps_url || "",
        recommended_arrival: values.recommended_arrival || "",
        required_documents: values.required_documents || "",
        baggage_policy: values.baggage_policy || "",
        dress_code: values.dress_code || "",
        company_rules: values.company_rules || "",
        boarding_notes: values.boarding_notes || "",
        onboard_currency: values.onboard_currency || "",
        onboard_language: values.onboard_language || "",
        voltage: values.voltage || "",
        ship_website: values.ship_website || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* === INFORMAÇÕES PRINCIPAIS === */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🚢 Informações do Cruzeiro</h4>
          <div className="h-px bg-border" />
        </div>

        <FormField control={form.control} name="cruise_company" render={({ field }) => (
          <FormItem>
            <FormLabel>Companhia Marítima *</FormLabel>
            <FormControl><Input placeholder="MSC, Royal Caribbean, Costa..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="ship_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Navio *</FormLabel>
              <FormControl><Input placeholder="MSC Seaview" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="booking_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Código da Reserva</FormLabel>
              <FormControl><Input placeholder="BK-123456" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="route" render={({ field }) => (
          <FormItem>
            <FormLabel>Roteiro *</FormLabel>
            <FormControl><Input placeholder="Caribe, Mediterrâneo, América do Sul..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="embarkation_port" render={({ field }) => (
            <FormItem>
              <FormLabel>Porto de Embarque *</FormLabel>
              <FormControl><Input placeholder="Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="disembarkation_port" render={({ field }) => (
            <FormItem>
              <FormLabel>Porto de Desembarque</FormLabel>
              <FormControl><Input placeholder="Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="start_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Embarque *</FormLabel>
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
              <FormLabel>Data Desembarque *</FormLabel>
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

        {/* === CABINE === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🛏 Dados da Cabine</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="cabin_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cabine</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
          )} />
          <FormField control={form.control} name="cabin_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número da Cabine</FormLabel>
              <FormControl><Input placeholder="8042" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="cabin_category" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl><Input placeholder="Fantastica, Yacht Club..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deck" render={({ field }) => (
            <FormItem>
              <FormLabel>Deck (Andar)</FormLabel>
              <FormControl><Input placeholder="Deck 9" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="occupancy" render={({ field }) => (
            <FormItem>
              <FormLabel>Ocupação</FormLabel>
              <FormControl><Input placeholder="2 adultos + 1 criança" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="meal_plan" render={({ field }) => (
          <FormItem>
            <FormLabel>Regime de Alimentação</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pensao_completa">Pensão Completa</SelectItem>
                <SelectItem value="all_inclusive">All Inclusive</SelectItem>
                <SelectItem value="meia_pensao">Meia Pensão</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* === PASSAGEIROS === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">👥 Passageiros</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="flex-1 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.birth_date && <span className="text-muted-foreground"> • {p.birth_date}</span>}
                {p.document && <span className="text-muted-foreground"> • {p.document}</span>}
                {p.notes && <span className="text-muted-foreground italic"> • {p.notes}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPassengers(passengers.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nome completo *" value={newPaxName} onChange={(e) => setNewPaxName(e.target.value)} />
            <Input placeholder="Data de nascimento" value={newPaxBirth} onChange={(e) => setNewPaxBirth(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Documento" value={newPaxDoc} onChange={(e) => setNewPaxDoc(e.target.value)} />
            <Input placeholder="Observações" value={newPaxNotes} onChange={(e) => setNewPaxNotes(e.target.value)} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Passageiro
          </Button>
        </div>

        {/* === ITINERÁRIO === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">🗺 Roteiro do Cruzeiro</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="space-y-2">
          {itinerary.map((stop, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="flex-1 text-sm">
                <span className="font-medium">{stop.date ? `${stop.date} – ` : ''}{stop.port}</span>
                <span className="text-muted-foreground"> ({stop.stop_type === 'embarque' ? 'Embarque' : stop.stop_type === 'navegacao' ? 'Navegação' : stop.stop_type === 'desembarque' ? 'Desembarque' : 'Parada'})</span>
                {stop.arrival_time && <span className="text-muted-foreground"> {stop.arrival_time}</span>}
                {stop.departure_time && <span className="text-muted-foreground"> – {stop.departure_time}</span>}
                {stop.notes && <span className="text-muted-foreground italic"> • {stop.notes}</span>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItinerary(itinerary.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-4">
            <Input type="date" placeholder="Data" value={itDate} onChange={(e) => setItDate(e.target.value)} />
            <Input placeholder="Porto / Local *" value={itPort} onChange={(e) => setItPort(e.target.value)} />
            <Input type="time" placeholder="Chegada" value={itArrival} onChange={(e) => setItArrival(e.target.value)} />
            <Input type="time" placeholder="Saída" value={itDeparture} onChange={(e) => setItDeparture(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={itType} onValueChange={setItType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="embarque">Embarque</SelectItem>
                <SelectItem value="navegacao">Navegação</SelectItem>
                <SelectItem value="parada">Parada</SelectItem>
                <SelectItem value="desembarque">Desembarque</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Observações da parada" value={itNotes} onChange={(e) => setItNotes(e.target.value)} />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItineraryStop}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Parada
          </Button>
        </div>

        {/* === CHECK-IN === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">✅ Check-in Online</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="checkin_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Link do Check-in</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="checkin_deadline" render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo Limite</FormLabel>
              <FormControl><Input placeholder="48h antes do embarque" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* === ORIENTAÇÕES DE EMBARQUE === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚠️ Orientações de Embarque</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="boarding_terminal" render={({ field }) => (
            <FormItem>
              <FormLabel>Terminal de Embarque</FormLabel>
              <FormControl><Input placeholder="Terminal Marítimo de Santos" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="port_address" render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço do Porto</FormLabel>
              <FormControl><Input placeholder="Av. Portuária, 123..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="port_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps do Porto</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="recommended_arrival" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário Recomendado de Chegada</FormLabel>
              <FormControl><Input placeholder="3 horas antes do embarque" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="required_documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Documentos Obrigatórios</FormLabel>
            <FormControl><Textarea placeholder="Passaporte válido, visto, certidão de nascimento..." rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="baggage_policy" render={({ field }) => (
            <FormItem>
              <FormLabel>Política de Bagagem</FormLabel>
              <FormControl><Input placeholder="Máximo 2 malas por pessoa..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dress_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Dress Code</FormLabel>
              <FormControl><Input placeholder="Traje social nas noites de gala..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="company_rules" render={({ field }) => (
          <FormItem>
            <FormLabel>Regras Importantes da Companhia</FormLabel>
            <FormControl><Textarea placeholder="Regras sobre bebidas, política de cancelamento..." rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações Gerais</FormLabel>
            <FormControl><Textarea placeholder="Informações adicionais para o passageiro..." rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* === DADOS OPERACIONAIS === */}
        <div className="space-y-1 pt-2">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">⚡ Dados Operacionais do Navio</h4>
          <div className="h-px bg-border" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="onboard_currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Moeda a Bordo</FormLabel>
              <FormControl><Input placeholder="Dólar americano" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="onboard_language" render={({ field }) => (
            <FormItem>
              <FormLabel>Idioma Principal</FormLabel>
              <FormControl><Input placeholder="Inglês, Português..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="voltage" render={({ field }) => (
            <FormItem>
              <FormLabel>Voltagem</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="110v">110V</SelectItem>
                  <SelectItem value="220v">220V</SelectItem>
                  <SelectItem value="bivolt">Bivolt</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ship_website" render={({ field }) => (
            <FormItem>
              <FormLabel>Site Oficial do Navio</FormLabel>
              <FormControl><Input placeholder="https://www.msccruises.com.br/" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <VoucherUpload file={file} setFile={setFile} label="Voucher / Boarding Pass / Confirmação" />

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

// Train Form
const trainSchema = z.object({
  origin_city: z.string().min(2, "Cidade de origem é obrigatória"),
  origin_station: z.string().optional(),
  destination_city: z.string().min(2, "Cidade de destino é obrigatória"),
  destination_station: z.string().optional(),
  travel_date: z.date({ required_error: "Data da viagem é obrigatória" }),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  train_company: z.string().optional(),
  train_number: z.string().optional(),
  travel_class: z.string().optional(),
  coach: z.string().optional(),
  seat: z.string().optional(),
  platform: z.string().optional(),
  boarding_notes: z.string().optional(),
  origin_maps_url: z.string().optional(),
  destination_maps_url: z.string().optional(),
});

function TrainForm({ onSubmit, onCancel, isLoading, defaultValues, isEditing }: Omit<TripServiceFormProps, "serviceType">) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const [file, setFile] = useState<File | null>(null);
  const [passengers, setPassengers] = useState<{ name: string; notes?: string }[]>(
    defaultValues?.passengers || []
  );
  const [newPassengerName, setNewPassengerName] = useState("");

  const form = useForm<z.infer<typeof trainSchema>>({
    resolver: zodResolver(trainSchema),
    defaultValues: {
      origin_city: defaultValues?.origin_city || "",
      origin_station: defaultValues?.origin_station || "",
      destination_city: defaultValues?.destination_city || "",
      destination_station: defaultValues?.destination_station || "",
      departure_time: defaultValues?.departure_time || "",
      arrival_time: defaultValues?.arrival_time || "",
      train_company: defaultValues?.train_company || "",
      train_number: defaultValues?.train_number || "",
      travel_class: defaultValues?.travel_class || "",
      coach: defaultValues?.coach || "",
      seat: defaultValues?.seat || "",
      platform: defaultValues?.platform || "",
      boarding_notes: defaultValues?.boarding_notes || "",
      origin_maps_url: defaultValues?.origin_maps_url || "",
      destination_maps_url: defaultValues?.destination_maps_url || "",
      ...(defaultValues?.travel_date ? { travel_date: parseLocal(defaultValues.travel_date) } : {}),
    },
  });

  const addPassenger = () => {
    if (!newPassengerName.trim()) return;
    setPassengers([...passengers, { name: newPassengerName.trim() }]);
    setNewPassengerName("");
  };

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handleSubmit = (values: z.infer<typeof trainSchema>) => {
    onSubmit(
      {
        origin_city: values.origin_city,
        origin_station: values.origin_station || "",
        destination_city: values.destination_city,
        destination_station: values.destination_station || "",
        travel_date: format(values.travel_date, "yyyy-MM-dd"),
        departure_time: values.departure_time || "",
        arrival_time: values.arrival_time || "",
        train_company: values.train_company || "",
        train_number: values.train_number || "",
        travel_class: values.travel_class || "",
        coach: values.coach || "",
        seat: values.seat || "",
        platform: values.platform || "",
        passengers,
        boarding_notes: values.boarding_notes || "",
        origin_maps_url: values.origin_maps_url || "",
        destination_maps_url: values.destination_maps_url || "",
      },
      file || undefined
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Origin / Destination */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Origem *</FormLabel>
              <FormControl><Input placeholder="Paris" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade de Destino *</FormLabel>
              <FormControl><Input placeholder="Londres" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_station" render={({ field }) => (
            <FormItem>
              <FormLabel>Estação de Embarque</FormLabel>
              <FormControl><Input placeholder="Gare du Nord" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_station" render={({ field }) => (
            <FormItem>
              <FormLabel>Estação de Desembarque</FormLabel>
              <FormControl><Input placeholder="St Pancras International" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Date & Times */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="travel_date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data da Viagem *</FormLabel>
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
          <FormField control={form.control} name="departure_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Partida</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="arrival_time" render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Chegada</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Train Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="train_company" render={({ field }) => (
            <FormItem>
              <FormLabel>Companhia Ferroviária</FormLabel>
              <FormControl><Input placeholder="Eurostar, SNCF, Trenitalia..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="train_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Trem</FormLabel>
              <FormControl><Input placeholder="ES 9024" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <FormField control={form.control} name="travel_class" render={({ field }) => (
            <FormItem>
              <FormLabel>Classe</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first_class">First Class</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="coach" render={({ field }) => (
            <FormItem>
              <FormLabel>Vagão</FormLabel>
              <FormControl><Input placeholder="12" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="seat" render={({ field }) => (
            <FormItem>
              <FormLabel>Assento</FormLabel>
              <FormControl><Input placeholder="45A" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="platform" render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <FormControl><Input placeholder="3" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Passageiros</label>
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span className="text-sm flex-1">{p.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePassenger(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do passageiro"
              value={newPassengerName}
              onChange={(e) => setNewPassengerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPassenger(); } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addPassenger}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Boarding Notes */}
        <FormField control={form.control} name="boarding_notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Orientações de Embarque</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Horário recomendado de chegada, como validar o bilhete, regras de bagagem..." 
                rows={3} 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Maps URLs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="origin_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps - Estação Embarque</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destination_maps_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Google Maps - Estação Desembarque</FormLabel>
              <FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <VoucherUpload file={file} setFile={setFile} label="Bilhete/Voucher/QR Code" />

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
    case "train": return <TrainForm {...props} />;
    case "other": return <OtherForm {...props} />;
    default: return null;
  }
}
