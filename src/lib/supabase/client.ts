import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey)
  throw new Error('Supabase config is not set or incomplete');

// Browser-side client (anon key). RLS denies anon by design,
// so this client is only used for future public endpoints / realtime.
// All yajuter data access goes through API Routes (service_role).
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
