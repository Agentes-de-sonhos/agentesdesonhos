import { toast } from "@/hooks/use-toast";
import { registerLinkImagesAfterSave } from "@/lib/agencyImageLibrary";

/**
 * Após salvar um serviço com sucesso: registra na biblioteca as fotos de origem
 * link. Falha nunca afeta o serviço — só avisa e deixa retry na biblioteca.
 */
export async function syncLinkImagesToLibrary(finalUrls: string[] | undefined | null) {
  const res = await registerLinkImagesAfterSave(finalUrls);
  if (res.failed > 0) {
    toast({
      title: "Serviço salvo",
      description: "A foto por link não entrou na Biblioteca de imagens agora. Abra a biblioteca e toque em \"Tentar novamente\".",
    });
  }
  return res;
}
