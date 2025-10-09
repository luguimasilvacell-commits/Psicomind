import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Zm9hdGdieGdnbmFydGt2eHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkzODYwOSwiZXhwIjoyMDc1NTE0NjA5fQ.O2umS8k2ibJGVLvlieHYtta2Ay5ZK8c93bXB114NaPs'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestData() {
  try {
    console.log('Criando dados de teste...')
    
    // Buscar o ID do psicólogo de teste
    const { data: psicologos, error: psicologoError } = await supabase
      .from('psicologos')
      .select('id, email')

    console.log('Todos os psicólogos:', psicologos)
    console.log('Erro:', psicologoError)

    const psicologo = psicologos?.find(p => p.email === 'teste@psicomind.com')

    if (!psicologo) {
      console.error('Psicólogo de teste não encontrado')
      return
    }

    console.log('Psicólogo encontrado:', psicologo.id)

    // Criar pacientes de teste
    const pacientes = [
      {
        nome: 'Maria Silva',
        email: 'maria.silva@email.com',
        telefone: '(11) 98765-4321',
        data_nascimento: '1985-03-15',
        endereco: 'Rua das Flores, 123 - São Paulo, SP',
        psicologo_id: psicologo.id
      },
      {
        nome: 'João Santos',
        email: 'joao.santos@email.com',
        telefone: '(11) 97654-3210',
        data_nascimento: '1990-07-22',
        endereco: 'Av. Paulista, 456 - São Paulo, SP',
        psicologo_id: psicologo.id
      },
      {
        nome: 'Ana Costa',
        email: 'ana.costa@email.com',
        telefone: '(11) 96543-2109',
        data_nascimento: '1988-11-08',
        endereco: 'Rua Augusta, 789 - São Paulo, SP',
        psicologo_id: psicologo.id
      }
    ]

    const { data: pacientesData, error: pacientesError } = await supabase
      .from('pacientes')
      .insert(pacientes)

    if (pacientesError) {
      console.error('Erro ao criar pacientes:', pacientesError)
      return
    }

    console.log('Pacientes de teste criados com sucesso!')
    console.log('Total de pacientes criados:', pacientes.length)

  } catch (error) {
    console.error('Erro:', error)
  }
}

createTestData()