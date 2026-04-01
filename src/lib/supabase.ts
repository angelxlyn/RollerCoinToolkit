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

const rawUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
               (import.meta.env?.VITE_SUPABASE_URL) || 
               "";

const supabaseUrl = normalizeUrl(rawUrl);

const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
                        (import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                        "";

console.log('--- Supabase Client Debug ---');
console.log('Raw URL present:', !!rawUrl);
console.log('Normalized URL:', supabaseUrl);
console.log('Anon Key present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your AI Studio Secrets for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
