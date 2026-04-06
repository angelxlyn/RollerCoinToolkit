import { createClient } from '@supabase/supabase-js';

// Helper to normalize Supabase URL
const normalizeUrl = (url: string) => {
  if (!url) return "";
  let normalized = url.trim();
  
  // If it's just the project ID (e.g. 20 chars, no dots, no slashes)
  if (normalized.length === 20 && !normalized.includes('.') && !normalized.includes('/')) {
    normalized = `${normalized}.supabase.co`;
  }
  
  if (!normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }
  // Remove trailing slash
  return normalized.replace(/\/$/, "");
};

const getInitialConfig = () => {
  const url = (import.meta.env?.VITE_SUPABASE_URL) || "";
  const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";
  return { url, key };
};

let { url: rawUrl, key: supabaseAnonKey } = getInitialConfig();

// If build-time variables are missing, try to fetch from server
if (!rawUrl || !supabaseAnonKey) {
  try {
    // Synchronous-like fetch using top-level await (supported by Vite)
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      if (config.supabaseUrl && !rawUrl) rawUrl = config.supabaseUrl;
      if (config.supabaseAnonKey && !supabaseAnonKey) supabaseAnonKey = config.supabaseAnonKey;
    }
  } catch (err) {
    console.error('Failed to fetch Supabase config at runtime:', err);
  }
}

const supabaseUrl = normalizeUrl(rawUrl);

console.log('--- Supabase Client Debug ---');
console.log('Raw URL present:', !!rawUrl);
console.log('Normalized URL:', supabaseUrl);
console.log('Anon Key present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your AI Studio Secrets for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
