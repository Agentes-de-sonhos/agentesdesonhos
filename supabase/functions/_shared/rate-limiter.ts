import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Progressive rate limiter using the rate_limit_log table.
 * 
 * - Uses service_role to bypass RLS on rate_limit_log table.
 * - Returns { allowed: true } for normal usage.
 * - Returns { allowed: false, retryAfterMs } when limit exceeded.
 * 
 * @param identifier - IP address or user ID
 * @param endpoint - Edge function name
 * @param maxRequests - Maximum requests allowed in the window (default: 60)
 * @param windowSeconds - Time window in seconds (default: 60)
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = 60,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Count recent requests
  const { count, error } = await adminClient
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error.message);
    // Fail open — don't block legitimate users on DB errors
    return { allowed: true };
  }

  const currentCount = count ?? 0;

  if (currentCount >= maxRequests) {
    // Progressive delay: longer wait for heavier abuse
    const overageRatio = currentCount / maxRequests;
    const retryAfterMs = Math.min(overageRatio * 2000, 30000);
    return { allowed: false, retryAfterMs };
  }

  // Log the request
  await adminClient.from("rate_limit_log").insert({
    identifier,
    endpoint,
  });

  return { allowed: true };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Build a rate limit exceeded response with friendly message.
 */
export function rateLimitResponse(corsHeaders: Record<string, string>, retryAfterMs?: number): Response {
  return new Response(
    JSON.stringify({
      error: "Você está realizando muitas ações rapidamente. Aguarde alguns segundos e tente novamente.",
      retry_after_ms: retryAfterMs || 5000,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((retryAfterMs || 5000) / 1000)),
      },
    }
  );
}
