import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificação se as credenciais estão configuradas
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas. Conecte sua conta Supabase nas Configurações do Projeto.');
}

// Cria cliente apenas se configurado corretamente
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper para verificar se Supabase está disponível
export const isSupabaseAvailable = () => isSupabaseConfigured;
