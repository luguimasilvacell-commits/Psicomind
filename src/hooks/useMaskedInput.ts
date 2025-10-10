import React, { useState, useCallback } from 'react'
import { 
  formatCPF, 
  formatPhone, 
  formatCEP, 
  formatDate, 
  formatCurrency,
  parseCurrency,
  parseDate,
  removeNonNumeric
} from '../utils/masks'

export type MaskType = 'cpf' | 'phone' | 'cep' | 'date' | 'currency'

interface UseMaskedInputProps {
  initialValue?: string
  maskType: MaskType
  onChange?: (value: string, rawValue: string) => void
}

export const useMaskedInput = ({ initialValue = '', maskType, onChange }: UseMaskedInputProps) => {
  const [value, setValue] = useState(() => {
    if (!initialValue) return ''
    
    switch (maskType) {
      case 'cpf':
        return formatCPF(initialValue)
      case 'phone':
        return formatPhone(initialValue)
      case 'cep':
        return formatCEP(initialValue)
      case 'date':
        return formatDate(initialValue)
      case 'currency':
        return formatCurrency(initialValue)
      default:
        return initialValue
    }
  })

  const handleChange = useCallback((newValue: string | number | null | undefined) => {
    try {
      let formattedValue = ''
      let rawValue = ''

      // Garantir que newValue seja uma string
      const safeValue = newValue === null || newValue === undefined ? '' : String(newValue)

      switch (maskType) {
        case 'cpf':
          formattedValue = formatCPF(safeValue)
          rawValue = removeNonNumeric(safeValue)
          break
        case 'phone':
          formattedValue = formatPhone(safeValue)
          rawValue = removeNonNumeric(safeValue)
          break
        case 'cep':
          formattedValue = formatCEP(safeValue)
          rawValue = removeNonNumeric(safeValue)
          break
        case 'date':
          formattedValue = formatDate(safeValue)
          rawValue = removeNonNumeric(safeValue)
          break
        case 'currency':
          // Para moeda, permitimos números, vírgulas e pontos
          const cleanValue = safeValue.replace(/[^\d,.-]/g, '')
          const numericValue = parseFloat(cleanValue.replace(',', '.')) || 0
          formattedValue = formatCurrency(numericValue)
          rawValue = numericValue.toString()
          break
        default:
          formattedValue = safeValue
          rawValue = safeValue
      }

      setValue(formattedValue)
      onChange?.(formattedValue, rawValue)
    } catch (error) {
      console.error('❌ Error in handleChange:', error, 'newValue:', newValue, 'maskType:', maskType)
      // Em caso de erro, usar valor vazio
      setValue('')
      onChange?.('', '')
    }
  }, [maskType, onChange])

  const getRawValue = useCallback(() => {
    switch (maskType) {
      case 'cpf':
      case 'phone':
      case 'cep':
      case 'date':
        return removeNonNumeric(value)
      case 'currency':
        return parseCurrency(value).toString()
      default:
        return value
    }
  }, [value, maskType])

  const getISOValue = useCallback(() => {
    if (maskType === 'date') {
      return parseDate(value)
    }
    if (maskType === 'currency') {
      return parseCurrency(value)
    }
    return getRawValue()
  }, [value, maskType, getRawValue])

  const wrappedOnChange = useCallback((event: React.ChangeEvent<HTMLInputElement> | string) => {
    try {
      const newValue = typeof event === 'string' ? event : event.target.value
      handleChange(newValue)
    } catch (error) {
      console.error('❌ Error in wrappedOnChange:', error)
    }
  }, [handleChange, maskType])

  return {
    value,
    onChange: wrappedOnChange,
    getRawValue,
    getISOValue,
    setValue
  }
}

