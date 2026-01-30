import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Instagram, Film, MessageCircle } from 'lucide-react';
import { ContentType, CONTENT_TYPE_LABELS } from '@/hooks/useGeneratedContent';

interface ContentTypeSelectorProps {
  selected: ContentType | null;
  onSelect: (type: ContentType) => void;
}

const contentTypeConfig: Record<ContentType, {
  icon: React.ReactNode;
  description: string;
  example: string;
}> = {
  social_caption: {
    icon: <Instagram className="h-5 w-5" />,
    description: 'Legenda estratégica usando técnica AIDA para maximizar engajamento',
    example: '"✨ Desperte em Paris com croissants frescos..." + hashtags',
  },
  stories_intro: {
    icon: <Film className="h-5 w-5" />,
    description: 'Texto natural para você falar nos Stories antes de postar a lâmina',
    example: '"Gente, olha o que acabou de chegar aqui pra vocês..."',
  },
  whatsapp_pitch: {
    icon: <MessageCircle className="h-5 w-5" />,
    description: 'Pitch direto e acolhedor para iniciar conversas de venda',
    example: '"Oi! 😊 Vi que você tem interesse em Maldivas..."',
  },
};

export function ContentTypeSelector({ selected, onSelect }: ContentTypeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(Object.keys(contentTypeConfig) as ContentType[]).map((type) => {
        const config = contentTypeConfig[type];
        const isSelected = selected === type;
        
        return (
          <Card
            key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected 
                ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border hover:border-primary/50'
            }`}
            onClick={() => onSelect(type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {config.icon}
                </div>
                {isSelected && (
                  <Badge variant="default" className="bg-primary">
                    <Check className="h-3 w-3 mr-1" />
                    Selecionado
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-sm mb-1">
                {CONTENT_TYPE_LABELS[type]}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                {config.description}
              </p>
              <p className="text-xs italic text-muted-foreground/80 border-l-2 border-primary/30 pl-2">
                {config.example}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}