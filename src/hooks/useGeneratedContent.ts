import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type ContentType = 'social_caption' | 'stories_intro' | 'whatsapp_pitch';

export interface GeneratedContent {
  id: string;
  user_id: string;
  content_type: ContentType;
  original_file_url: string | null;
  original_file_name: string | null;
  detected_destination: string | null;
  detected_benefits: string[] | null;
  detected_info: Record<string, unknown> | null;
  generated_text: string;
  created_at: string;
  updated_at: string;
}

interface GenerateContentParams {
  imageBase64?: string;
  imageUrl?: string;
  contentType: ContentType;
  fileName?: string;
}

interface AIResponse {
  destination: string;
  benefits: string[];
  info: Record<string, unknown>;
  content: string;
  error?: string;
}

const parseFunctionErrorMessage = async (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Erro ao gerar conteúdo';
  }

  const errorWithContext = error as Error & {
    context?: {
      clone?: () => { json: () => Promise<unknown>; text: () => Promise<string> };
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
  };

  const context = errorWithContext.context;

  if (context) {
    try {
      const response = typeof context.clone === 'function' ? context.clone() : context;
      const body = typeof response.json === 'function'
        ? await response.json()
        : JSON.parse(await response.text?.() ?? '{}');

      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      try {
        const response = typeof context.clone === 'function' ? context.clone() : context;
        const text = await response.text?.();
        if (text) return text;
      } catch {
        // ignore parsing fallback errors
      }
    }
  }

  return error.message || 'Erro ao gerar conteúdo';
};

export function useGeneratedContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's saved content
  const { data: savedContent, isLoading: isLoadingContent } = useQuery({
    queryKey: ['generated-content', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GeneratedContent[];
    },
    enabled: !!user?.id,
  });

  // Generate content using AI
  const generateContent = async (params: GenerateContentParams): Promise<AIResponse> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          imageBase64: params.imageBase64,
          imageUrl: params.imageUrl,
          contentType: params.contentType,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(await parseFunctionErrorMessage(error));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as AIResponse;
    } finally {
      setIsGenerating(false);
    }
  };

  // Save generated content
  const saveContentMutation = useMutation({
    mutationFn: async (params: {
      contentType: ContentType;
      generatedText: string;
      fileName?: string;
      destination?: string;
      benefits?: string[];
      info?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const insertData = {
        user_id: user.id,
        content_type: params.contentType,
        generated_text: params.generatedText,
        original_file_name: params.fileName || null,
        detected_destination: params.destination || null,
        detected_benefits: params.benefits || null,
        detected_info: params.info || null,
      };

      const { data, error } = await supabase
        .from('generated_content')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
      toast.success('Conteúdo salvo com sucesso!');
    },
    onError: (error) => {
      console.error('Save content error:', error);
      toast.error('Erro ao salvar conteúdo');
    },
  });

  // Delete content
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] });
      toast.success('Conteúdo excluído');
    },
    onError: (error) => {
      console.error('Delete content error:', error);
      toast.error('Erro ao excluir conteúdo');
    },
  });

  return {
    savedContent,
    isLoadingContent,
    isGenerating,
    generateContent,
    saveContent: saveContentMutation.mutate,
    deleteContent: deleteContentMutation.mutate,
    isSaving: saveContentMutation.isPending,
  };
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  social_caption: 'Legenda para Redes Sociais (AIDA)',
  stories_intro: 'Texto para Stories',
  whatsapp_pitch: 'Pitch para WhatsApp/Direct',
};

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  social_caption: '📱',
  stories_intro: '🎬',
  whatsapp_pitch: '💬',
};