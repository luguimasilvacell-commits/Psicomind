import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixTestUser() {
  try {
    console.log('Corrigindo usuário de teste...')
    
    // Buscar o usuário no Auth
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError)
      return
    }
    
    const testUser = users.users.find(user => user.email === 'teste@psicomind.com')
    
    if (!testUser) {
      console.error('Usuário teste@psicomind.com não encontrado no Auth')
      return
    }
    
    console.log('Usuário encontrado no Auth:', testUser.id)
    
    // Verificar se já existe na tabela psicologos
    const { data: existingPsicologo, error: checkError } = await supabase
      .from('psicologos')
      .select('*')
      .eq('id', testUser.id)
      .single()
    
    if (existingPsicologo) {
      console.log('Usuário já existe na tabela psicologos:', existingPsicologo)
      return
    }
    
    // Criar registro na tabela psicologos
    const { data: psicologoData, error: psicologoError } = await supabase
      .from('psicologos')
      .insert({
        id: testUser.id,
        email: 'teste@psicomind.com',
        nome: 'Dr. Teste',
        crp: 'CRP-01/54321', // CRP diferente para evitar conflito
        telefone: '(11) 99999-9999',
        senha_hash: 'dummy_hash' // Não é usado com Supabase Auth
      })
      .select()
      .single()

    if (psicologoError) {
      console.error('Erro ao criar psicólogo:', psicologoError)
      return
    }

    console.log('Usuário de teste corrigido com sucesso!')
    console.log('ID:', testUser.id)
    console.log('Email: teste@psicomind.com')
    console.log('Senha: 123456')
    console.log('Dados do psicólogo:', psicologoData)

  } catch (error) {
    console.error('Erro:', error)
  }
}

fixTestUser()