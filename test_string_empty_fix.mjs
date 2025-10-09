import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase com service role (admin)
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testStringEmptyFix() {
  console.log('=== TESTE DA CORREÇÃO DE STRING VAZIA ===')
  
  try {
    // Buscar um psicólogo para usar nos testes
    const { data: psicologos, error: psicError } = await supabaseAdmin
      .from('psicologos')
      .select('id, nome')
      .limit(1)

    if (psicError || !psicologos || psicologos.length === 0) {
      console.log('❌ Erro ao buscar psicólogo:', psicError?.message)
      return
    }

    const psicologo = psicologos[0]
    console.log('✅ Psicólogo encontrado:', psicologo.nome)

    // Simular o que acontece no frontend: converter string vazia para null
    let estadoValue = '' // Valor que vem do formulário quando nenhum estado é selecionado
    
    console.log('\n🔧 Simulando correção do frontend:')
    console.log('Valor original:', `"${estadoValue}"`)
    console.log('É string vazia?:', estadoValue === '')
    
    // Aplicar a correção
    if (estadoValue === '') {
      console.log('✅ Convertendo string vazia para null')
      estadoValue = null
    }
    
    console.log('Valor após correção:', estadoValue)

    // Testar inserção com o valor corrigido
    console.log('\n📝 Testando inserção com valor corrigido...')
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste Correção String Vazia',
        telefone: '11999999999',
        psicologo_id: psicologo.id,
        estado: estadoValue
      })
      .select()

    if (insertError) {
      console.log(`❌ ERRO: ${insertError.code} - ${insertError.message}`)
    } else {
      console.log(`✅ SUCESSO: Paciente inserido com estado corrigido!`)
      console.log('Estado salvo no banco:', insertData[0].estado)
      
      // Limpar teste
      await supabaseAdmin.from('pacientes').delete().eq('id', insertData[0].id)
      console.log('🧹 Registro de teste removido')
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

testStringEmptyFix()