import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ContentRequest {
  imageBase64?: string;
  imageUrl?: string;
  contentType: 'social_caption' | 'stories_intro' | 'whatsapp_pitch';
}

const CONTENT_PROMPTS = {
  social_caption: `Você é um especialista em marketing de turismo. Analise esta lâmina de divulgação de viagem e crie uma LEGENDA ESTRATÉGICA para redes sociais usando a técnica AIDA:

- **Atenção**: Uma frase impactante que pare o scroll
- **Interesse**: Destaque os benefícios únicos do destino/pacote
- **Desejo**: Desperte emoções e crie vontade de viver a experiência
- **Ação**: Chamada para ação natural e convidativa

REGRAS:
- Use linguagem humana, calorosa e inspiradora
- Inclua 3-5 hashtags relevantes no final
- Use emojis de forma equilibrada
- Máximo 280 caracteres no texto principal (sem hashtags)
- Foque na experiência e emoção, não em preços
- Evite tom comercial frio

Retorne um JSON com:
{
  "destination": "destino identificado",
  "benefits": ["benefício 1", "benefício 2"],
  "info": { "dates": "", "price_range": "", "inclusions": [] },
  "content": "a legenda gerada"
}`,

  stories_intro: `Você é um especialista em comunicação para redes sociais. Analise esta lâmina de divulgação de viagem e crie um TEXTO CURTO para o agente falar nos Stories ANTES de postar a lâmina.

O texto deve ser:
- Falado naturalmente, como se estivesse conversando com um amigo
- Inspirador e envolvente
- Criar curiosidade sobre o que vem a seguir (a lâmina)
- Máximo 3-4 frases curtas
- Tom pessoal e autêntico

EXEMPLO de tom desejado:
"Gente, olha só o que acabou de chegar aqui pra vocês! Se você sonha com [destino], precisa ver isso. Desliza que vou mostrar tudinho..."

Retorne um JSON com:
{
  "destination": "destino identificado",
  "benefits": ["benefício 1", "benefício 2"],
  "info": { "dates": "", "price_range": "", "inclusions": [] },
  "content": "o texto para stories"
}`,

  whatsapp_pitch: `Você é um especialista em vendas de turismo. Analise esta lâmina de divulgação de viagem e crie um PITCH DE VENDAS RÁPIDO para WhatsApp ou Direct.

O texto deve:
- Ser direto mas acolhedor
- Criar urgência sutil sem ser agressivo
- Destacar o valor e a experiência
- Incluir uma pergunta que incentive resposta
- Máximo 4-5 linhas
- Usar emojis de forma moderada

EXEMPLO de tom:
"Oi! 😊 Vi que você tem interesse em [destino]! Acabou de sair um pacote incrível com [benefício principal]. Condições especiais só essa semana. Posso te contar mais?"

Retorne um JSON com:
{
  "destination": "destino identificado",
  "benefits": ["benefício 1", "benefício 2"],
  "info": { "dates": "", "price_range": "", "inclusions": [] },
  "content": "o pitch de vendas"
}`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Faça login para usar esta funcionalidade.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { imageBase64, imageUrl, contentType } = await req.json() as ContentRequest;

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'É necessário enviar uma imagem (base64 ou URL)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contentType || !CONTENT_PROMPTS[contentType]) {
      return new Response(
        JSON.stringify({ error: 'Tipo de conteúdo inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = CONTENT_PROMPTS[contentType];

    // Build content array with image
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    
    if (imageBase64) {
      // Detect mime type from base64 header or default to image/jpeg
      let mimeType = 'image/jpeg';
      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      }
      
      const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;
      
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64Data}` }
      });
    } else if (imageUrl) {
      userContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    userContent.push({
      type: 'text',
      text: 'Analise esta lâmina de divulgação e gere o conteúdo solicitado. Retorne APENAS o JSON, sem markdown ou explicações.'
    });

    console.log('Calling Lovable AI with vision model...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const rawContent = aiResponse.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('Raw AI response:', rawContent);

    // Parse JSON from response (handle potential markdown wrapping)
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      parsedContent = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // If parsing fails, try to extract content manually
      parsedContent = {
        destination: 'Não identificado',
        benefits: [],
        info: {},
        content: rawContent
      };
    }

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate content error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});