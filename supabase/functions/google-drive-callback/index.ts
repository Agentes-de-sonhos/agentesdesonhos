import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    console.log("=== GOOGLE DRIVE CALLBACK START ===");
    console.log("Code present:", !!code);
    console.log("State present:", !!stateParam);
    console.log("Error param:", error);

    // Google returned an error (user denied, etc.)
    if (error) {
      const msg = `Google OAuth Error: ${error} - ${errorDescription || "sem descrição"}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    // Missing code or state
    if (!code) {
      const msg = "Authorization code não recebido no callback";
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    if (!stateParam) {
      const msg = "Parâmetro state não recebido no callback";
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const state = JSON.parse(atob(stateParam));
      userId = state.user_id;
      console.log("User ID from state:", userId);
    } catch (e) {
      const msg = `Erro ao decodificar state: ${e.message}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    if (!userId) {
      return new Response(redirectHtml("Usuário não identificado no state.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Read secrets
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("=== SECRETS CHECK ===");
    console.log("GOOGLE_CLIENT_ID present:", !!clientId);
    console.log("GOOGLE_CLIENT_SECRET present:", !!clientSecret);
    console.log("SUPABASE_URL present:", !!supabaseUrl);
    console.log("SERVICE_ROLE_KEY present:", !!serviceRoleKey);

    if (!clientId || !clientSecret) {
      const msg = `GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurado. CLIENT_ID=${!!clientId}, CLIENT_SECRET=${!!clientSecret}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      const msg = "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado";
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    // Token exchange - MUST use exact redirect_uri
    const redirectUri = "https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/google-drive-callback";

    const tokenBody = new URLSearchParams({
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    console.log("=== TOKEN EXCHANGE REQUEST ===");
    console.log("Endpoint: https://oauth2.googleapis.com/token");
    console.log("redirect_uri:", redirectUri);
    console.log("code length:", code.length);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    const tokenText = await tokenRes.text();
    console.log("=== TOKEN EXCHANGE RESPONSE ===");
    console.log("HTTP Status:", tokenRes.status);
    console.log("Response body:", tokenText);

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      const msg = `Resposta inválida do Google (não é JSON). Status: ${tokenRes.status}. Body: ${tokenText.substring(0, 500)}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    if (!tokenRes.ok || !tokenData.access_token) {
      const errorCode = tokenData.error || "unknown_error";
      const errorDetail = tokenData.error_description || "sem detalhes";
      const msg = `Erro ao conectar: ${errorCode} — ${errorDetail} (HTTP ${tokenRes.status})`;
      console.error("Token exchange failed:", JSON.stringify(tokenData));
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
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
      if (userInfoRes.ok) {
        const userInfo = JSON.parse(userInfoText);
        googleEmail = userInfo.email || null;
        console.log("Google email:", googleEmail);
      } else {
        console.warn("UserInfo fetch failed:", userInfoText);
      }
    } catch (e) {
      console.warn("Could not fetch Google user info:", e.message);
    }

    // Save tokens
    const supabase = createClient(supabaseUrl, serviceRoleKey);
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
      const msg = `Erro ao salvar tokens no banco: ${upsertError.message || JSON.stringify(upsertError)}`;
      console.error(msg);
      return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
    }

    console.log("=== SUCCESS - Tokens saved ===");
    return new Response(redirectHtml("Google Drive conectado com sucesso!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const msg = `Erro inesperado: ${err.message}\nStack: ${err.stack}`;
    console.error(msg);
    return new Response(redirectHtml(msg, false), { headers: { "Content-Type": "text/html" } });
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
