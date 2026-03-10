import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Image, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Save,
  History,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { ContentUploader } from '@/components/content/ContentUploader';
import { ContentTypeSelector } from '@/components/content/ContentTypeSelector';
import { GeneratedContentCard } from '@/components/content/GeneratedContentCard';
import { 
  useGeneratedContent, 
  ContentType, 
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS 
} from '@/hooks/useGeneratedContent';
import { toast } from 'sonner';

export default function CriarConteudo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    content: string;
    destination?: string;
    benefits?: string[];
    info?: Record<string, unknown>;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { 
    savedContent, 
    isLoadingContent, 
    isGenerating, 
    generateContent, 
    saveContent,
    deleteContent,
    isSaving 
  } = useGeneratedContent();

  const handleFileSelected = (file: File, base64: string) => {
    setSelectedFile(file);
    setFileBase64(base64);
    setGeneratedResult(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setGeneratedResult(null);
  };

  const handleGenerate = async () => {
    if (!fileBase64 || !selectedType) {
      toast.error('Selecione uma lâmina e um tipo de conteúdo');
      return;
    }

    try {
      const result = await generateContent({
        imageBase64: fileBase64,
        contentType: selectedType,
        fileName: selectedFile?.name,
      });

      setGeneratedResult({
        content: result.content,
        destination: result.destination,
        benefits: result.benefits,
        info: result.info,
      });
      
      toast.success('Conteúdo gerado com sucesso!');
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar conteúdo');
    }
  };

  const handleSave = () => {
    if (!generatedResult || !selectedType) return;

    saveContent({
      contentType: selectedType,
      generatedText: generatedResult.content,
      fileName: selectedFile?.name,
      destination: generatedResult.destination,
      benefits: generatedResult.benefits,
      info: generatedResult.info,
    });
  };

  const handleCopy = async () => {
    if (!generatedResult) return;
    await navigator.clipboard.writeText(generatedResult.content);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = selectedFile && selectedType && !isGenerating;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="criar-conteudo"
          title="Criar Conteúdo"
          subtitle="Transforme lâminas em textos persuasivos para suas redes"
          icon={Image}
        />

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Criar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
              {savedContent && savedContent.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {savedContent.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {/* Step 1: Upload */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-6 w-6 p-0 justify-center rounded-full">
                    1
                  </Badge>
                  <CardTitle className="text-lg">Upload da Lâmina</CardTitle>
                </div>
                <CardDescription>
                  Envie a imagem ou PDF da lâmina do pacote de viagem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentUploader
                  onFileSelected={handleFileSelected}
                  selectedFile={selectedFile}
                  onClear={handleClear}
                />
              </CardContent>
            </Card>

            {/* Step 2: Select Type */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-6 w-6 p-0 justify-center rounded-full">
                    2
                  </Badge>
                  <CardTitle className="text-lg">Tipo de Conteúdo</CardTitle>
                </div>
                <CardDescription>
                  Escolha o formato do texto que deseja gerar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentTypeSelector
                  selected={selectedType}
                  onSelect={setSelectedType}
                />
              </CardContent>
            </Card>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button 
                size="lg" 
                disabled={!canGenerate}
                onClick={handleGenerate}
                className="gap-2 px-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analisando lâmina...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Gerar Conteúdo com IA
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Step 3: Generated Result */}
            {generatedResult && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-6 w-6 p-0 justify-center rounded-full">
                        3
                      </Badge>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">
                          {selectedType && CONTENT_TYPE_ICONS[selectedType]}
                        </span>
                        Conteúdo Gerado
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <Check className="h-4 w-4 mr-1 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        Copiar
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                  {generatedResult.destination && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4" />
                      Destino identificado: <strong>{generatedResult.destination}</strong>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4 border">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {generatedResult.content}
                    </p>
                  </div>
                  
                  {generatedResult.benefits && generatedResult.benefits.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Benefícios identificados:</p>
                      <div className="flex flex-wrap gap-2">
                        {generatedResult.benefits.map((benefit, i) => (
                          <Badge key={i} variant="secondary">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="my-4" />
                  
                  <p className="text-xs text-muted-foreground text-center">
                    💡 Dica: Revise e personalize o texto antes de publicar
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdos Salvos</CardTitle>
                <CardDescription>
                  Acesse e reutilize conteúdos gerados anteriormente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingContent ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : savedContent && savedContent.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {savedContent.map((content) => (
                      <GeneratedContentCard
                        key={content.id}
                        content={content}
                        onDelete={deleteContent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum conteúdo salvo ainda</p>
                    <p className="text-sm">Os conteúdos que você salvar aparecerão aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}