// Hook específico para campos de moeda - Versão flexível
export const useCurrencyInput = (initialValue: number = 0, onChange?: (value: number) => void) => {
  const [displayValue, setDisplayValue] = useState(formatCurrency(initialValue))
  const [rawValue, setRawValue] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)

  const handleChange = useCallback((newValue: string) => {
    setIsEditing(true)
    
    // Se o campo está vazio, permite e define como 0
    if (newValue === '' || newValue === 'R$ ') {
      setDisplayValue('')
      setRawValue(0)
      onChange?.(0)
      return
    }
    
    // Remove apenas o prefixo R$ e espaços extras, mantém números, vírgulas e pontos
    let workingValue = newValue.replace(/^R\$\s*/, '').trim()
    
    // Se ainda está vazio após remover R$, trata como 0
    if (!workingValue) {
      setDisplayValue('')
      setRawValue(0)
      onChange?.(0)
      return
    }
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    workingValue = workingValue.replace(/[^\d,.]/g, '')
    
    // Se não há números, trata como 0
    if (!/\d/.test(workingValue)) {
      setDisplayValue('')
      setRawValue(0)
      onChange?.(0)
      return
    }
    
    // Normaliza separadores: substitui pontos por vírgulas (exceto se for separador de milhares)
    // Permite apenas uma vírgula como separador decimal
    const commaCount = (workingValue.match(/,/g) || []).length
    if (commaCount > 1) {
      // Remove vírgulas extras, mantendo apenas a última como separador decimal
      const lastCommaIndex = workingValue.lastIndexOf(',')
      workingValue = workingValue.substring(0, lastCommaIndex).replace(/,/g, '') + workingValue.substring(lastCommaIndex)
    }
    
    // Se tem ponto e vírgula, remove pontos (assumindo que vírgula é decimal)
    if (workingValue.includes(',') && workingValue.includes('.')) {
      workingValue = workingValue.replace(/\./g, '')
    }
    
    // Se tem apenas pontos, converte o último para vírgula (separador decimal)
    if (workingValue.includes('.') && !workingValue.includes(',')) {
      const dotCount = (workingValue.match(/\./g) || []).length
      if (dotCount === 1) {
        workingValue = workingValue.replace('.', ',')
      } else {
        // Múltiplos pontos: mantém apenas o último como separador decimal
        const lastDotIndex = workingValue.lastIndexOf('.')
        workingValue = workingValue.substring(0, lastDotIndex).replace(/\./g, '') + ',' + workingValue.substring(lastDotIndex + 1)
      }
    }
    
    // Processa o valor numérico
    let numericValue = 0
    
    if (workingValue.includes(',')) {
      const parts = workingValue.split(',')
      const integerPart = parts[0].replace(/\D/g, '') // Remove não-dígitos da parte inteira
      let decimalPart = parts[1] || ''
      
      // Limita a 2 casas decimais
      if (decimalPart.length > 2) {
        decimalPart = decimalPart.substring(0, 2)
      }
      
      // Constrói o número
      const integerValue = parseInt(integerPart) || 0
      const decimalValue = decimalPart ? parseInt(decimalPart.padEnd(2, '0')) / 100 : 0
      numericValue = integerValue + decimalValue
    } else {
      // Apenas números inteiros
      const cleanNumber = workingValue.replace(/\D/g, '')
      numericValue = parseInt(cleanNumber) || 0
    }
    
    // Durante a edição, mostra o valor mais próximo do que o usuário digitou
    if (isEditing) {
      // Se termina com vírgula, mantém a vírgula para continuar digitando
      if (workingValue.endsWith(',')) {
        const integerPart = workingValue.split(',')[0].replace(/\D/g, '')
        const formattedInteger = parseInt(integerPart) || 0
        setDisplayValue(`R$ ${formattedInteger.toLocaleString('pt-BR')},`)
      } else if (workingValue.includes(',')) {
        // Tem parte decimal
        const parts = workingValue.split(',')
        const integerPart = parts[0].replace(/\D/g, '')
        let decimalPart = parts[1] || ''
        
        if (decimalPart.length > 2) {
          decimalPart = decimalPart.substring(0, 2)
        }
        
        const formattedInteger = parseInt(integerPart) || 0
        setDisplayValue(`R$ ${formattedInteger.toLocaleString('pt-BR')},${decimalPart}`)
      } else {
        // Apenas inteiros
        setDisplayValue(`R$ ${numericValue.toLocaleString('pt-BR')}`)
      }
    } else {
      // Quando não está editando, formata completamente
      setDisplayValue(formatCurrency(numericValue))
    }
    
    setRawValue(numericValue)
    onChange?.(numericValue)
  }, [onChange, isEditing])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    // Ao sair do campo, formata completamente
    if (rawValue === 0 && displayValue === '') {
      setDisplayValue('R$ 0,00')
    } else {
      setDisplayValue(formatCurrency(rawValue))
    }
  }, [rawValue, displayValue])

  const handleFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  const setValue = useCallback((value: number) => {
    const formatted = formatCurrency(value)
    setDisplayValue(formatted)
    setRawValue(value)
    setIsEditing(false)
  }, [])

  const getValue = useCallback(() => {
    return rawValue
  }, [rawValue])

  return {
    displayValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    setValue,
    getValue
  }
}

// Hook específico para campos de data
export const useDateInput = (initialValue: string = '', onChange?: (value: string, isoValue: string) => void) => {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!initialValue) return ''
    // Se o valor inicial está no formato ISO (YYYY-MM-DD), converte para DD/MM/YYYY
    if (initialValue.includes('-') && initialValue.length === 10) {
      const [year, month, day] = initialValue.split('-')
      return formatDate(`${day}${month}${year}`)
    }
    return formatDate(initialValue)
  })

  const handleChange = useCallback((newValue: string) => {
    const formatted = formatDate(newValue)
    setDisplayValue(formatted)
    
    const isoValue = parseDate(formatted)
    onChange?.(formatted, isoValue)
  }, [onChange])

  const setValue = useCallback((value: string) => {
    if (value.includes('-') && value.length === 10) {
      // Valor no formato ISO
      const [year, month, day] = value.split('-')
      const formatted = formatDate(`${day}${month}${year}`)
      setDisplayValue(formatted)
    } else {
      const formatted = formatDate(value)
      setDisplayValue(formatted)
    }
  }, [])

  const getISOValue = useCallback(() => {
    return parseDate(displayValue)
  }, [displayValue])

  return {
    displayValue,
    onChange: handleChange,
    setValue,
    getISOValue
  }
}