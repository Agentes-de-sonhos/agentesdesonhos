
-- ============================================
-- TOUR GUIDES — Sistema completo de cadastro
-- ============================================

-- 1. Tabela principal de guias
CREATE TABLE public.tour_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,

  -- Seção 1: Básicas
  full_name TEXT NOT NULL,
  professional_name TEXT,
  photo_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'Brasil',
  regions TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Seção 2: Idiomas (estruturado: [{code, level}])
  languages JSONB DEFAULT '[]'::jsonb,

  -- Seção 3: Especialidades
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Seção 4: Serviços
  services TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Seção 5: Sobre
  bio TEXT,
  differentials TEXT,

  -- Seção 6: Certificações (lista livre)
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Seção 7: Galeria (URLs no bucket tour-guides-gallery)
  gallery_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Seção 8: Contato
  whatsapp TEXT NOT NULL,
  email TEXT,
  instagram TEXT,
  website TEXT,

  -- Seção 9: Plano (interno, futuro)
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','premium')),

  -- Premium prep (estrutura sem implementação ativa)
  is_featured BOOLEAN DEFAULT false,
  search_priority INT DEFAULT 0,
  max_gallery_photos INT DEFAULT 20,
  video_url TEXT,

  -- Status / verificação
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tour_guides_status ON public.tour_guides(status);
CREATE INDEX idx_tour_guides_user_id ON public.tour_guides(user_id);
CREATE INDEX idx_tour_guides_city ON public.tour_guides(city);
CREATE INDEX idx_tour_guides_languages ON public.tour_guides USING GIN(languages);
CREATE INDEX idx_tour_guides_specialties ON public.tour_guides USING GIN(specialties);

-- updated_at trigger
CREATE TRIGGER trg_tour_guides_updated_at
BEFORE UPDATE ON public.tour_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.tour_guides ENABLE ROW LEVEL SECURITY;

-- Público vê apenas aprovados
CREATE POLICY "Public can view approved guides"
ON public.tour_guides FOR SELECT
USING (status = 'approved');

-- Guia vê o próprio (qualquer status)
CREATE POLICY "Guide can view own"
ON public.tour_guides FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Guia atualiza o próprio (não pode mudar status/is_verified/rejection_reason/plan_type)
CREATE POLICY "Guide can update own"
ON public.tour_guides FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin: tudo
CREATE POLICY "Admin all"
ON public.tour_guides FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert: usuário autenticado pode criar próprio registro (status sempre pending)
CREATE POLICY "User can insert own guide profile"
ON public.tour_guides FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Trigger pra impedir guia de auto-aprovar / mudar campos sensíveis
CREATE OR REPLACE FUNCTION public.protect_tour_guide_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin pode tudo
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Usuário comum: trava campos administrativos
  NEW.status := OLD.status;
  NEW.is_verified := OLD.is_verified;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.plan_type := OLD.plan_type;
  NEW.is_featured := OLD.is_featured;
  NEW.search_priority := OLD.search_priority;
  NEW.max_gallery_photos := OLD.max_gallery_photos;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_tour_guide_admin_fields
BEFORE UPDATE ON public.tour_guides
FOR EACH ROW
EXECUTE FUNCTION public.protect_tour_guide_admin_fields();

-- ============================================
-- RPC pra exibir guia público com perfil
-- ============================================
CREATE OR REPLACE FUNCTION public.get_public_tour_guide(_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guide_record RECORD;
BEGIN
  SELECT * INTO guide_record FROM public.tour_guides
  WHERE id = _id AND status = 'approved';

  IF guide_record IS NULL THEN
    RETURN json_build_object('error','Guia não encontrado');
  END IF;

  RETURN row_to_json(guide_record);
END;
$$;

-- ============================================
-- Storage bucket pra galeria
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-guides-gallery', 'tour-guides-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read tour guides gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-guides-gallery');

-- Authenticated upload (folder = user_id)
CREATE POLICY "Auth upload own tour guide files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tour-guides-gallery'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth update own tour guide files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tour-guides-gallery'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth delete own tour guide files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tour-guides-gallery'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin pode tudo no bucket
CREATE POLICY "Admin manage tour guide files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'tour-guides-gallery' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'tour-guides-gallery' AND public.has_role(auth.uid(),'admin'));
