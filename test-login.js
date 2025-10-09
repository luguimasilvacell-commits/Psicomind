import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey ? 'Configurada' : 'Não configurada')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  try {
    console.log('Testando login...')
    
    // Tentar fazer login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'teste@psicomind.com',
      password: '123456',
    })

    if (error) {
      console.error('Erro no login:', error)
      return
    }

    console.log('Login bem-sucedido!')
    console.log('User ID:', data.user.id)
    console.log('Email:', data.user.email)

    // Buscar dados do psicólogo
    const { data: psicologoData, error: psicologoError } = await supabase
      .from('psicologos')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (psicologoError) {
      console.error('Erro ao buscar psicólogo:', psicologoError)
      return
    }

    console.log('Dados do psicólogo:', psicologoData)

  } catch (error) {
    console.error('Erro:', error)
  }
}

testLogin()