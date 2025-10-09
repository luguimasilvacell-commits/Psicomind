// Teste para verificar se o problema foi resolvido
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Criar cliente com configuração simplificada (igual ao frontend agora)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Simular supabaseWithRetry
async function supabaseWithRetry(operation, config = {}) {
  const maxRetries = config.maxRetries || 3
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      if (result.error) {
        lastError = result.error
        
        if (attempt < maxRetries) {
          console.log(`Tentativa ${attempt}/${maxRetries} falhou:`, result.error)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        
        return { data: null, error: result.error }
      }
      
      return { data: result.data, error: null }
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        console.log(`Tentativa ${attempt}/${maxRetries} falhou com exceção:`, error)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }
      
      return { data: null, error }
    }
  }
  
  return { data: null, error: lastError }
}

async function testFix() {
  try {
    console.log('🔍 Testando fix do problema...')
    
    // Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@psicomind.com',
      password: 'admin123'
    })

    if (error) {
      console.error('❌ Erro no login:', error)
      return
    }

    console.log('✅ Login bem-sucedido!')

    // Buscar dados do psicólogo com retry (simulando o frontend)
    const { data: psicologoData, error: psicologoError } = await supabaseWithRetry(
      async () => {
        console.log('🔄 Executando query para buscar psicólogo...')
        const response = await supabase
          .from('psicologos')
          .select('*')
          .eq('id', data.user.id)
          .single()
        console.log('📊 Resposta da query:', response)
        return response
      },
      {
        maxRetries: 3,
        showToast: false
      }
    )

    console.log('📋 Resultado final:')
    console.log('  Data:', psicologoData)
    console.log('  Error:', psicologoError)

    if (psicologoError) {
      console.error('❌ PROBLEMA AINDA EXISTE:', psicologoError)
    } else {
      console.log('✅ PROBLEMA RESOLVIDO!')
    }

    // Logout
    await supabase.auth.signOut()
    console.log('✅ Logout realizado!')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

testFix()