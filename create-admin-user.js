import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  try {
    console.log('🔧 Criando usuário administrador...')
    
    const adminEmail = 'admin@psicomind.com'
    const adminPassword = 'admin123'
    
    // Verificar se o usuário admin já existe
    const { data: existingUser } = await supabase
      .from('psicologos')
      .select('id, email, role')
      .eq('email', adminEmail)
      .single()
    
    if (existingUser) {
      console.log('⚠️  Usuário admin já existe!')
      console.log(`📧 Email: ${existingUser.email}`)
      console.log(`👤 Role: ${existingUser.role}`)
      
      // Atualizar para admin se não for
      if (existingUser.role !== 'admin') {
        console.log('🔄 Atualizando role para admin...')
        const { error: updateError } = await supabase
          .from('psicologos')
          .update({ role: 'admin' })
          .eq('id', existingUser.id)
        
        if (updateError) {
          console.error('❌ Erro ao atualizar role:', updateError)
          return
        }
        console.log('✅ Role atualizada para admin!')
      }
      
      console.log('✅ Usuário admin configurado com sucesso!')
      return
    }

    // Criar usuário no Supabase Auth
    console.log('👤 Criando usuário no Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        nome: 'Administrador do Sistema'
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError)
      return
    }

    console.log('✅ Usuário criado no Auth:', authData.user.id)

    // Criar registro na tabela psicologos
    console.log('📝 Criando registro na tabela psicologos...')
    const { data: psicologoData, error: psicologoError } = await supabase
      .from('psicologos')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        nome: 'Administrador do Sistema',
        crp: 'ADMIN-001',
        telefone: '(11) 99999-0000',
        senha_hash: 'supabase_auth_managed', // Não é usado com Supabase Auth
        role: 'admin'
      })
      .select()

    if (psicologoError) {
      console.error('❌ Erro ao criar registro do psicólogo:', psicologoError)
      
      // Tentar deletar o usuário do Auth se falhou
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.log('🧹 Usuário removido do Auth devido ao erro')
      return
    }

    console.log('🎉 Usuário administrador criado com sucesso!')
    console.log('📋 Detalhes do admin:')
    console.log(`   📧 Email: ${adminEmail}`)
    console.log(`   🔑 Senha: ${adminPassword}`)
    console.log(`   👤 Nome: Administrador do Sistema`)
    console.log(`   🆔 CRP: ADMIN-001`)
    console.log(`   🔐 Role: admin`)
    console.log(`   🆔 ID: ${authData.user.id}`)
    console.log('')
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!')
    console.log('🔒 O usuário admin tem acesso total ao sistema.')

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Função para verificar usuários admin existentes
async function listAdminUsers() {
  try {
    console.log('📋 Listando usuários admin...')
    
    const { data: admins, error } = await supabase
      .from('psicologos')
      .select('id, email, nome, crp, role, created_at')
      .eq('role', 'admin')
    
    if (error) {
      console.error('❌ Erro ao listar admins:', error)
      return
    }
    
    if (admins.length === 0) {
      console.log('📭 Nenhum usuário admin encontrado.')
      return
    }
    
    console.log(`👥 Encontrados ${admins.length} usuário(s) admin:`)
    admins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.nome} (${admin.email})`)
      console.log(`      🆔 ID: ${admin.id}`)
      console.log(`      📅 Criado em: ${new Date(admin.created_at).toLocaleString('pt-BR')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar admins:', error)
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2)

if (args.includes('--list') || args.includes('-l')) {
  listAdminUsers()
} else {
  createAdminUser()
}