import { supabase } from "@/integrations/supabase/client";
import { BLOG_MEDIA_BUCKET } from "@/lib/blog/blogUtils";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const SIGN_SECONDS = 60 * 60 * 24 * 7;

/** Redimensiona (máx. 1920px) e converte para WebP no navegador antes do upload. */
export async function optimizeImage(file: File, maxSide = 1920, quality = 0.82): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use imagens JPG, PNG ou WebP.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("A imagem precisa ter até 15 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return blob;
}

/** Sobe a imagem para {agencia}/{artigo}/... (o artigo precisa existir antes). */
export async function uploadBlogImage(agencyId: string, postId: string, file: File) {
  const blob = await optimizeImage(file);
  const path = `${agencyId}/${postId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BLOG_MEDIA_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw new Error("Não foi possível enviar a imagem. Verifique sua permissão e tente novamente.");
  const src = await signBlogPath(path);
  return { path, src };
}

export async function signBlogPath(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BLOG_MEDIA_BUCKET).createSignedUrl(path, SIGN_SECONDS);
  return data?.signedUrl ?? "";
}

export async function signBlogPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(BLOG_MEDIA_BUCKET).createSignedUrls(unique, SIGN_SECONDS);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

/** Copia a mídia para a pasta de outro artigo (usado em "Duplicar como rascunho"). */
export async function copyBlogMedia(paths: string[], fromPostId: string, toPostId: string) {
  const map: Record<string, string> = {};
  for (const p of [...new Set(paths)]) {
    if (!p.includes(`/${fromPostId}/`)) continue;
    const target = p.replace(`/${fromPostId}/`, `/${toPostId}/`);
    const { error } = await supabase.storage.from(BLOG_MEDIA_BUCKET).copy(p, target);
    if (!error) map[p] = target;
  }
  return map;
}
