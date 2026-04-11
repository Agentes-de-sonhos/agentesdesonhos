import { useState } from "react";
import { ImageCapture } from "./ImageCapture";
import { CardReviewForm } from "./CardReviewForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ExtractedCardData {
  person_name: string | null;
  job_title: string | null;
  company_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  social_links: Record<string, string>;
  other_info: string | null;
  confidence: Record<string, string>;
  has_logo: boolean;
}

type Step = "capture" | "processing" | "review" | "success";

interface Props {
  /** If provided, use token-based saving (quick access mode) */
  quickAccessToken?: string;
}

export function BusinessCardCapture({ quickAccessToken }: Props) {
  const [step, setStep] = useState<Step>("capture");
  const [extractedData, setExtractedData] = useState<ExtractedCardData | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleImageReady = async (base64: string, preview: string) => {
    setImagePreview(preview);
    setStep("processing");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-business-card`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image_base64: base64 }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar");
      }

      setExtractedData(result.data);
      setStep("review");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar imagem");
      setStep("capture");
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (quickAccessToken) {
        // Token-based save via RPC
        const { data: newId, error } = await supabase.rpc("save_card_capture_via_token", {
          _token: quickAccessToken,
          _data: data,
        });
        if (error) throw error;
        setSavedId(newId);
      } else {
        // Direct save (admin logged in)
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) throw new Error("Não autenticado");

        const { data: inserted, error } = await supabase
          .from("crm_card_captures")
          .insert({ ...data, user_id: user.user.id })
          .select("id")
          .single();
        if (error) throw error;
        setSavedId(inserted.id);
      }

      toast.success("Contato salvo no CRM!");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleReset = () => {
    setStep("capture");
    setExtractedData(null);
    setImagePreview("");
    setSavedId(null);
  };

  if (step === "capture") {
    return <ImageCapture onImageReady={handleImageReady} />;
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-center font-medium">
          Lendo cartão de visita...
        </p>
        <p className="text-xs text-muted-foreground/70 text-center">
          Extraindo dados automaticamente com IA
        </p>
      </div>
    );
  }

  if (step === "review" && extractedData) {
    return (
      <CardReviewForm
        data={extractedData}
        imagePreview={imagePreview}
        onSave={handleSave}
        onBack={handleReset}
      />
    );
  }

  if (step === "success") {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
          <h2 className="text-xl font-bold">Contato salvo com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            O contato foi adicionado ao CRM administrativo.
          </p>
          <div className="flex gap-3 mt-2">
            <Button onClick={handleReset} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Capturar novo cartão
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
