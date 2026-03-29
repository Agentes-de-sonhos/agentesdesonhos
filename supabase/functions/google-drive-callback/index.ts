import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(redirectHtml("Erro ao conectar com o Google Drive.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHtml("Parâmetros inválidos.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const state = JSON.parse(atob(stateParam));
    const userId = state.user_id;

    if (!userId) {
      return new Response(redirectHtml("Usuário não identificado.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-drive-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return new Response(redirectHtml("Falha ao obter token do Google.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Fetch user info (email) from Google
    let googleEmail: string | null = null;
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        googleEmail = userInfo.email || null;
      }
    } catch (e) {
      console.warn("Could not fetch Google user info:", e);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
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
      console.error("Upsert error:", upsertError);
      return new Response(redirectHtml("Erro ao salvar credenciais.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(redirectHtml("Google Drive conectado com sucesso!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(redirectHtml("Erro inesperado.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHtml(message: string, success: boolean): string {
  const color = success ? "#22c55e" : "#ef4444";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google Drive</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f9fafb">
  <div style="text-align:center;max-width:400px">
    <div style="font-size:48px;margin-bottom:16px">${success ? "✅" : "❌"}</div>
    <h2 style="color:${color}">${message}</h2>
    <p style="color:#6b7280">Você pode fechar esta janela.</p>
    <script>setTimeout(()=>{window.close()},3000)</script>
  </div>
</body></html>`;
}
