import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Configurações otimizadas para melhor conectividade
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'psicomind-web'
    },
    fetch: (url, options: RequestInit = {}) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.headers || {}),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).finally(() => {
        clearTimeout(timeoutId)
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Tipos TypeScript para as tabelas
export interface Psicologo {
  id: string
  email: string
  nome: string
  crp: string
  telefone: string
  role: 'admin' | 'psicologo'
  created_at: string
  updated_at: string
}

export interface Paciente {
  id: string
  psicologo_id: string
  nome: string
  cpf: string
  telefone: string
  email?: string
  data_nascimento: string
  endereco?: any
  cep?: string
  cidade?: string
  estado?: string
  endereco_completo?: string
  profissao?: string
  estado_civil?: string
  contato_emergencia?: string
  observacoes?: string
  status: 'ativo' | 'inativo' | 'arquivado'
  created_at: string
  updated_at: string
}

export interface Agendamento {
  id: string
  paciente_id: string
  psicologo_id: string
  data_hora: string
  duracao_minutos: number
  duracao?: number // Alias para duracao_minutos
  tipo: string
  valor: number
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'faltou'
  status_sessao: 'nao_iniciada' | 'em_andamento' | 'finalizada'
  observacoes?: string
  created_at: string
  updated_at: string
  paciente?: Paciente
}

export interface Prontuario {
  id: string
  paciente_id: string
  psicologo_id: string
  agendamento_id: string // Agora obrigatório para novos prontuários
  conteudo: string
  campos_estruturados?: any
  data_sessao: string
  diagnostico?: string
  observacoes?: string
  plano_tratamento?: string
  medicamentos?: string
  proxima_sessao?: string
  duracao_sessao_segundos?: number
  tempo_inicio_sessao?: string
  tempo_fim_sessao?: string
  created_at: string
  updated_at: string
  paciente?: Paciente
  agendamento?: Agendamento
}

export interface TransacaoFinanceira {
  id: string
  psicologo_id: string
  agendamento_id?: string
  paciente_id?: string
  tipo: 'receita' | 'despesa'
  valor: number
  categoria: string
  descricao?: string
  data_transacao: string
  data_vencimento?: string
  status: 'pago' | 'pendente' | 'vencido' | 'cancelado'
  forma_pagamento?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface ChatHistorico {
  id: string
  psicologo_id: string
  numero_whatsapp: string
  mensagem: string
  resposta?: string
  tipo: 'recebida' | 'enviada' | 'automatica'
  metadata?: any
  created_at: string
}

export interface ConversaPaciente {
  id: string
  psicologo_id: string
  paciente_id: string
  mensagem: string
  tipo: 'enviada' | 'recebida'
  status_entrega?: 'enviando' | 'entregue' | 'lida' | 'erro'
  metadata?: any
  created_at: string
}

// Novos tipos para o sistema reestruturado
export interface HistoricoPaciente {
  paciente_id: string
  paciente_nome: string
  agendamento_id: string
  data_hora: string
  duracao_minutos: number
  tipo_sessao: string
  valor: number
  status_agendamento: string
  status_sessao: string
  prontuario_id?: string
  diagnostico?: string
  observacoes?: string
  plano_tratamento?: string
  duracao_sessao_segundos?: number
  prontuario_criado_em?: string
  tem_prontuario: boolean
}

export interface SessaoAtiva {
  agendamento: Agendamento
  prontuario?: Prontuario
  timer_state?: {
    seconds: number
    isRunning: boolean
    isPaused: boolean
    startTime: Date | null
  }
}