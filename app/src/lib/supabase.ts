import { createClient } from '@supabase/supabase-js';

const normalizeSupabaseUrl = (value: string | undefined) => {
  const fallback = 'https://placeholder.supabase.co';
  const rawValue = value?.trim();

  if (!rawValue) {
    return fallback;
  }

  try {
    const url = new URL(rawValue);
    const isSslipHost = url.hostname.endsWith('sslip.io');
    const isSupabaseKongHost = url.hostname.startsWith('supabasekong-');

    if (isSslipHost && isSupabaseKongHost) {
      if (url.protocol === 'http:') {
        url.protocol = 'https:';
      }

      if (url.port === '8000') {
        url.port = '';
      }
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return rawValue;
  }
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
