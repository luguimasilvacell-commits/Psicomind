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
  const { psicologo } = useAuthStore()
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

  // Hooks para máscaras
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
    if (!psicologo?.id) return

    setLoading(true)
    try {
      const pacienteData = {
        ...data,
        psicologo_id: psicologo.id,
        cpf: cpfMask.getRawValue() || null,
        telefone: telefoneMask.getRawValue(),
        cep: cepMask.getRawValue() || null,
        contato_emergencia: contatoEmergenciaMask.getRawValue() || null,
        data_nascimento: dataNascimento.getISOValue() || null,
        email: data.email || null,
      }

      if (paciente) {
        // Atualizar paciente existente
        const { error } = await supabase
          .from('pacientes')
          .update(pacienteData)
          .eq('id', paciente.id)

        if (error) throw error
        toast.success('Paciente atualizado com sucesso!')
      } else {
        // Criar novo paciente
        const { error } = await supabase
          .from('pacientes')
          .insert(pacienteData)

        if (error) throw error
        toast.success('Paciente cadastrado com sucesso!')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar paciente:', error)
      if (error.code === '23505') {
        toast.error('CPF já cadastrado para outro paciente')
      } else {
        toast.error('Erro ao salvar paciente')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
                  onChange={(e) => cpfMask.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data de Nascimento
                </label>
                <input
                  type="text"
                  value={dataNascimento.displayValue}
                  onChange={(e) => dataNascimento.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                />
                {errors.data_nascimento && (
                  <p className="mt-1 text-sm text-red-600">{errors.data_nascimento.message}</p>
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
            </div>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Contato</h4>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefone *
                </label>
                <input
                  type="text"
                  value={telefoneMask.value}
                  onChange={(e) => telefoneMask.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone.message}</p>
                )}
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
                  onChange={(e) => cepMask.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="00000-000"
                  maxLength={9}
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
                  placeholder="Cidade"
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
                  onChange={(e) => contatoEmergenciaMask.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {errors.contato_emergencia && (
                  <p className="mt-1 text-sm text-red-600">{errors.contato_emergencia.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Observações
                </label>
                <textarea
                  {...register('observacoes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações gerais sobre o paciente..."
                />
              </div>
            </div>
          </div>

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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}