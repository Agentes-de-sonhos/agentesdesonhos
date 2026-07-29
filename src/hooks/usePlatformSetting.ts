import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Configuração central da plataforma (tabela platform_settings, gerida pelo admin). */
export function usePlatformSetting<T = Record<string, unknown>>(key: string, fallback: T) {
  const query = useQuery({
    queryKey: ['platform-setting', key],
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase.from('platform_settings') as any)
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as T | null;
    },
  });
  return { value: (query.data ?? fallback) as T, isLoading: query.isLoading };
}

export function useSupportWhatsApp() {
  const { value } = usePlatformSetting<{ number: string }>('support_whatsapp', { number: '' });
  return value.number || '';
}
