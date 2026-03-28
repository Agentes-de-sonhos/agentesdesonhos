import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, Upload, ArrowLeft, ArrowRight, Check, User, Building2, MapPin, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isValidCPF, isValidCNPJ, formatCPF, formatCNPJ, formatPhone, formatCEP } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Step 1: Login info
const step1Schema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string()
    .min(8, { message: "Senha deve ter no mínimo 8 caracteres" })
    .regex(/[a-zA-Z]/, { message: "Senha deve conter pelo menos 1 letra" })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos 1 número" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Step 2: Personal data
const step2Schema = z.object({
  name: z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }).max(100),
  phone: z.string().min(14, { message: "Telefone inválido" }),
  cpf: z.string().refine((val) => isValidCPF(val), { message: "CPF inválido" }),
});

// Step 3: Agency data
const step3Schema = z.object({
  agency_name: z.string().trim().min(2, { message: "Nome da agência é obrigatório" }).max(100),
  cnpj: z.string().refine((val) => isValidCNPJ(val), { message: "CNPJ inválido" }),
  street: z.string().trim().min(2, { message: "Rua é obrigatória" }),
  address_number: z.string().trim().min(1, { message: "Número é obrigatório" }),
  neighborhood: z.string().trim().min(2, { message: "Bairro é obrigatório" }),
  city: z.string().trim().min(2, { message: "Cidade é obrigatória" }),
  state: z.string().length(2, { message: "Estado deve ter 2 caracteres" }),
  zip_code: z.string().min(9, { message: "CEP inválido" }),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

interface MultiStepSignupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const steps = [
  { id: 1, title: "Acesso", icon: User },
  { id: 2, title: "Dados Pessoais", icon: User },
  { id: 3, title: "Agência", icon: Building2 },
  { id: 4, title: "Revisão", icon: Check },
];

export function MultiStepSignup({ onComplete, onCancel }: MultiStepSignupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [termsError, setTermsError] = useState(false);
  
  const { toast } = useToast();

  const handleFinalSubmitWithTerms = () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    handleFinalSubmit();
  };

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { name: "", phone: "", cpf: "" },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: { 
      agency_name: "", cnpj: "", street: "", address_number: "", 
      neighborhood: "", city: "", state: "", zip_code: "" 
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep3Submit = (data: Step3Data) => {
    setStep3Data(data);
    setCurrentStep(4);
  };

  const uploadFile = async (file: File, bucket: string, userId: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFinalSubmit = async () => {
    if (!step1Data || !step2Data || !step3Data) return;
    
    setIsLoading(true);
    
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: step1Data.email,
        password: step1Data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: step2Data.name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          toast({
            variant: "destructive",
            title: "Email já cadastrado",
            description: "Este email já está em uso. Tente fazer login.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro no cadastro",
            description: authError.message,
          });
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível criar a conta.",
        });
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2. Upload files if provided
      let avatarUrl: string | null = null;
      let logoUrl: string | null = null;

      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile, "avatars", userId);
      }
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, "avatars", userId);
      }

      // 3. Create profile with all data
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: userId,
        name: step2Data.name,
        phone: step2Data.phone.replace(/\D/g, ""),
        cpf: step2Data.cpf.replace(/\D/g, ""),
        agency_name: step3Data.agency_name,
        cnpj: step3Data.cnpj.replace(/\D/g, ""),
        street: step3Data.street,
        address_number: step3Data.address_number,
        neighborhood: step3Data.neighborhood,
        city: step3Data.city,
        state: step3Data.state.toUpperCase(),
        zip_code: step3Data.zip_code.replace(/\D/g, ""),
        avatar_url: avatarUrl,
        agency_logo_url: logoUrl,
        has_password: true,
      }, { onConflict: 'user_id' });

      if (profileError) {
        console.error("Profile error:", profileError);
        // Profile will be created by trigger, continue anyway
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar o cadastro.",
      });

      onComplete();
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao criar a conta.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  currentStep >= step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-2 h-0.5 w-8 sm:w-12 ${
                currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Login Info */}
      {currentStep === 1 && (
        <Form {...step1Form}>
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
            <FormField
              control={step1Form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={step1Form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={step1Form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Step 2: Personal Data */}
      {currentStep === 2 && (
        <Form {...step2Form}>
          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback className="bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <Label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4" />
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-4">Foto de perfil (opcional)</p>

            <FormField
              control={step2Form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={step2Form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone / WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(00) 00000-0000"
                      {...field}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={step2Form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      {...field}
                      onChange={(e) => field.onChange(formatCPF(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button type="submit" className="flex-1">
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Step 3: Agency Data */}
      {currentStep === 3 && (
        <Form {...step3Form}>
          <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
            {/* Logo Upload */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <Label
                  htmlFor="logo-upload"
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4" />
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-4">Logo da agência (opcional)</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={step3Form.control}
                name="agency_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome da Agência</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da sua agência" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00.000.000/0000-00"
                        {...field}
                        onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        onChange={(e) => field.onChange(formatCEP(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UF"
                        maxLength={2}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da rua" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={step3Form.control}
                name="address_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button type="submit" className="flex-1">
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && step1Data && step2Data && step3Data && (
        <div className="space-y-6">
          <div className="flex justify-center gap-6">
            {avatarPreview && (
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarImage src={avatarPreview} />
                </Avatar>
                <p className="text-xs text-muted-foreground mt-1">Foto</p>
              </div>
            )}
            {logoPreview && (
              <div className="text-center">
                <div className="h-16 w-16 mx-auto rounded-lg border overflow-hidden bg-white">
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Logo</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Dados de Acesso
              </h4>
              <p className="text-sm text-muted-foreground">{step1Data.email}</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Dados Pessoais
              </h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Nome:</span> {step2Data.name}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {step2Data.phone}</p>
                <p><span className="text-muted-foreground">CPF:</span> {step2Data.cpf}</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Dados da Agência
              </h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Agência:</span> {step3Data.agency_name}</p>
                <p><span className="text-muted-foreground">CNPJ:</span> {step3Data.cnpj}</p>
                <p className="flex items-start gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>
                    {step3Data.street}, {step3Data.address_number} - {step3Data.neighborhood}, {step3Data.city}/{step3Data.state} - {step3Data.zip_code}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Terms & Privacy checkboxes */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept-terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <a
                  href="/termosdeuso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Termos de Uso
                </a>
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept-privacy"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="accept-privacy" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito as{" "}
                <a
                  href="/politicasdeprivacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Políticas de Privacidade
                </a>
              </label>
            </div>
            {termsError && (
              <p className="text-sm text-destructive font-medium">
                Você deve aceitar os Termos de Uso e as Políticas de Privacidade para continuar.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={goBack} className="flex-1" disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleFinalSubmitWithTerms} className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Criar Conta
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
