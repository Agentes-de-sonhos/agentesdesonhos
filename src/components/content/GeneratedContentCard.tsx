import { useState } from 'react';
import { Copy, Check, Trash2, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { GeneratedContent, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS } from '@/hooks/useGeneratedContent';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface GeneratedContentCardProps {
  content: GeneratedContent;
  onDelete: (id: string) => void;
}

export function GeneratedContentCard({ content, onDelete }: GeneratedContentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.generated_text);
    setCopied(true);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{CONTENT_TYPE_ICONS[content.content_type]}</span>
            <div>
              <Badge variant="secondary" className="text-xs">
                {CONTENT_TYPE_LABELS[content.content_type]}
              </Badge>
              {content.detected_destination && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {content.detected_destination}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(content.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {content.generated_text}
        </p>
        
        {content.detected_benefits && content.detected_benefits.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {content.detected_benefits.map((benefit, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {benefit}
              </Badge>
            ))}
          </div>
        )}
        
        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
          <Calendar className="h-3 w-3" />
          {format(new Date(content.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}