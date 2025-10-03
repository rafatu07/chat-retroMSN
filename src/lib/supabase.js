import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔗 Conectando ao Supabase:', supabaseUrl)

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Variáveis de ambiente do Supabase não configuradas! Crie um arquivo .env na raiz do projeto.')
}

// Configurar para usar sessionStorage em vez de localStorage
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage, // Usa sessionStorage em vez de localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

console.log('✅ Cliente Supabase criado com sessionStorage')
