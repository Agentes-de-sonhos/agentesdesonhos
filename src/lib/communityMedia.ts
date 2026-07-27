import { supabase } from "@/integrations/supabase/client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const DOC_EXT_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_SECONDS = 120; // 2 minutes
export const MAX_DOCS = 3;
export const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25MB

export function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return base || "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadCommunityFile(
  userId: string,
  file: File,
  folder: "images" | "videos" | "docs"
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${sanitizeFilename(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage
    .from("community-feed")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("community-feed").getPublicUrl(path);
  return data.publicUrl;
}

export function probeVideo(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = el.duration;
      URL.revokeObjectURL(url);
      resolve({ duration });
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo."));
    };
    el.src = url;
  });
}