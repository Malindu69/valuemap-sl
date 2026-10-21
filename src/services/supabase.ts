import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://tzxrjovpttkbupjvtjce.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8kUHRsmU3MC9P4bkAyT1BA_JuhbeY8d';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
