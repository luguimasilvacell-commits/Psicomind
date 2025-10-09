import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzg2MDksImV4cCI6MjA3NTUxNDYwOX0.Dcby8h2Jqu3RA1cMZec6rasq-50kwUQzV7Groh6eIuA'

// Configurações otimizadas para melhor conectividade (igual ao frontend)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'psicomind-web'
    },
    fetch: (url, options = {}) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.headers || {}),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).finally(() => {
        clearTimeout(timeoutId)
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Simular a função supabaseWithRetry
async function supabaseWithRetry(operation, config = {}) {
  const defaultConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    showToast: false
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  let lastError = null

  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation()
      
      if (result.error) {
        lastError = result.error
        console.error(`Tentativa ${attempt}/${finalConfig.maxRetries} falhou:`, result.error)
        
        if (attempt < finalConfig.maxRetries) {
          const delayTime = Math.min(
            finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
            finalConfig.maxDelay
          )
          console.log(`Aguardando ${delayTime}ms antes da próxima tentativa...`)
          await new Promise(resolve => setTimeout(resolve, delayTime))
          continue
        }
        
        return { data: null, error: result.error }
      }
      
      return { data: result.data, error: null }
    } catch (error) {
      lastError = error
      console.error(`Tentativa ${attempt}/${finalConfig.maxRetries} falhou com exceção:`, error)
      
      if (attempt < finalConfig.maxRetries) {
        const delayTime = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        )
        console.log(`Aguardando ${delayTime}ms antes da próxima tentativa...`)
        await new Promise(resolve => setTimeout(resolve, delayTime))
        continue
      }
      
      return { data: null, error: { message: error.message || 'Erro de conexão' } }
    }
  }
  
  return { data: null, error: { message: lastError?.message || 'Erro após múltiplas tentativas' } }
}

async function debugFrontendLogin() {
  try {
    console.log('🔍 Simulando login do frontend com configurações idênticas...')
    
    console.log('📧 Fazendo login com admin@psicomind.com...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@psicomind.com',
      password: 'admin123'
    })

    if (error) {
      console.error('❌ Erro no login:', error.message)
      return
    }

    console.log('✅ Login bem-sucedido!')
    console.log('👤 User ID:', data.user.id)
    console.log('📧 Email:', data.user.email)

    // Agora simular exatamente o que o authStore faz
    console.log('\n🔍 Buscando dados do psicólogo com supabaseWithRetry...')
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

    if (psicologoError || !psicologoData) {
      console.error('❌ Erro ao carregar dados do psicólogo:', psicologoError)
      console.error('📋 Dados retornados:', psicologoData)
      console.log('🚨 Este é o erro que aparece no frontend!')
      
      // Vamos tentar uma query mais simples para debug
      console.log('\n🔍 Tentando query simples sem retry...')
      const simpleResponse = await supabase
        .from('psicologos')
        .select('*')
        .eq('id', data.user.id)
        .single()
      console.log('📊 Resposta da query simples:', simpleResponse)
      
      return
    }

    console.log('✅ Dados do psicólogo carregados com sucesso:')
    console.log(psicologoData)

    // Fazer logout
    await supabase.auth.signOut()
    console.log('\n🚪 Logout realizado')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

debugFrontendLogin()