import React, { useState, useEffect } from 'react'
import { Search, X, Phone, User, MessageSquare } from 'lucide-react'
import { supabase, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

interface PacienteSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPaciente: (paciente: Paciente) => void
}

export default function PacienteSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectPaciente 
}: PacienteSelectionModalProps) {
  const { psicologo } = useAuthStore()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen && psicologo?.id) {
      loadPacientes()
    }
  }, [isOpen, psicologo?.id])

  const loadPacientes = async () => {
    if (!psicologo?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .eq('status', 'ativo')
        .order('nome')

      if (error) throw error
      setPacientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast.error('Erro ao carregar lista de pacientes')
    } finally {
      setLoading(false)
    }
  }

  const filteredPacientes = pacientes.filter(paciente =>
    paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.telefone.includes(searchTerm) ||
    paciente.cpf.includes(searchTerm)
  )

  const handleSelectPaciente = (paciente: Paciente) => {
    onSelectPaciente(paciente)
    onClose()
    setSearchTerm('')
  }

  const formatPhone = (phone: string) => {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '')
    
    // Formatar como (XX) XXXXX-XXXX
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Iniciar Conversa com Paciente
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Pacientes List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPacientes.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Nenhum paciente encontrado com os critérios de busca.'
                  : 'Nenhum paciente ativo encontrado.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPacientes.map((paciente) => (
                <button
                  key={paciente.id}
                  onClick={() => handleSelectPaciente(paciente)}
                  className="w-full p-4 text-left bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-gray-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {paciente.nome}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {formatPhone(paciente.telefone)}
                        </div>
                        {paciente.email && (
                          <div className="flex items-center">
                            <span>📧</span>
                            <span className="ml-1">{paciente.email}</span>
                          </div>
                        )}
                      </div>
                      {paciente.observacoes && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {paciente.observacoes}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredPacientes.length} paciente(s) encontrado(s)
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}