import React from 'react'
import { X, Save, User, Calendar, Clock, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, type Agendamento, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { useCurrencyInput, useDateInput } from '../hooks/useMaskedInput'
import { formatDateFromISO } from '../utils/masks'
import { supabaseWithRetry } from '../lib/supabaseUtils'

const agendamentoSchema = z.object({
  paciente_id: z.string().min(1, 'Selecione um paciente'),
  data: z.string().min(1, 'Data é obrigatória'),
  hora: z.string().min(1, 'Hora é obrigatória'),
  duracao_minutos: z.number().min(15, 'Duração mínima de 15 minutos').max(240, 'Duração máxima de 4 horas'),
  tipo: z.enum(['consulta', 'retorno', 'avaliacao', 'terapia']),
  status: z.enum(['agendado', 'confirmado', 'realizado', 'cancelado', 'faltou']).default('agendado'),
  status_sessao: z.enum(['nao_iniciada', 'em_andamento', 'finalizada']).default('nao_iniciada'),
  observacoes: z.string().optional(),
  valor: z.number().min(0, 'Valor deve ser positivo').optional(),
})

type AgendamentoForm = z.infer<typeof agendamentoSchema>

interface AgendamentoFormProps {
  agendamento?: Agendamento | null
  pacientes: Paciente[]
  onClose: () => void
  onSave: () => void
  selectedDate?: Date
}

export default function AgendamentoForm({ 
  agendamento, 
  pacientes, 
  onClose, 
  onSave, 
  selectedDate 
}: AgendamentoFormProps) {
  const { psicologo } = useAuthStore()
  const [loading, setLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AgendamentoForm>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: agendamento ? {
      paciente_id: agendamento.paciente_id,
      data: agendamento.data_hora.split('T')[0],
      hora: agendamento.data_hora.split('T')[1].substring(0, 5),
      duracao_minutos: agendamento.duracao_minutos || 60,
      tipo: agendamento.tipo as any,
      status: agendamento.status as any,
      status_sessao: agendamento.status_sessao as any || 'nao_iniciada',
      observacoes: agendamento.observacoes || '',
      valor: agendamento.valor || undefined,
    } : {
      data: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      hora: '09:00',
      duracao_minutos: 60,
      tipo: 'consulta',
      status: 'agendado',
      status_sessao: 'nao_iniciada',
    }
  })

  // Máscaras brasileiras
  const valorMask = useCurrencyInput(
    agendamento?.valor || 0,
    (value) => setValue('valor', value)
  )

  const dataMask = useDateInput(
    agendamento ? formatDateFromISO(agendamento.data_hora.split('T')[0]) : '',
    (value, isoValue) => setValue('data', isoValue)
  )

  const watchedData = watch('data')
  const watchedHora = watch('hora')
  const watchedDuracao = watch('duracao_minutos')

  // Verificar conflitos de horário
  const [conflitos, setConflitos] = React.useState<Agendamento[]>([])

  React.useEffect(() => {
    const checkConflitos = async () => {
      if (!watchedData || !watchedHora || !watchedDuracao || !psicologo?.id) return

      const dataHora = `${watchedData}T${watchedHora}:00`
      const dataFim = new Date(dataHora)
      const duracao = typeof watchedDuracao === 'number' ? watchedDuracao : 60
      dataFim.setMinutes(dataFim.getMinutes() + duracao)

      try {
        const { data, error } = await supabaseWithRetry(
          async () => {
            return await supabase
              .from('agendamentos')
              .select('*, paciente:pacientes(*)')
              .eq('psicologo_id', psicologo.id)
              .gte('data_hora', dataHora)
              .lt('data_hora', dataFim.toISOString())
              .neq('status', 'cancelado')
          },
          {
            maxRetries: 3,
            showToast: false // Não mostrar toast para verificação de conflitos
          }
        )

        if (error) throw error

        // Filtrar o agendamento atual se estiver editando
        const conflitosEncontrados = (data || []).filter(a => 
          agendamento ? a.id !== agendamento.id : true
        )

        setConflitos(conflitosEncontrados)
      } catch (error) {
        console.error('Erro ao verificar conflitos:', error)
        // Em caso de erro, assumir que não há conflitos para não bloquear o usuário
        setConflitos([])
      }
    }

    checkConflitos()
  }, [watchedData, watchedHora, watchedDuracao, psicologo?.id, agendamento?.id])

  const onSubmit = async (data: AgendamentoForm) => {
    if (!psicologo?.id) return

    if (conflitos.length > 0) {
      toast.error('Existe conflito de horário com outro agendamento')
      return
    }

    setLoading(true)
    try {
      const dataHora = `${dataMask.getISOValue()}T${data.hora}:00`
      
      const agendamentoData = {
        psicologo_id: psicologo.id,
        paciente_id: data.paciente_id,
        data_hora: dataHora,
        duracao_minutos: data.duracao_minutos,
        tipo: data.tipo,
        status: data.status,
        status_sessao: data.status_sessao,
        observacoes: data.observacoes || null,
        valor: valorMask.getValue() || null,
      }

      if (agendamento) {
        // Atualizar agendamento existente
        const { error } = await supabaseWithRetry(
          async () => {
            return await supabase
              .from('agendamentos')
              .update(agendamentoData)
              .eq('id', agendamento.id)
          },
          {
            maxRetries: 3,
            showToast: false // Controlar toast manualmente
          }
        )

        if (error) throw error
        toast.success('Agendamento atualizado com sucesso!')
      } else {
        // Criar novo agendamento
        const { error } = await supabaseWithRetry(
          async () => {
            return await supabase
              .from('agendamentos')
              .insert(agendamentoData)
          },
          {
            maxRetries: 3,
            showToast: false // Controlar toast manualmente
          }
        )

        if (error) throw error
        toast.success('Agendamento criado com sucesso!')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error)
      toast.error('Erro ao salvar agendamento')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 7; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-1" />
              Paciente *
            </label>
            <select
              {...register('paciente_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um paciente</option>
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nome}
                </option>
              ))}
            </select>
            {errors.paciente_id && (
              <p className="mt-1 text-sm text-red-600">{errors.paciente_id.message}</p>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data *
              </label>
              <input
                type="text"
                value={dataMask.displayValue}
                onChange={(e) => dataMask.onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
              {errors.data && (
                <p className="mt-1 text-sm text-red-600">{errors.data.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora *
              </label>
              <select
                {...register('hora')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {generateTimeOptions().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.hora && (
                <p className="mt-1 text-sm text-red-600">{errors.hora.message}</p>
              )}
            </div>
          </div>

          {/* Duração e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração (minutos) *
              </label>
              <select
                {...register('duracao_minutos', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h 30min</option>
                <option value={120}>2 horas</option>
              </select>
              {errors.duracao_minutos && (
              <p className="mt-1 text-sm text-red-600">{errors.duracao_minutos.message}</p>
            )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Consulta *
              </label>
              <select
                {...register('tipo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="consulta">Consulta</option>
                <option value="retorno">Retorno</option>
                <option value="avaliacao">Avaliação</option>
                <option value="terapia">Terapia</option>
              </select>
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
              )}
            </div>
          </div>

          {/* Status e Status da Sessão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status do Agendamento
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
                <option value="faltou">Faltou</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status da Sessão
              </label>
              <select
                {...register('status_sessao')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="nao_iniciada">Não Iniciada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Valor
            </label>
            <input
              type="text"
              value={valorMask.displayValue}
              onChange={(e) => valorMask.onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="R$ 0,00"
            />
            {errors.valor && (
              <p className="mt-1 text-sm text-red-600">{errors.valor.message}</p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observações sobre o agendamento..."
            />
          </div>

          {/* Conflitos */}
          {conflitos.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                ⚠️ Conflito de Horário Detectado
              </h4>
              <div className="space-y-1">
                {conflitos.map((conflito) => (
                  <p key={conflito.id} className="text-sm text-red-700">
                    • {conflito.paciente?.nome} - {new Date(conflito.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || conflitos.length > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}