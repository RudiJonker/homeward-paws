const trimTrailingSlash = (value) => value?.replace(/\/$/, '') ?? '';

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  websiteUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://digitack.co.za/paws'
  )
};

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);
