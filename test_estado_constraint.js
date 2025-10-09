// Script para testar a constraint de estado
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEstadoConstraint() {
  console.log('Testando constraint de estado...')
  
  // Primeiro, vamos tentar inserir um paciente com estado válido
  const validEstado = 'SP'
  console.log(`\nTestando estado válido: ${validEstado}`)
  
  const { data: validData, error: validError } = await supabase
    .from('pacientes')
    .insert({
      nome: 'Teste Estado Válido',
      telefone: '11999999999',
      estado: validEstado,
      psicologo_id: '1da6af50-2658-4047-873e-04ba7fde3e52' // ID de teste
    })
    .select()
  
  if (validError) {
    console.error('Erro ao inserir estado válido:', validError)
  } else {
    console.log('Estado válido inserido com sucesso:', validData)
    
    // Limpar o registro de teste
    if (validData && validData[0]) {
      await supabase.from('pacientes').delete().eq('id', validData[0].id)
      console.log('Registro de teste removido')
    }
  }
  
  // Agora vamos testar um estado inválido
  const invalidEstado = 'XX'
  console.log(`\nTestando estado inválido: ${invalidEstado}`)
  
  const { data: invalidData, error: invalidError } = await supabase
    .from('pacientes')
    .insert({
      nome: 'Teste Estado Inválido',
      telefone: '11999999999',
      estado: invalidEstado,
      psicologo_id: '1da6af50-2658-4047-873e-04ba7fde3e52' // ID de teste
    })
    .select()
  
  if (invalidError) {
    console.log('Constraint funcionando corretamente - estado inválido rejeitado:', invalidError.message)
  } else {
    console.error('PROBLEMA: Estado inválido foi aceito!', invalidData)
    
    // Limpar o registro se foi inserido incorretamente
    if (invalidData && invalidData[0]) {
      await supabase.from('pacientes').delete().eq('id', invalidData[0].id)
    }
  }
  
  // Testar estado null (deve ser aceito)
  console.log(`\nTestando estado null (deve ser aceito)`)
  
  const { data: nullData, error: nullError } = await supabase
    .from('pacientes')
    .insert({
      nome: 'Teste Estado Null',
      telefone: '11999999999',
      estado: null,
      psicologo_id: '1da6af50-2658-4047-873e-04ba7fde3e52' // ID de teste
    })
    .select()
  
  if (nullError) {
    console.error('Erro ao inserir estado null:', nullError)
  } else {
    console.log('Estado null aceito corretamente:', nullData)
    
    // Limpar o registro de teste
    if (nullData && nullData[0]) {
      await supabase.from('pacientes').delete().eq('id', nullData[0].id)
      console.log('Registro de teste removido')
    }
  }
}

testEstadoConstraint().catch(console.error)