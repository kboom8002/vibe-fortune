import { createClient } from "@supabase/supabase-js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  return UUID_REGEX.test(id || "");
}

export function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // On the server, we prefer the service role key to bypass RLS for system operations.
  // On the client, it will fall back to anon key (if process.env is exposed).
  const key = (typeof window === "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : null) || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
    }
  });
}

export function getAdminDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}
