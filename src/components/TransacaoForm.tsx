import React from 'react'
import { X, Save, Calendar, FileText, User, CreditCard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, type TransacaoFinanceira, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { useCurrencyInput, useDateInput } from '../hooks/useMaskedInput'
import { formatDateFromISO } from '../utils/masks'
import { ReciboGenerator, type ReciboData, generateReciboNumber } from '../utils/reciboGenerator'

const transacaoSchema = z.object({
  tipo: z.enum(['receita', 'despesa'], { required_error: 'Selecione o tipo da transação' }),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  data_transacao: z.string().min(1, 'Data da transação é obrigatória'),
  data_vencimento: z.string().optional(),
  status: z.enum(['pago', 'pendente', 'vencido', 'cancelado']),
  categoria: z.string().optional(),
  forma_pagamento: z.string().optional(),
  paciente_id: z.string().optional(),
  observacoes: z.string().optional(),
})

type TransacaoFormData = z.infer<typeof transacaoSchema>

interface TransacaoFormProps {
  transacao?: TransacaoFinanceira | null
  pacientes: Paciente[]
  onClose: () => void
  onSave: () => void
}

export default function TransacaoForm({ transacao, pacientes, onClose, onSave }: TransacaoFormProps) {
  const { psicologo } = useAuthStore()
  const [loading, setLoading] = React.useState(false)
  const [loadingRecibo, setLoadingRecibo] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TransacaoFormData>({
    resolver: zodResolver(transacaoSchema),
    defaultValues: {
      tipo: transacao?.tipo || 'receita',
      descricao: transacao?.descricao || '',
      valor: transacao?.valor || 0,
      data_transacao: transacao?.data_transacao ? transacao.data_transacao.split('T')[0] : new Date().toISOString().split('T')[0],
      data_vencimento: transacao?.data_vencimento ? transacao.data_vencimento.split('T')[0] : '',
      status: transacao?.status || 'pendente',
      categoria: transacao?.categoria || '',
      forma_pagamento: transacao?.forma_pagamento || '',
      paciente_id: transacao?.paciente_id || '',
      observacoes: transacao?.observacoes || '',
    },
  })

  // Máscaras brasileiras
  const valorMask = useCurrencyInput(
    transacao?.valor || 0,
    (value) => setValue('valor', value)
  )

  const dataTransacaoMask = useDateInput(
    transacao?.data_transacao ? formatDateFromISO(transacao.data_transacao.split('T')[0]) : '',
    (value, isoValue) => setValue('data_transacao', isoValue)
  )

  const dataVencimentoMask = useDateInput(
    transacao?.data_vencimento ? formatDateFromISO(transacao.data_vencimento.split('T')[0]) : '',
    (value, isoValue) => setValue('data_vencimento', isoValue)
  )

  const tipoWatch = watch('tipo')

  const onSubmit = async (data: TransacaoFormData) => {
    if (!psicologo?.id) return

    try {
      setLoading(true)

      const transacaoData = {
        ...data,
        psicologo_id: psicologo.id,
        valor: valorMask.getValue(),
        data_transacao: new Date(dataTransacaoMask.getISOValue()).toISOString(),
        data_vencimento: dataVencimentoMask.getISOValue() ? new Date(dataVencimentoMask.getISOValue()).toISOString() : null,
        paciente_id: data.paciente_id || null,
      }

      if (transacao) {
        // Atualizar transação existente
        const { error } = await supabase
          .from('transacoes_financeiras')
          .update(transacaoData)
          .eq('id', transacao.id)

        if (error) throw error
        toast.success('Transação atualizada com sucesso!')
      } else {
        // Criar nova transação
        const { error } = await supabase
          .from('transacoes_financeiras')
          .insert([transacaoData])

        if (error) throw error
        toast.success('Transação criada com sucesso!')
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
      toast.error('Erro ao salvar transação')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarRecibo = async () => {
    if (!transacao || !psicologo) {
      toast.error('Dados insuficientes para gerar o recibo')
      return
    }

    // Validação de paciente obrigatório
    const pacienteSelecionado = pacientes.find(p => p.id === watch('paciente_id'))
    if (!pacienteSelecionado) {
      toast.error('Selecione um paciente para gerar o recibo')
      return
    }

    // Validação de tipo e status
    if (watch('tipo') !== 'receita') {
      toast.error('Recibos só podem ser gerados para receitas')
      return
    }

    if (watch('status') !== 'pago') {
      toast.error('Recibos só podem ser gerados para transações pagas')
      return
    }

    try {
      setLoadingRecibo(true)

      // Preparar dados do recibo
      const numeroRecibo = await generateReciboNumber()
      const reciboData: ReciboData = {
        numero_recibo: numeroRecibo,
        valor_recibo: valorMask.getValue(),
        data_emissao: new Date().toISOString(),
        descricao_servico: watch('descricao') || 'Serviços de Psicologia',
        forma_pagamento: watch('forma_pagamento'),
        data_pagamento: watch('data_transacao'),
        observacoes: watch('observacoes'),

        // Dados do emissor (psicólogo)
        emissor_nome: psicologo.nome,
        emissor_cpf: psicologo.cpf,
        emissor_crp: psicologo.crp,
        emissor_endereco: psicologo.endereco,
        emissor_telefone: psicologo.telefone,
        emissor_email: psicologo.email,

        // Dados do pagador (paciente)
        pagador_nome: pacienteSelecionado.nome,
        pagador_cpf: pacienteSelecionado.cpf,
        pagador_endereco: pacienteSelecionado.endereco,
        pagador_telefone: pacienteSelecionado.telefone,
        pagador_email: pacienteSelecionado.email,
      }

      // Gerar e baixar o recibo
      const reciboGenerator = new ReciboGenerator()
      reciboGenerator.downloadRecibo(reciboData, `recibo-${numeroRecibo}.pdf`)

      toast.success('Recibo gerado e baixado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar recibo:', error)
      toast.error('Erro ao gerar o recibo')
    } finally {
      setLoadingRecibo(false)
    }
  }

  const categorias = {
    receita: [
      'Consulta Individual',
      'Consulta Casal',
      'Consulta Familiar',
      'Terapia de Grupo',
      'Avaliação Psicológica',
      'Supervisão',
      'Palestra',
      'Workshop',
      'Outros'
    ],
    despesa: [
      'Aluguel',
      'Material de Escritório',
      'Equipamentos',
      'Cursos e Capacitação',
      'Marketing',
      'Telefone/Internet',
      'Transporte',
      'Alimentação',
      'Impostos',
      'Outros'
    ]
  }

  const formasPagamento = [
    'Dinheiro',
    'PIX',
    'Cartão de Débito',
    'Cartão de Crédito',
    'Transferência Bancária',
    'Boleto',
    'Cheque'
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] form-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {transacao ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 inline mr-1" />
                Tipo *
              </label>
              <select
                {...register('tipo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Descrição *
            </label>
            <input
              type="text"
              {...register('descricao')}
              placeholder="Ex: Consulta individual - João Silva"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.descricao && (
              <p className="mt-1 text-sm text-red-600">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                R$ *
              </label>
              <input
                type="text"
                value={valorMask.displayValue}
                onChange={(e) => valorMask.onChange(e.target.value)}
                onBlur={valorMask.onBlur}
                onFocus={valorMask.onFocus}
                placeholder="R$ 0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.valor && (
                <p className="mt-1 text-sm text-red-600">{errors.valor.message}</p>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                {...register('categoria')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {categorias[tipoWatch]?.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              {errors.categoria && (
                <p className="mt-1 text-sm text-red-600">{errors.categoria.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Data da Transação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data da Transação *
              </label>
              <input
                type="text"
                value={dataTransacaoMask.displayValue}
                onChange={(e) => dataTransacaoMask.onChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.data_transacao && (
                <p className="mt-1 text-sm text-red-600">{errors.data_transacao.message}</p>
              )}
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data de Vencimento
              </label>
              <input
                type="text"
                value={dataVencimentoMask.displayValue}
                onChange={(e) => dataVencimentoMask.onChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.data_vencimento && (
                <p className="mt-1 text-sm text-red-600">{errors.data_vencimento.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Forma de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forma de Pagamento
              </label>
              <select
                {...register('forma_pagamento')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione a forma de pagamento</option>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
              {errors.forma_pagamento && (
                <p className="mt-1 text-sm text-red-600">{errors.forma_pagamento.message}</p>
              )}
            </div>

            {/* Paciente (apenas para receitas) */}
            {tipoWatch === 'receita' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Paciente
                </label>
                <select
                  {...register('paciente_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </select>
                {errors.paciente_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.paciente_id.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              {...register('observacoes')}
              rows={3}
              placeholder="Observações adicionais sobre a transação..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.observacoes && (
              <p className="mt-1 text-sm text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            
            {/* Botão Enviar Recibo - sempre visível para transações existentes */}
            {transacao && (
              <button
                type="button"
                onClick={handleEnviarRecibo}
                disabled={
                  loadingRecibo || 
                  watch('tipo') !== 'receita' || 
                  watch('status') !== 'pago' || 
                  !watch('paciente_id')
                }
                title={
                  !watch('paciente_id') 
                    ? 'Selecione um paciente para gerar o recibo'
                    : watch('tipo') !== 'receita'
                    ? 'Recibos só podem ser gerados para receitas'
                    : watch('status') !== 'pago'
                    ? 'Recibos só podem ser gerados para transações pagas'
                    : 'Gerar e baixar recibo da transação'
                }
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingRecibo ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Enviar Recibo
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {transacao ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}