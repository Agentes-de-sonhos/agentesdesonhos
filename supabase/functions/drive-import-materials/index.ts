import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

interface DriveFolder {
  id: string;
  name: string;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from("google_drive_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) {
    throw new Error("Google Drive não conectado. Conecte sua conta primeiro.");
  }

  const expiresAt = new Date(tokenRow.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return tokenRow.access_token;
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("Falha ao renovar token do Google Drive. Reconecte sua conta.");
  }

  const newExpires = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase
    .from("google_drive_tokens")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return data.access_token;
}

async function listDriveSubfolders(accessToken: string, parentFolderId: string): Promise<DriveFolder[]> {
  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro ao listar pastas: ${JSON.stringify(data)}`);
  return data.files || [];
}

async function listDriveFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime)&pageSize=200&orderBy=createdTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro ao listar arquivos: ${JSON.stringify(data)}`);
  return data.files || [];
}

async function downloadDriveFile(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Erro ao baixar arquivo ${fileId}: ${res.status}`);
  return res.arrayBuffer();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: token não fornecido" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${userError?.message || "usuário não encontrado"}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    const isAdmin = roleData && roleData.length > 0;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas administradores" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rootFolderId = body.folder_id;

    if (!rootFolderId || typeof rootFolderId !== "string") {
      return new Response(JSON.stringify({ error: "folder_id é obrigatório" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== DRIVE IMPORT START ===");
    console.log("Root folder ID:", rootFolderId);
    console.log("User ID:", user.id);

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user.id);
    console.log("Access token obtained successfully");

    // Get already imported file IDs
    const { data: existingImports } = await supabase
      .from("drive_import_logs")
      .select("drive_file_id")
      .in("status", ["success"]);

    const importedFileIds = new Set((existingImports || []).map((i: any) => i.drive_file_id));
    console.log("Already imported files:", importedFileIds.size);

    // Get operator mapping from tour_operators table
    const { data: existingOperators } = await supabase
      .from("tour_operators")
      .select("id, name")
      .eq("is_active", true);

    const supplierMap = new Map<string, { id: string; name: string }>();
    (existingOperators || []).forEach((s: any) => {
      supplierMap.set(s.name.toLowerCase().trim(), s);
    });
    console.log("Registered operators:", supplierMap.size);

    // List operator subfolders
    const operatorFolders = await listDriveSubfolders(accessToken, rootFolderId);
    console.log("Operator folders found:", operatorFolders.length, operatorFolders.map(f => f.name));

    const results = {
      total_files_found: 0,
      imported: 0,
      skipped_duplicate: 0,
      skipped_unsupported: 0,
      skipped_no_supplier: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const opFolder of operatorFolders) {
      const operatorName = opFolder.name.trim();
      
      const supplier = supplierMap.get(operatorName.toLowerCase());
      if (!supplier) {
        console.warn(`Pasta "${operatorName}" não corresponde a nenhuma operadora cadastrada. Ignorando.`);
        results.skipped_no_supplier++;
        results.details.push({
          folder: operatorName,
          status: "skipped_no_supplier",
          message: `Operadora "${operatorName}" não encontrada no sistema.`,
        });

        const { error: logErr1 } = await supabase.from("drive_import_logs").insert({
          drive_file_id: `folder_${opFolder.id}`,
          drive_file_name: operatorName,
          drive_folder_name: operatorName,
          supplier_name: operatorName,
          status: "error",
          error_message: `Operadora "${operatorName}" não cadastrada no sistema.`,
        });
        if (logErr1) console.error("Log insert error:", logErr1);

        continue;
      }

      console.log(`Processing operator: ${operatorName} (${supplier.id})`);

      // Check for category subfolders
      const categoryFolders = await listDriveSubfolders(accessToken, opFolder.id);
      
      if (categoryFolders.length > 0) {
        for (const catFolder of categoryFolders) {
          const category = catFolder.name.trim();
          const files = await listDriveFiles(accessToken, catFolder.id);
          console.log(`  Category "${category}": ${files.length} files`);
          
          for (const file of files) {
            results.total_files_found++;
            await processFile(supabase, accessToken, file, supplier, category, opFolder.name, importedFileIds, results);
          }
        }
      } else {
        const files = await listDriveFiles(accessToken, opFolder.id);
        console.log(`  No categories, direct files: ${files.length}`);
        
        for (const file of files) {
          results.total_files_found++;
          await processFile(supabase, accessToken, file, supplier, "Geral", opFolder.name, importedFileIds, results);
        }
      }
    }

    // Update config last sync
    await supabase
      .from("drive_import_config")
      .upsert({
        root_folder_id: rootFolderId,
        last_sync_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "root_folder_id" });

    console.log("=== DRIVE IMPORT COMPLETE ===", JSON.stringify(results));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== DRIVE IMPORT FATAL ERROR ===");
    console.error("Error:", error instanceof Error ? error.message : error);
    console.error("Stack:", error instanceof Error ? error.stack : "N/A");
    
    const message = error instanceof Error ? error.message : "Erro ao importar materiais do Drive.";
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processFile(
  supabase: any,
  accessToken: string,
  file: DriveFile,
  supplier: { id: string; name: string },
  category: string,
  folderName: string,
  importedFileIds: Set<string>,
  results: any
) {
  if (importedFileIds.has(file.id)) {
    results.skipped_duplicate++;
    return;
  }

  const ext = SUPPORTED_MIME_TYPES[file.mimeType];
  if (!ext) {
    results.skipped_unsupported++;
    const { error: logErr2 } = await supabase.from("drive_import_logs").insert({
      drive_file_id: file.id,
      drive_file_name: file.name,
      drive_folder_name: folderName,
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      category,
      status: "skipped",
      error_message: `Tipo não suportado: ${file.mimeType}`,
    });
    if (logErr2) console.error("Log insert error:", logErr2);
    return;
  }

  try {
    const fileData = await downloadDriveFile(accessToken, file.id);
    const fileBytes = new Uint8Array(fileData);

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `drive-imports/${supplier.name}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(storagePath, fileBytes, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("materials")
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;
    const title = file.name.replace(/\.[^.]+$/, "").trim();

    const { data: material, error: insertError } = await supabase
      .from("materials")
      .insert({
        title,
        material_type: "Imagem",
        category,
        supplier_id: supplier.id,
        file_url: fileUrl,
        thumbnail_url: fileUrl,
        is_active: true,
        is_permanent: false,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    await supabase.from("drive_import_logs").insert({
      drive_file_id: file.id,
      drive_file_name: file.name,
      drive_folder_name: folderName,
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      material_id: material.id,
      category,
      status: "success",
    });

    importedFileIds.add(file.id);
    results.imported++;
    results.details.push({
      file: file.name,
      supplier: supplier.name,
      category,
      status: "imported",
    });
  } catch (err) {
    console.error(`Error importing ${file.name}:`, err);
    results.errors++;

    const { error: logErr3 } = await supabase.from("drive_import_logs").insert({
      drive_file_id: file.id,
      drive_file_name: file.name,
      drive_folder_name: folderName,
      supplier_name: supplier.name,
      supplier_id: supplier.id,
      category,
      status: "error",
      error_message: err instanceof Error ? err.message : "Erro desconhecido",
    });
    if (logErr3) console.error("Log insert error:", logErr3);
  }
}
