import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  clientInstance = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use localStorage for session persistence on client
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "sb-auth-token",
      flowType: "implicit",
    },
  });

  return clientInstance;
}
