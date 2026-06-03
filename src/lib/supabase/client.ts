import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

/**
 * Cliente Supabase server-side. Usa Service Role Key para permitir uploads
 * autenticados em buckets privados sem depender de sessao do usuario.
 */
export const supabase = createClient(
  env.DATABASE_URL,
  env.DRIZZLE_DATABASE_URL,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
