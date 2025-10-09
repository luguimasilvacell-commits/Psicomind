// Script para verificar se as variáveis de ambiente estão sendo carregadas corretamente
import { createClient } from '@supabase/supabase-js'

console.log('🔍 Verificando variáveis de ambiente...')

// Verificar se as variáveis estão definidas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('📊 VITE_SUPABASE_URL:', supabaseUrl)
console.log('📊 VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'UNDEFINED')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

// Criar cliente Supabase
console.log('🔧 Criando cliente Supabase...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Testar uma query simples
console.log('🔍 Testando query simples...')
try {
  const { data, error } = await supabase
    .from('psicologos')
    .select('id, email')
    .limit(1)

  console.log('📊 Resultado da query:', { data, error })
  
  if (error) {
    console.error('❌ Erro na query:', error)
  } else {
    console.log('✅ Query executada com sucesso!')
  }
} catch (err) {
  console.error('💥 Erro ao executar query:', err)
}