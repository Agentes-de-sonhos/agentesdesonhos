import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { generateBusinessCardPdf } from "@/lib/generateBusinessCardPdf";
import { getCardPublicUrl } from "@/lib/cardShareUrl";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBusinessCardById,
  CardButton,
  SocialLinks,
} from "@/hooks/useBusinessCard";
import { toast } from "sonner";
import {
  CreditCard,
  Copy,
  Eye,
  ExternalLink,
  FileDown,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { AdminEditButton } from "@/components/layout/AdminEditButton";
import { WizardProgressBar, WizardStep } from "@/components/card-wizard/WizardProgressBar";
import { CardPreview } from "@/components/card-wizard/CardPreview";
import { StepImages } from "@/components/card-wizard/steps/StepImages";
import { StepInfo } from "@/components/card-wizard/steps/StepInfo";
import { StepColors } from "@/components/card-wizard/steps/StepColors";
import { StepButtons } from "@/components/card-wizard/steps/StepButtons";
import {
  StepSocial,
  SOCIAL_CONFIG,
  extractUsername,
} from "@/components/card-wizard/steps/StepSocial";
import { WizardComplete } from "@/components/card-wizard/WizardComplete";

const PUBLIC_DOMAIN = "https://contato.tur.br";

const WIZARD_STEPS: WizardStep[] = [
  { key: "images", label: "Imagens" },
  { key: "info", label: "Informações" },
  { key: "colors", label: "Cores" },
  { key: "buttons", label: "Botões" },
  { key: "social", label: "Redes Sociais" },
];

function MeuCartaoEditorContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { card, isLoading, updateCard, uploadImage } = useBusinessCardById(id);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  const [form, setForm] = useState({
    name: "",
    title: "",
    agency_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    primary_color: "#0284c7",
    secondary_color: "#f97316",
  });
  const [buttons, setButtons] = useState<CardButton[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  useEffect(() => {
    if (card) {
      setForm({
        name: card.name,
        title: card.title,
        agency_name: card.agency_name,
        phone: card.phone,
        whatsapp: card.whatsapp,
        email: card.email,
        website: card.website,
        primary_color: card.primary_color,
        secondary_color: card.secondary_color,
      });
      setButtons(card.buttons);
      setSocialLinks(card.social_links);
      setLabelDraft(card.label || "");
    }
  }, [card]);

  const markStepComplete = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const buildFullSocialLinks = (): SocialLinks => {
    const fullSocialLinks: SocialLinks = {};
    for (const { key, prefix } of SOCIAL_CONFIG) {
      const username = socialLinks[key];
      if (username && username.trim()) {
        const clean = extractUsername(username, prefix);
        fullSocialLinks[key] = clean ? `${prefix}${clean}` : "";
      }
    }
    return fullSocialLinks;
  };

  const handleSaveAndNext = (nextStep?: number) => {
    const fullSocialLinks = buildFullSocialLinks();
    updateCard.mutate(
      { ...form, buttons, social_links: fullSocialLinks } as any,
      {
        onSuccess: () => {
          markStepComplete(currentStep);
          if (nextStep !== undefined) {
            setCurrentStep(nextStep);
          } else if (currentStep < WIZARD_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            setIsComplete(true);
          }
        },
      }
    );
  };

  const handleFinalize = () => {
    const fullSocialLinks = buildFullSocialLinks();
    updateCard.mutate(
      { ...form, buttons, social_links: fullSocialLinks } as any,
      {
        onSuccess: () => {
          markStepComplete(currentStep);
          setIsComplete(true);
        },
      }
    );
  };

  const saveLabel = () => {
    const next = labelDraft.trim();
    if (!next) {
      toast.error("A etiqueta não pode ficar vazia.");
      return;
    }
    if (next === card?.label) {
      setEditingLabel(false);
      return;
    }
    updateCard.mutate(
      { label: next } as any,
      {
        onSuccess: () => setEditingLabel(false),
      }
    );
  };

  const copyLink = () => {
    if (card) {
      navigator.clipboard.writeText(getCardPublicUrl(card.slug));
      toast.success("Link copiado!");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!card) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-4 text-center space-y-4">
          <Card>
            <CardContent className="py-10 space-y-4">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Cartão não encontrado</h2>
                <p className="text-sm text-muted-foreground">
                  Este cartão não existe ou pertence a outro usuário.
                </p>
              </div>
              <Button asChild>
                <Link to="/meu-cartao">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para meus cartões
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isComplete) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/meu-cartao">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Meus cartões
              </Link>
            </Button>
          </div>
          <WizardComplete
            slug={card.slug}
            onRestart={() => {
              setIsComplete(false);
              setCurrentStep(0);
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const publicUrl = `${PUBLIC_DOMAIN}/${card.slug}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back link */}
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/meu-cartao">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Meus cartões
            </Link>
          </Button>
          <AdminEditButton adminTab="business-cards" />
        </div>

        {/* Header with label */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Configurar Cartão Virtual
          </h1>

          {editingLabel ? (
            <div className="flex items-center gap-2 max-w-sm mx-auto">
              <Input
                value={labelDraft}
                maxLength={60}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="Etiqueta do cartão"
                autoFocus
              />
              <Button size="sm" onClick={saveLabel} disabled={updateCard.isPending}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLabelDraft(card.label || "");
                  setEditingLabel(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingLabel(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors group inline-flex items-center gap-1"
            >
              <span className="font-medium">{card.label || "Sem etiqueta"}</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                (editar)
              </span>
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 justify-center flex-wrap">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1" /> Copiar link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/${card.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-1" /> Visualizar
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={generatingPdf}
            onClick={async () => {
              setGeneratingPdf(true);
              try {
                await generateBusinessCardPdf(card as any);
                toast.success("PDF gerado com sucesso!");
              } catch {
                toast.error("Erro ao gerar PDF.");
              } finally {
                setGeneratingPdf(false);
              }
            }}
          >
            {generatingPdf ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1" />
            )}
            Gerar PDF
          </Button>
        </div>

        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2 justify-center">
          <ExternalLink className="h-4 w-4" />
          <span className="font-medium">{publicUrl}</span>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto">
          <WizardProgressBar
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={(i) => setCurrentStep(i)}
          />
        </div>

        {/* Content: form + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3">
            {currentStep === 0 && (
              <StepImages
                card={card}
                updateCard={updateCard}
                uploadImage={uploadImage}
                onNext={() => handleSaveAndNext()}
                isPending={updateCard.isPending}
              />
            )}
            {currentStep === 1 && (
              <StepInfo
                form={form}
                setForm={(f) => setForm({ ...form, ...f })}
                onSave={() => handleSaveAndNext()}
                onBack={() => setCurrentStep(0)}
                isPending={updateCard.isPending}
              />
            )}
            {currentStep === 2 && (
              <StepColors
                primaryColor={form.primary_color}
                secondaryColor={form.secondary_color}
                setPrimaryColor={(c) => setForm({ ...form, primary_color: c })}
                setSecondaryColor={(c) => setForm({ ...form, secondary_color: c })}
                onSave={() => handleSaveAndNext()}
                onBack={() => setCurrentStep(1)}
                isPending={updateCard.isPending}
              />
            )}
            {currentStep === 3 && (
              <StepButtons
                buttons={buttons}
                setButtons={setButtons}
                onSave={() => handleSaveAndNext()}
                onBack={() => setCurrentStep(2)}
                isPending={updateCard.isPending}
              />
            )}
            {currentStep === 4 && (
              <StepSocial
                socialLinks={socialLinks}
                setSocialLinks={setSocialLinks}
                onSave={handleFinalize}
                onBack={() => setCurrentStep(3)}
                isPending={updateCard.isPending}
              />
            )}
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 hidden lg:block">
            <CardPreview
              name={form.name}
              title={form.title}
              agency_name={form.agency_name}
              phone={form.phone}
              whatsapp={form.whatsapp}
              email={form.email}
              website={form.website}
              photo_url={card.photo_url}
              cover_url={card.cover_url}
              logos={card.logos}
              primary_color={form.primary_color}
              secondary_color={form.secondary_color}
              buttons={buttons}
              social_links={socialLinks}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MeuCartaoEditor() {
  return (
    <SubscriptionGuard feature="business_card">
      <MeuCartaoEditorContent />
    </SubscriptionGuard>
  );
}
