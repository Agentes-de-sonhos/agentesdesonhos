import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    console.log("=== GOOGLE DRIVE CALLBACK START ===");
    console.log("Full URL:", req.url);
    console.log("Code present:", !!code);
    console.log("State present:", !!stateParam);
    console.log("Error param:", error);
    console.log("Error description:", errorDescription);

    if (error) {
      const msg = `Google OAuth Error: ${error} - ${errorDescription || 'sem descrição'}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      const msg = `Parâmetros inválidos. code=${!!code}, state=${!!stateParam}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    let userId: string;
    try {
      const state = JSON.parse(atob(stateParam));
      userId = state.user_id;
      console.log("User ID from state:", userId);
    } catch (e) {
      const msg = `Erro ao decodificar state: ${e.message}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!userId) {
      return new Response(redirectHtml("Usuário não identificado no state.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // Hardcode exact redirect_uri to match Google Cloud Console config
    const redirectUri = "https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/google-drive-callback";

    console.log("=== TOKEN EXCHANGE CONFIG ===");
    console.log("Client ID present:", !!clientId);
    console.log("Client ID value:", clientId ? clientId.substring(0, 20) + "..." : "MISSING");
    console.log("Client Secret present:", !!clientSecret);
    console.log("Redirect URI:", redirectUri);
    console.log("Code length:", code.length);

    if (!clientId || !clientSecret) {
      const msg = `Credenciais ausentes. CLIENT_ID=${!!clientId}, CLIENT_SECRET=${!!clientSecret}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    console.log("=== SENDING TOKEN REQUEST ===");
    console.log("Token endpoint: https://oauth2.googleapis.com/token");
    console.log("Request body params:", {
      code: code.substring(0, 20) + "...",
      client_id: clientId.substring(0, 20) + "...",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    const tokenText = await tokenRes.text();
    console.log("=== TOKEN RESPONSE ===");
    console.log("HTTP Status:", tokenRes.status);
    console.log("Response body:", tokenText);

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      const msg = `Resposta inválida do Google (não é JSON). Status: ${tokenRes.status}. Body: ${tokenText.substring(0, 500)}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!tokenRes.ok || !tokenData.access_token) {
      const errorDetail = tokenData.error_description || tokenData.error || "Erro desconhecido";
      const msg = `Falha na troca do token (HTTP ${tokenRes.status}): ${errorDetail}. Detalhes: ${JSON.stringify(tokenData)}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log("=== TOKEN SUCCESS ===");
    console.log("Access token received:", !!tokenData.access_token);
    console.log("Refresh token received:", !!tokenData.refresh_token);
    console.log("Expires in:", tokenData.expires_in);

    // Fetch Google email
    let googleEmail: string | null = null;
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfoText = await userInfoRes.text();
      console.log("UserInfo status:", userInfoRes.status);
      console.log("UserInfo body:", userInfoText);
      if (userInfoRes.ok) {
        const userInfo = JSON.parse(userInfoText);
        googleEmail = userInfo.email || null;
      }
    } catch (e) {
      console.warn("Could not fetch Google user info:", e.message);
    }

    const supabase = createClient(
      supabaseUrl!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("google_drive_tokens")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        google_email: googleEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      const msg = `Erro ao salvar no banco: ${JSON.stringify(upsertError)}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log("=== SUCCESS - Tokens saved ===");
    return new Response(redirectHtml("Google Drive conectado com sucesso!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const msg = `Erro inesperado: ${err.message}\nStack: ${err.stack}`;
    console.error(msg);
    return new Response(redirectHtml(msg, false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHtml(message: string, success: boolean): string {
  const color = success ? "#22c55e" : "#ef4444";
  const escapedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google Drive</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;background:#f9fafb;padding:20px">
  <div style="text-align:center;max-width:700px;word-break:break-all">
    <div style="font-size:48px;margin-bottom:16px">${success ? "✅" : "❌"}</div>
    <h2 style="color:${color}">${success ? "Sucesso!" : "Erro na conexão"}</h2>
    <pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;text-align:left;white-space:pre-wrap;font-size:12px;max-height:400px;overflow:auto">${escapedMessage}</pre>
    <p style="color:#6b7280;margin-top:16px">${success ? "Você pode fechar esta janela." : "Copie esta mensagem e envie ao suporte."}</p>
    ${success ? '<script>setTimeout(()=>{window.close()},3000)</script>' : ''}
  </div>
</body></html>`;
}
