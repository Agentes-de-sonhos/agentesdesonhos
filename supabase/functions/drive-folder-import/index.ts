import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BUCKET = "materials-imports";
const MAX_FILES = 200;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB por arquivo

const SUPPORTED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const FOLDER_ID_RE = /^[A-Za-z0-9_-]{10,}$/;
const ALLOWED_HOSTS = ["drive.google.com", "docs.google.com", "drive.usercontent.google.com"];

function parseFolder(input: string): { folderId?: string; error?: string } {
  const raw = (input || "").trim();
  if (!raw) return { error: "Informe o link da pasta do Google Drive." };
  if (!raw.includes("/") && !raw.includes(".") && FOLDER_ID_RE.test(raw)) return { folderId: raw };
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { error: "Link inválido. Cole a URL completa da pasta do Google Drive." };
  }
  if (url.protocol !== "https:") return { error: "Use um link https do Google Drive." };
  if (!ALLOWED_HOSTS.includes(url.hostname.toLowerCase()))
    return { error: "O link precisa ser de uma pasta do Google Drive." };
  const candidate = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] || url.searchParams.get("id") || "";
  if (!candidate || !FOLDER_ID_RE.test(candidate))
    return { error: "Não encontramos o ID da pasta no link. Use o formato drive.google.com/drive/folders/…" };
  return { folderId: candidate };
}

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "arquivo";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

type Auth = { kind: "oauth"; token: string } | { kind: "key"; key: string };

function driveHeaders(auth: Auth): Record<string, string> {
  return auth.kind === "oauth" ? { Authorization: `Bearer ${auth.token}` } : {};
}

function withKey(url: string, auth: Auth) {
  if (auth.kind !== "key") return url;
  return url + (url.includes("?") ? "&" : "?") + `key=${encodeURIComponent(auth.key)}`;
}

