import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Server-only client (service_role bypasses RLS).
// Import this ONLY from API Routes / getServerSideProps, never from components.
export function getServiceClient(): SupabaseClient {
  if (typeof window !== 'undefined')
    throw new Error('getServiceClient must only be called on the server');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey)
    throw new Error('Supabase server config is not set or incomplete');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

// Single-user mode: the app has exactly one owner (id = 1),
// inherited from the PHP version (CURRENT_USER_ID = 1).
export const OWNER_USER_ID = 1;
