import React, { useState, useRef, useEffect } from 'react'
import { Search, User, Phone, Mail, Plus, ChevronDown } from 'lucide-react'
import { type Paciente } from '../lib/supabase'

interface PacienteLookupProps {
  pacientes: Paciente[]
  value?: string
  onChange: (pacienteId: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  disabled?: boolean
  onAddNew?: () => void
}

export default function PacienteLookup({
  pacientes,
  value,
  onChange,
  onBlur,
  error,
  placeholder = "Digite para buscar paciente...",
  disabled = false,
  onAddNew
}: PacienteLookupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<(HTMLDivElement | null)[]>([])

  // Encontrar paciente selecionado
  useEffect(() => {
    if (value) {
      const paciente = pacientes.find(p => p.id === value)
      setSelectedPaciente(paciente || null)
      if (paciente) {
        setSearchTerm(paciente.nome)
      }
    } else {
      setSelectedPaciente(null)
      setSearchTerm('')
    }
  }, [value, pacientes])

  // Filtrar pacientes baseado na busca
  const filteredPacientes = pacientes.filter(paciente =>
    paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.telefone?.includes(searchTerm)
  )

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
        // Restaurar nome do paciente selecionado se não houver seleção válida
        if (selectedPaciente) {
          setSearchTerm(selectedPaciente.nome)
        } else {
          setSearchTerm('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedPaciente])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setIsOpen(true)
    setFocusedIndex(-1)
    
    // Se limpar o campo, limpar seleção
    if (!newValue) {
      onChange('')
      setSelectedPaciente(null)
    }
  }

  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setSearchTerm(paciente.nome)
    onChange(paciente.id)
    setIsOpen(false)
    setFocusedIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(0)
      }
      return
    }

    const totalOptions = filteredPacientes.length + (onAddNew ? 1 : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => (prev + 1) % totalOptions)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => prev <= 0 ? totalOptions - 1 : prev - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < filteredPacientes.length) {
          handleSelectPaciente(filteredPacientes[focusedIndex])
        } else if (focusedIndex === filteredPacientes.length && onAddNew) {
          onAddNew()
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        if (selectedPaciente) {
          setSearchTerm(selectedPaciente.nome)
        }
        break
    }
  }

  // Scroll para opção focada
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [focusedIndex])

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          `}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredPacientes.length === 0 && !onAddNew ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Nenhum paciente encontrado
            </div>
          ) : (
            <>
              {/* Lista de Pacientes */}
              {filteredPacientes.map((paciente, index) => (
                <div
                  key={paciente.id}
                  ref={el => optionsRef.current[index] = el}
                  onClick={() => handleSelectPaciente(paciente)}
                  className={`
                    px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0
                    ${focusedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    ${selectedPaciente?.id === paciente.id ? 'bg-blue-100' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {getInitials(paciente.nome)}
                    </div>
                    
                    {/* Informações do Paciente */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {paciente.nome}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {paciente.telefone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{paciente.telefone}</span>
                          </div>
                        )}
                        {paciente.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{paciente.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Opção Adicionar Novo */}
              {onAddNew && (
                <div
                  ref={el => optionsRef.current[filteredPacientes.length] = el}
                  onClick={() => {
                    onAddNew()
                    setIsOpen(false)
                  }}
                  className={`
                    px-4 py-3 cursor-pointer border-t border-gray-200
                    ${focusedIndex === filteredPacientes.length ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center space-x-3 text-blue-600">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="font-medium">
                      Adicionar novo paciente
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}