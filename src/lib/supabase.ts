import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Configuração do Supabase:')
console.log('- URL:', supabaseUrl)
console.log('- Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  console.error('- VITE_SUPABASE_URL:', supabaseUrl)
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey)
  throw new Error('Missing Supabase environment variables')
}

// Configuração do Supabase com timeout e retry
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'psicomind-web-app',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
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

// Tipos para o sistema de chat e integração
export interface Conversation {
  id: string
  psicologo_id: string
  paciente_id?: string
  phone_number: string
  contact_name?: string
  status: 'active' | 'archived' | 'blocked'
  last_message_at?: string
  metadata?: any
  created_at: string
  updated_at: string
  paciente?: Paciente
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location'
  direction: 'inbound' | 'outbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  external_id?: string
  media_url?: string
  metadata?: any
  created_at: string
  conversation?: Conversation
}

export interface Automation {
  id: string
  psicologo_id: string
  name: string
  description?: string
  trigger_type: 'keyword' | 'schedule' | 'webhook' | 'manual'
  trigger_config: any
  is_active: boolean
  n8n_workflow_id?: string
  created_at: string
  updated_at: string
}

export interface AutomationMessage {
  id: string
  automation_id: string
  conversation_id: string
  message_id: string
  trigger_data?: any
  execution_status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  created_at: string
  automation?: Automation
  conversation?: Conversation
  message?: Message
}

export interface AutomationConfig {
  id: string
  psicologo_id: string
  config_key: string
  config_value: any
  description?: string
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  psicologo_id?: string
  source: 'n8n' | 'evolution_api' | 'internal'
  event_type: string
  payload: any
  response_status?: number
  response_body?: any
  error_message?: string
  processed_at?: string
  created_at: string
}

export interface AutomationMetric {
  id: string
  psicologo_id: string
  automation_id?: string
  metric_type: 'message_sent' | 'message_received' | 'automation_triggered' | 'error_occurred'
  metric_value: number
  metadata?: any
  date: string
  created_at: string
  automation?: Automation
}