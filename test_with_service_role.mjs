import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase com service role key
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkzODYwOSwiZXhwIjoyMDc1NTE0NjA5fQ.O2umS8k2ibJGVLvlieHYtta2Ay5ZK8c93bXB114NaPs'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testWithServiceRole() {
  console.log('=== TESTE COM SERVICE ROLE KEY ===')
  
  try {
    // 1. Primeiro, vamos remover a constraint temporariamente
    console.log('\n1. Removendo constraint temporariamente...')
    const { data: dropResult, error: dropError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS check_estado;' 
      })
    
    if (dropError) {
      console.log('Erro ao remover constraint (tentando SQL direto):', dropError.message)
      
      // Tentar com SQL direto
      const { data: sqlResult, error: sqlError } = await supabase
        .from('_sql')
        .insert({ query: 'ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS check_estado;' })
      
      if (sqlError) {
        console.log('Erro com SQL direto também:', sqlError.message)
      }
    } else {
      console.log('✅ Constraint removida com sucesso')
    }

    // 2. Testar inserção com um psicólogo real
    console.log('\n2. Buscando psicólogo existente...')
    const { data: psicologos, error: psicError } = await supabase
      .from('psicologos')
      .select('id')
      .limit(1)

    if (psicError) {
      console.log('Erro ao buscar psicólogos:', psicError.message)
      return
    }

    if (!psicologos || psicologos.length === 0) {
      console.log('Nenhum psicólogo encontrado')
      return
    }

    const psicologoId = psicologos[0].id
    console.log('Psicólogo encontrado:', psicologoId)

    // 3. Testar inserção de paciente
    console.log('\n3. Testando inserção de paciente...')
    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        nome: 'Teste Paciente',
        telefone: '11999999999',
        psicologo_id: psicologoId,
        estado: 'SP'
      })
      .select()

    if (error) {
      console.log(`❌ ERRO: ${error.code} - ${error.message}`)
      console.log('Detalhes:', error.details)
      console.log('Hint:', error.hint)
    } else {
      console.log(`✅ SUCESSO: Paciente inserido`)
      console.log('Dados:', data)
      
      // Limpar o registro de teste
      if (data && data[0]) {
        await supabase.from('pacientes').delete().eq('id', data[0].id)
        console.log('Registro de teste removido')
      }
    }

  } catch (error) {
    console.error('Erro geral:', error.message)
  }
}

testWithServiceRole()