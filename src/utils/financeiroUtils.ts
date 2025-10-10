import { supabase } from '../lib/supabase'
import { TransacaoFinanceira, Agendamento, Paciente } from '../lib/supabase'

/**
 * Cria automaticamente uma transação financeira quando um agendamento é marcado como realizado
 */
export async function criarTransacaoFinanceiraAutomatica(
  agendamentoId: string,
  psicologoId: string
): Promise<TransacaoFinanceira | null> {
  try {
    // Verificar se já existe uma transação para este agendamento
    const { data: transacaoExistente, error: errorCheck } = await supabase
      .from('transacoes_financeiras')
      .select('*')
      .eq('agendamento_id', agendamentoId)
      .single()

    if (transacaoExistente) {
      console.log('Transação financeira já existe para este agendamento')
      return transacaoExistente
    }

    // Buscar dados do agendamento e paciente
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select(`
        *,
        paciente:pacientes(*)
      `)
      .eq('id', agendamentoId)
      .single()

    if (agendamentoError || !agendamento) {
      console.error('Erro ao buscar agendamento:', agendamentoError)
      return null
    }

    const paciente = agendamento.paciente

    // Formatar a data da sessão
    const dataFormatada = new Date(agendamento.data_hora).toLocaleDateString('pt-BR')
    
    // Criar a transação financeira
    const transacaoData = {
      psicologo_id: psicologoId,
      agendamento_id: agendamento.id,
      paciente_id: paciente.id,
      tipo: 'receita' as const,
      valor: agendamento.valor,
      categoria: 'Consulta Individual',
      descricao: `Faturamento do ${paciente.nome} referente a sessão do dia ${dataFormatada}`,
      data_transacao: new Date(agendamento.data_hora).toISOString().split('T')[0],
      status: 'pendente' as const,
    }

    const { data: novaTransacao, error } = await supabase
      .from('transacoes_financeiras')
      .insert([transacaoData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar transação financeira automática:', error)
      return null
    }

    console.log(`✅ Registro financeiro criado automaticamente para ${paciente.nome}`)
    return novaTransacao

  } catch (error) {
    console.error('Erro ao criar transação financeira automática:', error)
    return null
  }
}

/**
 * Verifica se existe uma transação financeira vinculada a um agendamento
 */
export async function verificarTransacaoFinanceira(agendamentoId: string): Promise<TransacaoFinanceira | null> {
  try {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('*')
      .eq('agendamento_id', agendamentoId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar transação financeira:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Erro ao verificar transação financeira:', error)
    return null
  }
}

/**
 * Busca transações financeiras vinculadas a um agendamento específico
 */
export async function buscarTransacoesVinculadas(agendamentoId: string, psicologoId: string): Promise<TransacaoFinanceira[]> {
  try {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('*')
      .eq('psicologo_id', psicologoId)
      .eq('agendamento_id', agendamentoId)

    if (error) {
      console.error('Erro ao buscar transações vinculadas:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro ao buscar transações vinculadas:', error)
    return []
  }
}