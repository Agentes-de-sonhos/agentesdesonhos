export type Lang = "pt" | "en" | "es";

const translations: Record<Lang, Record<string, string>> = {
  pt: {
    page_title: "Cadastro de Empresa",
    page_subtitle: "Crie sua conta para gerenciar o perfil da sua empresa no Mapa do Turismo",
    company_name: "Nome da Empresa",
    company_name_placeholder: "Ex: Operadora XYZ Turismo",
    category: "Categoria",
    category_placeholder: "Selecione a categoria",
    responsible_name: "Nome do Responsável",
    responsible_name_placeholder: "Nome completo",
    phone: "Telefone / WhatsApp",
    phone_placeholder: "(11) 99999-9999",
    email: "E-mail de Acesso",
    email_placeholder: "email@empresa.com",
    password: "Senha",
    password_placeholder: "Mínimo 6 caracteres",
    password_confirm: "Confirmar Senha",
    password_confirm_placeholder: "Repita a senha",
    submit: "Criar Conta",
    already_have_account: "Já tem uma conta?",
    login: "Faça login",
    required: "*",
    err_required: "Preencha todos os campos obrigatórios.",
    err_password_length: "A senha deve ter pelo menos 6 caracteres.",
    err_password_mismatch: "As senhas não coincidem.",
    err_generic: "Erro ao processar solicitação.",
    err_create: "Erro ao criar conta.",
    success_created: "Conta criada! Faça login com suas credenciais.",
    success_submitted: "Cadastro enviado com sucesso! Seu perfil está em análise e será publicado após aprovação da nossa equipe.",
    // categories
    cat_operadoras: "Operadoras de turismo",
    cat_consolidadoras: "Consolidadoras",
    cat_companhias: "Companhias aéreas",
    cat_hospedagem: "Hospedagem",
    cat_locadoras: "Locadoras de veículos",
    cat_cruzeiros: "Cruzeiros",
    cat_seguros: "Seguros viagem",
    cat_parques: "Parques e atrações",
    cat_receptivos: "Receptivos",
    cat_guias: "Guias",
  },
  en: {
    page_title: "Company Registration",
    page_subtitle: "Create your account to manage your company profile on the Tourism Map",
    company_name: "Company Name",
    company_name_placeholder: "E.g.: XYZ Tourism Operator",
    category: "Category",
    category_placeholder: "Select category",
    responsible_name: "Contact Person",
    responsible_name_placeholder: "Full name",
    phone: "Phone / WhatsApp",
    phone_placeholder: "+1 (555) 123-4567",
    email: "Login Email",
    email_placeholder: "email@company.com",
    password: "Password",
    password_placeholder: "Minimum 6 characters",
    password_confirm: "Confirm Password",
    password_confirm_placeholder: "Repeat password",
    submit: "Create Account",
    already_have_account: "Already have an account?",
    login: "Sign in",
    required: "*",
    err_required: "Please fill in all required fields.",
    err_password_length: "Password must be at least 6 characters.",
    err_password_mismatch: "Passwords do not match.",
    err_generic: "Error processing request.",
    err_create: "Error creating account.",
    success_created: "Account created! Sign in with your credentials.",
    success_submitted: "Registration submitted! Your profile is under review and will be published after approval.",
    cat_operadoras: "Tour operators",
    cat_consolidadoras: "Consolidators",
    cat_companhias: "Airlines",
    cat_hospedagem: "Accommodation",
    cat_locadoras: "Car rentals",
    cat_cruzeiros: "Cruises",
    cat_seguros: "Travel insurance",
    cat_parques: "Parks & attractions",
    cat_receptivos: "Destination services",
    cat_guias: "Guides",
  },
  es: {
    page_title: "Registro de Empresa",
    page_subtitle: "Crea tu cuenta para gestionar el perfil de tu empresa en el Mapa del Turismo",
    company_name: "Nombre de la Empresa",
    company_name_placeholder: "Ej: Operadora XYZ Turismo",
    category: "Categoría",
    category_placeholder: "Seleccione la categoría",
    responsible_name: "Nombre del Responsable",
    responsible_name_placeholder: "Nombre completo",
    phone: "Teléfono / WhatsApp",
    phone_placeholder: "+34 612 345 678",
    email: "Correo de Acceso",
    email_placeholder: "correo@empresa.com",
    password: "Contraseña",
    password_placeholder: "Mínimo 6 caracteres",
    password_confirm: "Confirmar Contraseña",
    password_confirm_placeholder: "Repita la contraseña",
    submit: "Crear Cuenta",
    already_have_account: "¿Ya tienes una cuenta?",
    login: "Inicia sesión",
    required: "*",
    err_required: "Complete todos los campos obligatorios.",
    err_password_length: "La contraseña debe tener al menos 6 caracteres.",
    err_password_mismatch: "Las contraseñas no coinciden.",
    err_generic: "Error al procesar la solicitud.",
    err_create: "Error al crear la cuenta.",
    success_created: "¡Cuenta creada! Inicia sesión con tus credenciales.",
    success_submitted: "¡Registro enviado! Tu perfil está en revisión y será publicado tras la aprobación de nuestro equipo.",
    cat_operadoras: "Operadores turísticos",
    cat_consolidadoras: "Consolidadoras",
    cat_companhias: "Aerolíneas",
    cat_hospedagem: "Alojamiento",
    cat_locadoras: "Alquiler de vehículos",
    cat_cruzeiros: "Cruceros",
    cat_seguros: "Seguros de viaje",
    cat_parques: "Parques y atracciones",
    cat_receptivos: "Receptivos",
    cat_guias: "Guías",
  },
};

/** Category keys in display order — the value stored in DB is always the Portuguese label */
export const CATEGORY_KEYS = [
  "cat_operadoras",
  "cat_consolidadoras",
  "cat_companhias",
  "cat_hospedagem",
  "cat_locadoras",
  "cat_cruzeiros",
  "cat_seguros",
  "cat_parques",
  "cat_receptivos",
  "cat_guias",
] as const;

/** Maps a category key to its Portuguese DB value */
export const CATEGORY_DB_VALUES: Record<string, string> = {
  cat_operadoras: "Operadoras de turismo",
  cat_consolidadoras: "Consolidadoras",
  cat_companhias: "Companhias aéreas",
  cat_hospedagem: "Hospedagem",
  cat_locadoras: "Locadoras de veículos",
  cat_cruzeiros: "Cruzeiros",
  cat_seguros: "Seguros viagem",
  cat_parques: "Parques e atrações",
  cat_receptivos: "Receptivos",
  cat_guias: "Guias",
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.pt[key] ?? key;
}

const LANG_KEY = "supplier_reg_lang";

export function getStoredLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "es" || v === "pt") return v;
  } catch {}
  return "pt";
}

export function setStoredLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}