async function listFolder(folderId: string, auth: Auth): Promise<{ files?: DriveFile[]; error?: string }> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id,name,mimeType,size)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(withKey(`https://www.googleapis.com/drive/v3/files?${params}`, auth), {
      headers: driveHeaders(auth),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Drive list failed [${res.status}]: ${body}`);
      if (res.status === 403 || res.status === 404 || res.status === 401) {
        return {
          error:
            "Não foi possível acessar a pasta. Verifique se o link do Google Drive está compartilhado como \"Qualquer pessoa com o link\" com permissão de leitura/download.",
        };
      }
      return { error: `Falha ao listar a pasta no Google Drive (${res.status}).` };
    }
    const data = await res.json();
    for (const f of data.files || []) files.push(f as DriveFile);
    pageToken = data.nextPageToken;
  } while (pageToken && files.length < MAX_FILES);
  return { files: files.slice(0, MAX_FILES) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    const userId = userData.user.id;

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Acesso restrito a administradores." }, 403);

    const body = await req.json().catch(() => ({}));
    const sourceId: string | undefined = body?.source_id;
    if (!sourceId || typeof sourceId !== "string") return json({ error: "source_id é obrigatório." }, 400);

    const { data: source, error: srcErr } = await admin
      .from("material_import_sources")
      .select("id, supplier_id, provider, folder_url, folder_id, is_active")
      .eq("id", sourceId)
      .maybeSingle();
    if (srcErr || !source) return json({ error: "Fonte de importação não encontrada." }, 404);
    if (!source.is_active) return json({ error: "Esta fonte está inativa." }, 400);
    if (source.provider !== "google_drive") return json({ error: "Provedor não suportado nesta fase." }, 400);

    const parsed = parseFolder(source.folder_url || source.folder_id);
    if (parsed.error || !parsed.folderId) return json({ error: parsed.error }, 400);

    // Autenticação no Drive: OAuth conectado (preferencial) ou chave de API para pastas públicas.
    let auth: Auth | null = null;
    const { data: token } = await admin
      .from("google_drive_tokens")
      .select("access_token, refresh_token, token_expires_at")
      .limit(1)
      .maybeSingle();

    if (token?.access_token && token?.token_expires_at && new Date(token.token_expires_at) > new Date()) {
      auth = { kind: "oauth", token: token.access_token };
    } else if (token?.refresh_token) {
      const refreshed = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
          refresh_token: token.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (refreshed.ok) {
        const t = await refreshed.json();
        auth = { kind: "oauth", token: t.access_token };
      }
    }

    if (!auth) {
      const key = Deno.env.get("GOOGLE_DRIVE_API_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY");
      if (!key)
        return json(
          {
            error:
              "Nenhuma credencial do Google disponível. Conecte o Google Drive no painel ou configure uma chave de API do Google Drive.",
          },
          400,
        );
      auth = { kind: "key", key };
    }

    const listed = await listFolder(parsed.folderId, auth);
    if (listed.error) return json({ error: listed.error }, 422);
    const files = listed.files || [];

    const outcomes: Array<{
      fileId: string;
      fileName: string;
      mimeType?: string | null;
      status: "added" | "existing" | "ignored" | "failed";
      message?: string;
    }> = [];

    for (const file of files) {
      const mime = (file.mimeType || "").toLowerCase();

      if (mime === "application/vnd.google-apps.folder") {
        outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "ignored", message: "Subpasta ignorada nesta fase." });
        continue;
      }
      if (!SUPPORTED_MIME.includes(mime)) {
        outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "ignored", message: "Tipo de arquivo não suportado." });
        continue;
      }

      const { data: existing } = await admin
        .from("material_imported_files")
        .select("id")
        .eq("provider", "google_drive")
        .eq("provider_file_id", file.id)
        .maybeSingle();
      if (existing) {
        outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "existing" });
        continue;
      }

      const size = file.size ? Number(file.size) : null;
      if (size && size > MAX_FILE_BYTES) {
        outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "failed", message: "Arquivo maior que 25MB." });
        continue;
      }

      try {
        const dl = await fetch(
          withKey(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, auth),
          { headers: driveHeaders(auth) },
        );
        if (!dl.ok) {
          const t = await dl.text();
          console.error(`Drive download failed [${dl.status}] ${file.id}: ${t}`);
          outcomes.push({
            fileId: file.id,
            fileName: file.name,
            mimeType: mime,
            status: "failed",
            message:
              dl.status === 403 || dl.status === 401
                ? "Sem permissão de download. Ajuste o compartilhamento do arquivo."
                : `Falha no download (${dl.status}).`,
          });
          continue;
        }
        const bytes = new Uint8Array(await dl.arrayBuffer());
        if (bytes.byteLength > MAX_FILE_BYTES) {
          outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "failed", message: "Arquivo maior que 25MB." });
          continue;
        }

        const path = `${source.supplier_id}/${file.id}/${sanitizeName(file.name)}`;
        const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
          contentType: mime,
          upsert: true,
        });
        if (upErr) throw upErr;

        const { error: insErr } = await admin.from("material_imported_files").insert({
          source_id: source.id,
          supplier_id: source.supplier_id,
          provider: "google_drive",
          provider_file_id: file.id,
          file_name: file.name,
          mime_type: mime,
          size_bytes: bytes.byteLength,
          source_url: `https://drive.google.com/file/d/${file.id}/view`,
          storage_bucket: BUCKET,
          storage_path: path,
          status: "a_revisar",
          imported_by: userId,
        });
        if (insErr) {
          if ((insErr as any).code === "23505") {
            outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "existing" });
            continue;
          }
          throw insErr;
        }

        outcomes.push({ fileId: file.id, fileName: file.name, mimeType: mime, status: "added" });
      } catch (e) {
        console.error("Import error", file.id, e);
        outcomes.push({
          fileId: file.id,
          fileName: file.name,
          mimeType: mime,
          status: "failed",
          message: "Não foi possível importar este arquivo.",
        });
      }
    }

    const summary = {
      totalFound: outcomes.length,
      added: outcomes.filter((o) => o.status === "added").length,
      existing: outcomes.filter((o) => o.status === "existing").length,
      ignored: outcomes.filter((o) => o.status === "ignored").length,
      failed: outcomes.filter((o) => o.status === "failed").length,
    };

    await admin
      .from("material_import_sources")
      .update({ last_sync_at: new Date().toISOString(), last_sync_result: summary })
      .eq("id", source.id);

    return json({ summary, outcomes });
  } catch (e) {
    console.error("drive-folder-import fatal", e);
    return json({ error: "Erro inesperado ao importar do Google Drive." }, 500);
  }
});