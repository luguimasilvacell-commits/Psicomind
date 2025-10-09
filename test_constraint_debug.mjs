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

async function testConstraintDebug() {
  console.log('=== TESTE DE DEBUG DA CONSTRAINT CHECK_ESTADO ===')
  
  try {
    // 1. Verificar se a constraint existe
    console.log('\n1. Verificando se a constraint check_estado existe...')
    const { data: constraints, error: constraintError } = await supabaseAdmin
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'pacientes')
      .eq('constraint_name', 'check_estado')

    if (constraintError) {
      console.log('❌ Erro ao verificar constraints:', constraintError.message)
    } else if (constraints && constraints.length > 0) {
      console.log('✅ Constraint check_estado encontrada:', constraints[0])
    } else {
      console.log('❌ Constraint check_estado NÃO encontrada!')
    }

    // 2. Buscar um psicólogo para usar nos testes
    console.log('\n2. Buscando psicólogo para testes...')
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

    // 3. Testar inserção com estado válido
    console.log('\n3. Testando inserção com estado válido (SP)...')
    const { data: insertValid, error: validError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste Estado Válido',
        telefone: '11999999999',
        psicologo_id: psicologo.id,
        estado: 'SP'
      })
      .select()

    if (validError) {
      console.log(`❌ ERRO com estado válido: ${validError.code} - ${validError.message}`)
    } else {
      console.log(`✅ SUCESSO com estado válido: Paciente inserido!`)
      // Limpar teste
      if (insertValid && insertValid[0]) {
        await supabaseAdmin.from('pacientes').delete().eq('id', insertValid[0].id)
        console.log('🧹 Registro de teste removido')
      }
    }

    // 4. Testar inserção com estado inválido
    console.log('\n4. Testando inserção com estado inválido (XX)...')
    const { data: insertInvalid, error: invalidError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste Estado Inválido',
        telefone: '11999999999',
        psicologo_id: psicologo.id,
        estado: 'XX'
      })
      .select()

    if (invalidError) {
      console.log(`✅ ESPERADO: Erro com estado inválido: ${invalidError.code} - ${invalidError.message}`)
      if (invalidError.code === '23514') {
        console.log('🎯 Constraint check_estado está funcionando corretamente!')
      }
    } else {
      console.log(`❌ PROBLEMA: Estado inválido foi aceito! Constraint não está funcionando.`)
      // Limpar se inseriu
      if (insertInvalid && insertInvalid[0]) {
        await supabaseAdmin.from('pacientes').delete().eq('id', insertInvalid[0].id)
      }
    }

    // 5. Testar inserção com estado NULL
    console.log('\n5. Testando inserção com estado NULL...')
    const { data: insertNull, error: nullError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste Estado NULL',
        telefone: '11999999999',
        psicologo_id: psicologo.id,
        estado: null
      })
      .select()

    if (nullError) {
      console.log(`❌ ERRO com estado NULL: ${nullError.code} - ${nullError.message}`)
    } else {
      console.log(`✅ SUCESSO com estado NULL: Paciente inserido!`)
      // Limpar teste
      if (insertNull && insertNull[0]) {
        await supabaseAdmin.from('pacientes').delete().eq('id', insertNull[0].id)
        console.log('🧹 Registro de teste removido')
      }
    }

    // 6. Testar inserção com string vazia
    console.log('\n6. Testando inserção com string vazia ("")...')
    const { data: insertEmpty, error: emptyError } = await supabaseAdmin
      .from('pacientes')
      .insert({
        nome: 'Teste Estado Vazio',
        telefone: '11999999999',
        psicologo_id: psicologo.id,
        estado: ''
      })
      .select()

    if (emptyError) {
      console.log(`❌ ERRO com string vazia: ${emptyError.code} - ${emptyError.message}`)
      if (emptyError.code === '23514') {
        console.log('🎯 String vazia está sendo rejeitada pela constraint!')
      }
    } else {
      console.log(`✅ SUCESSO com string vazia: Paciente inserido!`)
      // Limpar teste
      if (insertEmpty && insertEmpty[0]) {
        await supabaseAdmin.from('pacientes').delete().eq('id', insertEmpty[0].id)
        console.log('🧹 Registro de teste removido')
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

testConstraintDebug()