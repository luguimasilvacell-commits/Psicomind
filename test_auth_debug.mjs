import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzg2MDksImV4cCI6MjA3NTUxNDYwOX0.Dcby8h2Jqu3RA1cMZec6rasq-50kwUQzV7Groh6eIuA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('=== TESTE DE AUTENTICAÇÃO ===')
  
  try {
    // 1. Verificar sessão atual
    console.log('\n1. Verificando sessão atual...')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('Erro ao obter sessão:', sessionError.message)
    } else if (session.session) {
      console.log('✅ Sessão ativa encontrada')
      console.log('User ID:', session.session.user.id)
      console.log('Email:', session.session.user.email)
    } else {
      console.log('❌ Nenhuma sessão ativa')
    }

    // 2. Tentar fazer login com um psicólogo existente
    console.log('\n2. Buscando psicólogos existentes...')
    const { data: psicologos, error: psicError } = await supabase
      .from('psicologos')
      .select('id, email, nome')
      .limit(3)

    if (psicError) {
      console.log('Erro ao buscar psicólogos:', psicError.message)
      return
    }

    if (!psicologos || psicologos.length === 0) {
      console.log('Nenhum psicólogo encontrado')
      return
    }

    console.log('Psicólogos encontrados:')
    psicologos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nome} (${p.email}) - ID: ${p.id}`)
    })

    // 3. Tentar fazer login (assumindo que a senha é conhecida ou usar um teste)
    const testEmail = psicologos[0].email
    console.log(`\n3. Tentando login com: ${testEmail}`)
    
    // Nota: Não podemos fazer login sem a senha, então vamos simular
    // o que aconteceria se estivéssemos autenticados
    
    // 4. Testar inserção de paciente com o ID do psicólogo
    console.log('\n4. Testando inserção de paciente...')
    const psicologoId = psicologos[0].id
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        nome: 'Teste Auth Debug',
        telefone: '11999999999',
        psicologo_id: psicologoId,
        estado: 'SP'
      })
      .select()

    if (error) {
      console.log(`❌ ERRO: ${error.code} - ${error.message}`)
      if (error.code === '42501') {
        console.log('🎯 PROBLEMA DE RLS! O usuário não está autenticado ou não tem permissão')
        console.log('Isso confirma que o problema é de autenticação, não da constraint check_estado')
      }
    } else {
      console.log(`✅ SUCESSO: Paciente inserido (não deveria acontecer sem auth)`)
      // Limpar
      if (data && data[0]) {
        await supabase.from('pacientes').delete().eq('id', data[0].id)
      }
    }

  } catch (error) {
    console.error('Erro geral:', error.message)
  }
}

testAuth()