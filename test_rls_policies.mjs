import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase com service role
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkRLSStatus() {
  console.log('=== VERIFICAÇÃO SIMPLIFICADA DO RLS ===')
  
  try {
    // 1. Verificar psicólogos existentes
    console.log('\n1. Verificando psicólogos existentes...')
    const { data: psicologos, error: psicError } = await supabaseAdmin
      .from('psicologos')
      .select('id, email, nome')
      .limit(3)

    if (psicError) {
      console.log('❌ Erro ao buscar psicólogos:', psicError.message)
      return
    } else {
      console.log('✅ Psicólogos encontrados:')
      psicologos.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.nome} (${p.email}) - ID: ${p.id}`)
      })
    }

    // 2. Verificar pacientes existentes (com service role)
    console.log('\n2. Verificando pacientes existentes (service role)...')
    const { data: pacientes, error: pacientesError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, psicologo_id')
      .limit(5)

    if (pacientesError) {
      console.log('❌ Erro ao buscar pacientes:', pacientesError.message)
    } else {
      console.log(`✅ ${pacientes.length} pacientes encontrados:`)
      pacientes.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.nome} - Psicólogo ID: ${p.psicologo_id}`)
      })
    }

    // 3. Testar inserção com service role
    console.log('\n3. Testando inserção com service role...')
    const testPsicologo = psicologos[0]
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste RLS Debug',
        telefone: '11999999999',
        psicologo_id: testPsicologo.id,
        estado: 'SP'
      })
      .select()

    if (insertError) {
      console.log(`❌ ERRO na inserção: ${insertError.code} - ${insertError.message}`)
    } else {
      console.log(`✅ SUCESSO: Paciente inserido com service role`)
      console.log('Dados:', insertData[0])
      
      // Limpar teste
      if (insertData && insertData[0]) {
        await supabaseAdmin.from('pacientes').delete().eq('id', insertData[0].id)
        console.log('🧹 Registro de teste removido')
      }
    }

    // 4. Testar com cliente anônimo (simular frontend)
    console.log('\n4. Testando com cliente anônimo (simular frontend)...')
    const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzg2MDksImV4cCI6MjA3NTUxNDYwOX0.Dcby8h2Jqu3RA1cMZec6rasq-50kwUQzV7Groh6eIuA')
    
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('pacientes')
      .insert({
        nome: 'Teste Anon Debug',
        telefone: '11999999999',
        psicologo_id: testPsicologo.id,
        estado: 'SP'
      })
      .select()

    if (anonError) {
      console.log(`❌ ERRO esperado com anon: ${anonError.code} - ${anonError.message}`)
      if (anonError.code === '42501') {
        console.log('🎯 Confirmado: RLS está funcionando (bloqueando acesso não autenticado)')
      }
    } else {
      console.log(`⚠️ INESPERADO: Inserção funcionou com cliente anônimo!`)
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

checkRLSStatus()