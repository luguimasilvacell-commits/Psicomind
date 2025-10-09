import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConstraint() {
  console.log('=== TESTE DE CONSTRAINT CHECK_ESTADO ===')
  
  try {
    // 1. Verificar a definição atual da constraint
    console.log('\n1. Verificando constraint atual...')
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'pacientes' })
    
    if (constraintError) {
      console.log('Erro ao buscar constraints (esperado se RPC não existir):', constraintError.message)
    } else {
      console.log('Constraints encontradas:', constraints)
    }

    // 2. Testar inserção com diferentes valores de estado
    const testValues = [
      { estado: 'SP', description: 'São Paulo (válido)' },
      { estado: 'RJ', description: 'Rio de Janeiro (válido)' },
      { estado: '', description: 'String vazia' },
      { estado: null, description: 'Valor null' },
      { estado: undefined, description: 'Valor undefined' },
      { estado: 'XX', description: 'Estado inválido' },
      { estado: 'sp', description: 'Minúscula (inválido)' },
      { estado: 'São Paulo', description: 'Nome completo (inválido)' },
      { estado: '  SP  ', description: 'Com espaços (inválido)' },
    ]

    for (const test of testValues) {
      console.log(`\n2. Testando: ${test.description}`)
      console.log(`   Valor: ${JSON.stringify(test.estado)}`)
      console.log(`   Tipo: ${typeof test.estado}`)
      
      try {
        const { data, error } = await supabase
          .from('pacientes')
          .insert({
            nome: `Teste ${test.description}`,
            telefone: '11999999999',
            psicologo_id: '00000000-0000-0000-0000-000000000000', // UUID fictício
            estado: test.estado
          })
          .select()

        if (error) {
          console.log(`   ❌ ERRO: ${error.code} - ${error.message}`)
          if (error.code === '23514') {
            console.log(`   🎯 CONSTRAINT VIOLADA! Valor: ${JSON.stringify(test.estado)}`)
          }
        } else {
          console.log(`   ✅ SUCESSO: Inserção realizada`)
          // Limpar o registro de teste
          if (data && data[0]) {
            await supabase.from('pacientes').delete().eq('id', data[0].id)
          }
        }
      } catch (err) {
        console.log(`   ❌ ERRO INESPERADO:`, err)
      }
    }

  } catch (error) {
    console.error('Erro geral:', error)
  }
}

testConstraint()