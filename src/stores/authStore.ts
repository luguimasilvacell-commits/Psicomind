import { create } from 'zustand'
import { supabase, type Psicologo } from '../lib/supabase'
import { supabaseWithRetry } from '../lib/supabaseUtils'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  psicologo: Psicologo | null
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
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Buscar dados do psicólogo com retry
        const { data: psicologoData, error: psicologoError } = await supabaseWithRetry(
          async () => {
            const response = await supabase
              .from('psicologos')
              .select('*')
              .eq('id', data.user.id)
              .single()
            return response
          },
          {
            maxRetries: 3,
            showToast: false // Não mostrar toast aqui, vamos tratar o erro manualmente
          }
        )

        if (psicologoError || !psicologoData) {
          return { error: 'Erro ao carregar dados do psicólogo. Verifique sua conexão.' }
        }

        set({ user: data.user, psicologo: psicologoData as Psicologo })
      }

      return {}
    } catch (error) {
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
    set({ user: null, psicologo: null })
  },

  initialize: async () => {
    set({ loading: true })
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Buscar dados do psicólogo
        const { data: psicologoData, error } = await supabase
          .from('psicologos')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error || !psicologoData) {
          set({ user: null, psicologo: null, loading: false })
          return
        }

        set({ user: session.user, psicologo: psicologoData, loading: false })
      } else {
        set({ user: null, psicologo: null, loading: false })
      }
    } catch (error) {
      set({ user: null, psicologo: null, loading: false })
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