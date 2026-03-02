import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find materials older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const { data: expiredMaterials, error: fetchError } = await supabase
      .from("materials")
      .select("id, file_url, thumbnail_url")
      .eq("is_permanent", false)
      .lt("created_at", cutoffDate.toISOString());

    if (fetchError) throw fetchError;

    if (!expiredMaterials || expiredMaterials.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired materials found", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect storage file paths to delete
    const filePaths: string[] = [];
    for (const mat of expiredMaterials) {
      for (const url of [mat.file_url, mat.thumbnail_url]) {
        if (url && url.includes("/storage/v1/object/public/materials/")) {
          const path = url.split("/storage/v1/object/public/materials/")[1];
          if (path) filePaths.push(path);
        }
      }
    }

    // Delete files from storage
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("materials")
        .remove(filePaths);
      if (storageError) {
        console.error("Storage cleanup error:", storageError);
      }
    }

    // Delete records from database
    const ids = expiredMaterials.map((m) => m.id);
    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    console.log(`Cleaned up ${ids.length} materials and ${filePaths.length} files`);

    return new Response(
      JSON.stringify({
        message: "Cleanup completed",
        deleted_records: ids.length,
        deleted_files: filePaths.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
