import { create } from 'zustand'
import { supabase, type Psicologo } from '../lib/supabase'
import { supabaseWithRetry } from '../lib/supabaseUtils'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  psicologo: Psicologo | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData: Partial<Psicologo>) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  isAdmin: () => boolean
  isPsicologo: () => boolean
  hasRole: (role: 'admin' | 'psicologo') => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  psicologo: null,
  token: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      console.log('🔍 [DEBUG] Iniciando processo de login para:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ [DEBUG] Erro na autenticação:', error)
        return { error: error.message }
      }

      console.log('✅ [DEBUG] Autenticação bem-sucedida, User ID:', data.user?.id)

      if (data.user) {
        console.log('🔍 [DEBUG] Iniciando busca dos dados do psicólogo...')
        
        // Buscar dados do psicólogo com retry
        const { data: psicologoData, error: psicologoError } = await supabaseWithRetry(
          async () => {
            console.log('🔄 [DEBUG] Executando query para buscar psicólogo com ID:', data.user.id)
            const response = await supabase
              .from('psicologos')
              .select('*')
              .eq('id', data.user.id)
              .single()
            console.log('📊 [DEBUG] Resposta da query psicólogos:', response)
            return response
          },
          {
            maxRetries: 3,
            showToast: false // Não mostrar toast aqui, vamos tratar o erro manualmente
          }
        )

        console.log('📋 [DEBUG] Resultado da busca - Data:', psicologoData, 'Error:', psicologoError)

        if (psicologoError || !psicologoData) {
          console.error('❌ [DEBUG] Falha ao carregar dados do psicólogo')
          console.error('Error details:', psicologoError)
          console.error('Data received:', psicologoData)
          return { error: 'Erro ao carregar dados do psicólogo. Verifique sua conexão.' }
        }

        console.log('✅ [DEBUG] Dados do psicólogo carregados com sucesso:', psicologoData)
        set({ user: data.user, psicologo: psicologoData as Psicologo, token: data.session?.access_token || null })
      }

      return {}
    } catch (error) {
      console.error('💥 [DEBUG] Erro geral no signIn:', error)
      return { error: 'Erro interno do servidor' }
    }
  },

  signUp: async (email: string, password: string, userData: Partial<Psicologo>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Criar registro do psicólogo
        const { error: psicologoError } = await supabase
          .from('psicologos')
          .insert({
            id: data.user.id,
            email,
            ...userData,
          })

        if (psicologoError) {
          return { error: 'Erro ao criar perfil do psicólogo' }
        }
      }

      return {}
    } catch (error) {
      return { error: 'Erro interno do servidor' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, psicologo: null, token: null })
  },

  initialize: async () => {
    console.log('🔄 Inicializando autenticação...')
    set({ loading: true })
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('📋 Resultado da sessão:')
      console.log('- Sessão:', session)
      console.log('- Erro da sessão:', sessionError)
      
      if (session?.user) {
        console.log('✅ Sessão encontrada para usuário:', session.user.email)
        console.log('- User ID:', session.user.id)
        console.log('- Expires at:', new Date(session.expires_at * 1000))
        
        // Buscar dados do psicólogo
        console.log('🔍 Buscando dados do psicólogo...')
        const { data: psicologoData, error } = await supabase
          .from('psicologos')
          .select('*')
          .eq('id', session.user.id)
          .single()

        console.log('📊 Resultado da busca do psicólogo:')
        console.log('- Dados:', psicologoData)
        console.log('- Erro:', error)

        if (error || !psicologoData) {
          console.log('❌ Erro ao buscar psicólogo ou psicólogo não encontrado')
          set({ user: null, psicologo: null, token: null, loading: false })
          return
        }

        console.log('✅ Autenticação inicializada com sucesso!')
        set({ user: session.user, psicologo: psicologoData, token: session.access_token, loading: false })
      } else {
        console.log('❌ Nenhuma sessão encontrada')
        set({ user: null, psicologo: null, token: null, loading: false })
      }
    } catch (error) {
      console.error('💥 Erro na inicialização:', error)
      set({ user: null, psicologo: null, token: null, loading: false })
    }
  },

  // Funções para verificar roles
  isAdmin: () => {
    const { psicologo } = get()
    return psicologo?.role === 'admin'
  },

  isPsicologo: () => {
    const { psicologo } = get()
    return psicologo?.role === 'psicologo'
  },

  hasRole: (role: 'admin' | 'psicologo') => {
    const { psicologo } = get()
    return psicologo?.role === role
  }
}))