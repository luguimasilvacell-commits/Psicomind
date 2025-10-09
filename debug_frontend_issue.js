// Script para simular exatamente o problema do frontend
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Criando cliente Supabase...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugFrontendIssue() {
  try {
    console.log('🔍 Passo 1: Fazendo login...')
    
    // Fazer login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@psicomind.com',
      password: 'admin123'
    })

    if (authError) {
      console.error('❌ Erro no login:', authError)
      return
    }

    console.log('✅ Login bem-sucedido!')
    console.log('👤 User ID:', authData.user?.id)
    console.log('🔑 Access Token:', authData.session?.access_token ? 'Presente' : 'Ausente')

    // Verificar se o cliente tem o token
    console.log('🔍 Passo 2: Verificando estado do cliente Supabase...')
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('📊 Sessão atual:', sessionData.session ? 'Ativa' : 'Inativa')

    // Tentar fazer a query que está falhando
    console.log('🔍 Passo 3: Tentando buscar dados do psicólogo...')
    
    const { data: psicologoData, error: psicologoError } = await supabase
      .from('psicologos')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('📊 Resultado da query psicólogos:')
    console.log('  Data:', psicologoData)
    console.log('  Error:', psicologoError)

    if (psicologoError) {
      console.error('❌ Erro detalhado:', {
        message: psicologoError.message,
        details: psicologoError.details,
        hint: psicologoError.hint,
        code: psicologoError.code
      })
    }

    // Verificar headers da requisição
    console.log('🔍 Passo 4: Verificando configuração do cliente...')
    console.log('📊 URL do Supabase:', supabase.supabaseUrl)
    console.log('📊 Key do Supabase:', supabase.supabaseKey ? `${supabase.supabaseKey.substring(0, 20)}...` : 'UNDEFINED')

    // Logout
    console.log('🔍 Passo 5: Fazendo logout...')
    await supabase.auth.signOut()
    console.log('✅ Logout realizado!')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

debugFrontendIssue()