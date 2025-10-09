import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase (mesma do frontend)
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzg2MDksImV4cCI6MjA3NTUxNDYwOX0.Dcby8h2Jqu3RA1cMZec6rasq-50kwUQzV7Groh6eIuA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

async function testSessionPersistence() {
  console.log('=== TESTE DE PERSISTÊNCIA DE SESSÃO ===')
  
  try {
    // 1. Verificar se há uma sessão persistida
    console.log('\n1. Verificando sessão persistida...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Erro ao obter sessão:', sessionError.message)
    } else if (sessionData.session) {
      console.log('✅ Sessão persistida encontrada!')
      console.log('User ID:', sessionData.session.user.id)
      console.log('Email:', sessionData.session.user.email)
      console.log('Expires at:', new Date(sessionData.session.expires_at * 1000))
      
      // 2. Testar se a sessão funciona para inserção
      console.log('\n2. Testando inserção com sessão persistida...')
      
      // Primeiro, buscar um psicólogo para usar como psicologo_id
      const { data: psicologos, error: psicError } = await supabase
        .from('psicologos')
        .select('id, nome')
        .eq('id', sessionData.session.user.id)
        .single()

      if (psicError || !psicologos) {
        console.log('❌ Erro ao buscar psicólogo:', psicError?.message)
        console.log('Isso pode indicar que o user ID da sessão não corresponde a um psicólogo')
        return
      }

      console.log('✅ Psicólogo encontrado:', psicologos.nome)

      // Tentar inserir paciente
      const { data: insertData, error: insertError } = await supabase
        .from('pacientes')
        .insert({
          nome: 'Teste Sessão Persistida',
          telefone: '11999999999',
          psicologo_id: psicologos.id,
          estado: 'SP'
        })
        .select()

      if (insertError) {
        console.log(`❌ ERRO na inserção: ${insertError.code} - ${insertError.message}`)
        if (insertError.code === '42501') {
          console.log('🎯 PROBLEMA: RLS está bloqueando mesmo com sessão ativa!')
          console.log('Isso indica que a sessão não está sendo enviada corretamente nas requisições')
        }
      } else {
        console.log(`✅ SUCESSO: Paciente inserido com sessão persistida!`)
        console.log('Dados:', insertData[0])
        
        // Limpar teste
        if (insertData && insertData[0]) {
          await supabase.from('pacientes').delete().eq('id', insertData[0].id)
          console.log('🧹 Registro de teste removido')
        }
      }
      
    } else {
      console.log('❌ Nenhuma sessão persistida encontrada')
      console.log('Isso explica por que o frontend não consegue inserir pacientes')
    }

    // 3. Verificar listener de mudanças de autenticação
    console.log('\n3. Configurando listener de autenticação...')
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 Auth state changed: ${event}`)
      if (session) {
        console.log('Session user ID:', session.user.id)
      } else {
        console.log('No session')
      }
    })

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

testSessionPersistence()