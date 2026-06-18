export interface SignatureSnapshot {
  id: string | null;
  name: string;
  title?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  photo_url?: string | null;
  custom_message?: string | null;
  updated_at?: string | null;
}

export interface CommercialSignature {
  id: string;
  user_id: string;
  name: string;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  photo_url: string | null;
  custom_message: string | null;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}