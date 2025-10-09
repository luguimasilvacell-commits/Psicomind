import React from 'react'
import { X, Save, User, Mail, Phone, MapPin, Calendar, FileText, Heart } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { useMaskedInput, useDateInput } from '../hooks/useMaskedInput'
import { isValidCPF, isValidPhone, isValidCEP, formatDateFromISO } from '../utils/masks'

const pacienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().min(1, 'Telefone é obrigatório').refine((val) => isValidPhone(val), 'Telefone inválido'),
  cpf: z.string().optional().refine((val) => !val || isValidCPF(val), 'CPF inválido'),
  data_nascimento: z.string().optional(),
  endereco: z.string().optional(),
  cep: z.string().optional().refine((val) => !val || isValidCEP(val), 'CEP inválido'),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  profissao: z.string().optional(),
  estado_civil: z.string().optional(),
  contato_emergencia: z.string().optional().refine((val) => !val || isValidPhone(val), 'Telefone de emergência inválido'),
  observacoes: z.string().optional(),
})

type PacienteForm = z.infer<typeof pacienteSchema>
type PacienteFormData = PacienteForm

interface PacienteFormProps {
  paciente?: Paciente | null
  onClose: () => void
  onSave: () => void
}

export default function PacienteForm({ paciente, onClose, onSave }: PacienteFormProps) {
  const { psicologo, user } = useAuthStore()
  const [loading, setLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: paciente?.nome || '',
      cpf: paciente?.cpf || '',
      telefone: paciente?.telefone || '',
      email: paciente?.email || '',
      data_nascimento: paciente?.data_nascimento || '',
      endereco: paciente?.endereco || '',
      cep: paciente?.cep || '',
      cidade: paciente?.cidade || '',
      estado: paciente?.estado || '',
      profissao: paciente?.profissao || '',
      estado_civil: paciente?.estado_civil || '',
      contato_emergencia: paciente?.contato_emergencia || '',
      observacoes: paciente?.observacoes || '',
    },
  })

  // Hooks para máscaras - usando consistentemente os hooks
  const cpfMask = useMaskedInput({
    initialValue: paciente?.cpf || '',
    maskType: 'cpf',
    onChange: (value, rawValue) => setValue('cpf', rawValue)
  })

  const telefoneMask = useMaskedInput({
    initialValue: paciente?.telefone || '',
    maskType: 'phone',
    onChange: (value, rawValue) => setValue('telefone', rawValue)
  })

  const cepMask = useMaskedInput({
    initialValue: paciente?.cep || '',
    maskType: 'cep',
    onChange: (value, rawValue) => setValue('cep', rawValue)
  })

  const contatoEmergenciaMask = useMaskedInput({
    initialValue: paciente?.contato_emergencia || '',
    maskType: 'phone',
    onChange: (value, rawValue) => setValue('contato_emergencia', rawValue)
  })

  const dataNascimento = useDateInput(
    paciente?.data_nascimento || '',
    (value, isoValue) => setValue('data_nascimento', isoValue)
  )

  const onSubmit = async (data: PacienteFormData) => {
    console.log('🚀 === INÍCIO DO PROCESSO DE SALVAMENTO ===')
    console.log('📝 Dados do formulário recebidos:', data)
    
    console.log('🔐 === DEBUG AUTENTICAÇÃO ===')
    console.log('Psicologo do store:', psicologo)
    console.log('User do store:', user)
    console.log('Psicologo ID:', psicologo?.id)
    console.log('User ID:', user?.id)
    
    // Verificar sessão atual do Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log('Sessão atual do Supabase:', sessionData.session)
    console.log('Erro de sessão:', sessionError)
    
    if (sessionData.session) {
      console.log('✅ Sessão ativa - User ID:', sessionData.session.user.id)
      console.log('Email da sessão:', sessionData.session.user.email)
    } else {
      console.log('❌ PROBLEMA: Nenhuma sessão ativa no Supabase!')
      toast.error('Sessão expirada. Faça login novamente.')
      return
    }

    if (!psicologo?.id) {
      console.log('❌ ERRO: Psicólogo não identificado')
      toast.error('Erro: Psicólogo não identificado. Faça login novamente.')
      return
    }

    console.log('📋 === PREPARANDO DADOS PARA SALVAMENTO ===')
    setLoading(true)
    try {
      // Obter valores das máscaras
      const cpfValue = cpfMask.getRawValue()
      const telefoneValue = telefoneMask.getRawValue()
      const cepValue = cepMask.getRawValue()
      const contatoEmergenciaValue = contatoEmergenciaMask.getRawValue()
      const dataNascimentoValue = dataNascimento.getISOValue()

      console.log('🎭 Valores das máscaras:')
      console.log('- CPF:', cpfValue)
      console.log('- Telefone:', telefoneValue)
      console.log('- CEP:', cepValue)
      console.log('- Contato Emergência:', contatoEmergenciaValue)
      console.log('- Data Nascimento:', dataNascimentoValue)

      const pacienteData = {
        ...data,
        psicologo_id: psicologo.id,
        cpf: cpfValue || null,
        telefone: telefoneValue,
        cep: cepValue || null,
        contato_emergencia: contatoEmergenciaValue || null,
        data_nascimento: dataNascimentoValue || null,
        email: data.email || null,
      }

      // Validação adicional antes do salvamento
      console.log('🔍 === VALIDAÇÃO ADICIONAL ===')
      
      // Verificar se telefone está preenchido (campo obrigatório)
      if (!telefoneValue || telefoneValue.length < 10) {
        console.log('❌ ERRO: Telefone inválido ou não preenchido')
        toast.error('Telefone é obrigatório e deve ter pelo menos 10 dígitos')
        return
      }

      // Log detalhado para debug do campo estado
      console.log('🏛️ === DEBUG CAMPO ESTADO ===')
      console.log('Valor original do form data.estado:', data.estado)
      console.log('Tipo do valor:', typeof data.estado)
      console.log('Valor no pacienteData.estado:', pacienteData.estado)
      console.log('Tipo do valor no pacienteData:', typeof pacienteData.estado)
      console.log('É string vazia?:', data.estado === '')
      console.log('É undefined?:', data.estado === undefined)
      console.log('É null?:', data.estado === null)
      
      // CORREÇÃO: Converter string vazia para null para evitar erro da constraint
      if (pacienteData.estado === '') {
        console.log('🔧 CORREÇÃO: Convertendo string vazia para null')
        pacienteData.estado = null
      }
      
      // CORREÇÃO: Converter string vazia para null para evitar erro da constraint do estado_civil
      if (pacienteData.estado_civil === '') {
        console.log('🔧 CORREÇÃO: Convertendo estado_civil string vazia para null')
        pacienteData.estado_civil = null
      }
      
      console.log('✅ Valor final do estado após correção:', pacienteData.estado)
      console.log('📊 Dados completos do paciente:', JSON.stringify(pacienteData, null, 2))

      console.log('💾 === SALVANDO NO BANCO DE DADOS ===')
      if (paciente) {
        // Atualizar paciente existente
        console.log('🔄 Atualizando paciente existente ID:', paciente.id)
        const { error } = await supabase
          .from('pacientes')
          .update(pacienteData)
          .eq('id', paciente.id)

        if (error) {
          console.log('❌ ERRO na atualização:', error)
          throw error
        }
        console.log('✅ Paciente atualizado com sucesso!')
        toast.success('Paciente atualizado com sucesso!')
      } else {
        // Criar novo paciente
        console.log('➕ Criando novo paciente')
        const { error } = await supabase
          .from('pacientes')
          .insert(pacienteData)

        if (error) {
          console.log('❌ === ERRO DETALHADO NA CRIAÇÃO ===')
          console.log('Código do erro:', error.code)
          console.log('Mensagem:', error.message)
          console.log('Detalhes:', error.details)
          console.log('Hint:', error.hint)
          console.log('=====================================')
          
          if (error.code === '23514') {
            toast.error(`Erro na constraint check_estado: ${error.message}. Valor do estado: "${pacienteData.estado}"`)
          } else if (error.code === '42501') {
            toast.error(`Erro de permissão (RLS): ${error.message}. Verifique se você está logado corretamente.`)
          } else {
            throw error
          }
          return
        }
        console.log('✅ Paciente criado com sucesso!')
        toast.success('Paciente cadastrado com sucesso!')
      }

      console.log('🎉 === SALVAMENTO CONCLUÍDO COM SUCESSO ===')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('💥 ERRO CRÍTICO ao salvar paciente:', error)
      console.error('Stack trace:', error.stack)
      toast.error(`Erro ao salvar paciente: ${error.message}`)
    } finally {
      console.log('🏁 === FINALIZANDO PROCESSO DE SALVAMENTO ===')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] form-scrollbar scroll-indicator overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {paciente ? 'Editar Paciente' : 'Novo Paciente'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Dados Pessoais */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Dados Pessoais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  {...register('nome')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome completo do paciente"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  CPF
                </label>
                <input
                  type="text"
                  value={cpfMask.value}
                  onChange={cpfMask.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefone *
                </label>
                <input
                  type="text"
                  value={telefoneMask.value}
                  onChange={telefoneMask.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(11) 99999-9999"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data de Nascimento
                </label>
                <input
                  type="text"
                  value={dataNascimento.value}
                  onChange={dataNascimento.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Endereço (Opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  CEP
                </label>
                <input
                  type="text"
                  value={cepMask.value}
                  onChange={cepMask.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="00000-000"
                />
                {errors.cep && (
                  <p className="mt-1 text-sm text-red-600">{errors.cep.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  {...register('cidade')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome da cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  {...register('estado')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione o estado</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo
                </label>
                <input
                  {...register('endereco')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rua, número, bairro, complemento..."
                />
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Informações Adicionais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Profissão
                </label>
                <input
                  {...register('profissao')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Profissão do paciente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Heart className="h-4 w-4 inline mr-1" />
                  Estado Civil
                </label>
                <select
                  {...register('estado_civil')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione o estado civil</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União Estável</option>
                  <option value="separado">Separado(a)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Contato de Emergência
                </label>
                <input
                  type="text"
                  value={contatoEmergenciaMask.value}
                  onChange={contatoEmergenciaMask.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(11) 99999-9999"
                />
                {errors.contato_emergencia && (
                  <p className="mt-1 text-sm text-red-600">{errors.contato_emergencia.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  {...register('observacoes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações adicionais sobre o paciente..."
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {paciente ? 'Atualizar' : 'Cadastrar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}