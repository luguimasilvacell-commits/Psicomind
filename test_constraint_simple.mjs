import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = 'https://nxfoatgbxggnartkvxxz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzg2MDksImV4cCI6MjA3NTUxNDYwOX0.Dcby8h2Jqu3RA1cMZec6rasq-50kwUQzV7Groh6eIuA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConstraint() {
  console.log('=== TESTE SIMPLES DE CONSTRAINT CHECK_ESTADO ===')
  
  try {
    // Testar apenas alguns valores críticos
    const testValues = [
      { estado: 'SP', description: 'São Paulo (válido)' },
      { estado: '', description: 'String vazia' },
      { estado: null, description: 'Valor null' },
      { estado: 'XX', description: 'Estado inválido' },
    ]

    for (const test of testValues) {
      console.log(`\nTestando: ${test.description}`)
      console.log(`Valor: ${JSON.stringify(test.estado)}`)
      
      try {
        const { data, error } = await supabase
          .from('pacientes')
          .insert({
            nome: `Teste ${test.description}`,
            telefone: '11999999999',
            psicologo_id: '00000000-0000-0000-0000-000000000000',
            estado: test.estado
          })
          .select()

        if (error) {
          console.log(`❌ ERRO: ${error.code} - ${error.message}`)
          if (error.code === '23514') {
            console.log(`🎯 CONSTRAINT VIOLADA! Valor: ${JSON.stringify(test.estado)}`)
          }
        } else {
          console.log(`✅ SUCESSO: Inserção realizada`)
          // Limpar o registro de teste
          if (data && data[0]) {
            await supabase.from('pacientes').delete().eq('id', data[0].id)
          }
        }
      } catch (err) {
        console.log(`❌ ERRO INESPERADO:`, err.message)
      }
    }

  } catch (error) {
    console.error('Erro geral:', error.message)
  }
}

testConstraint()