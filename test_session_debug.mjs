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

async function testSessionAndInsert() {
  console.log('=== TESTE DE SESSÃO E INSERÇÃO ===')
  
  try {
    // 1. Buscar um psicólogo para fazer login
    console.log('\n1. Buscando psicólogos...')
    const { data: psicologos, error: psicError } = await supabase
      .from('psicologos')
      .select('id, email, nome')
      .limit(1)

    if (psicError || !psicologos || psicologos.length === 0) {
      console.log('❌ Erro ao buscar psicólogos:', psicError?.message)
      return
    }

    const psicologo = psicologos[0]
    console.log(`✅ Psicólogo encontrado: ${psicologo.nome} (${psicologo.email})`)

    // 2. Simular o que acontece no frontend - verificar sessão atual
    console.log('\n2. Verificando sessão atual...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Erro ao obter sessão:', sessionError.message)
    } else if (sessionData.session) {
      console.log('✅ Sessão ativa encontrada')
      console.log('User ID da sessão:', sessionData.session.user.id)
      console.log('Email da sessão:', sessionData.session.user.email)
      
      // 3. Verificar se o user ID da sessão corresponde ao psicólogo
      if (sessionData.session.user.id === psicologo.id) {
        console.log('✅ User ID da sessão corresponde ao psicólogo!')
        
        // 4. Tentar inserir paciente com a sessão ativa
        console.log('\n4. Tentando inserir paciente com sessão ativa...')
        const { data, error } = await supabase
          .from('pacientes')
          .insert({
            nome: 'Teste Sessão Debug',
            telefone: '11999999999',
            psicologo_id: psicologo.id,
            estado: 'SP'
          })
          .select()

        if (error) {
          console.log(`❌ ERRO: ${error.code} - ${error.message}`)
          console.log('Details:', error.details)
          console.log('Hint:', error.hint)
        } else {
          console.log(`✅ SUCESSO: Paciente inserido!`)
          console.log('Dados:', data[0])
          
          // Limpar teste
          if (data && data[0]) {
            await supabase.from('pacientes').delete().eq('id', data[0].id)
            console.log('🧹 Registro de teste removido')
          }
        }
      } else {
        console.log(`❌ User ID da sessão (${sessionData.session.user.id}) NÃO corresponde ao psicólogo (${psicologo.id})`)
      }
    } else {
      console.log('❌ Nenhuma sessão ativa')
      
      // 5. Tentar inserir sem sessão (deve falhar com RLS)
      console.log('\n5. Tentando inserir paciente SEM sessão ativa...')
      const { data, error } = await supabase
        .from('pacientes')
        .insert({
          nome: 'Teste Sem Sessão',
          telefone: '11999999999',
          psicologo_id: psicologo.id,
          estado: 'SP'
        })
        .select()

      if (error) {
        console.log(`❌ ERRO ESPERADO: ${error.code} - ${error.message}`)
        if (error.code === '42501') {
          console.log('🎯 Confirmado: Erro de RLS por falta de autenticação')
        }
      } else {
        console.log(`⚠️ INESPERADO: Inserção funcionou sem autenticação!`)
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

testSessionAndInsert()