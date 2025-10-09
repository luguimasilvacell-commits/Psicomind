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

async function createTestUser() {
  try {
    console.log('Criando usuário de teste...')
    
    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'teste@psicomind.com',
      password: '123456',
      email_confirm: true
    })

    if (authError) {
      console.error('Erro ao criar usuário:', authError)
      return
    }

    console.log('Usuário criado no Auth:', authData.user.id)

    // Criar registro na tabela psicologos
    const { data: psicologoData, error: psicologoError } = await supabase
      .from('psicologos')
      .insert({
        id: authData.user.id,
        email: 'teste@psicomind.com',
        nome: 'Dr. Teste',
        crp: 'CRP-01/12345',
        telefone: '(11) 99999-9999',
        senha_hash: 'dummy_hash' // Não é usado com Supabase Auth
      })

    if (psicologoError) {
      console.error('Erro ao criar psicólogo:', psicologoError)
      return
    }

    console.log('Usuário de teste criado com sucesso!')
    console.log('Email: teste@psicomind.com')
    console.log('Senha: 123456')

  } catch (error) {
    console.error('Erro:', error)
  }
}

createTestUser()