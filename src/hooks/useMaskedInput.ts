import { useState, useCallback } from 'react'
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

  const handleChange = useCallback((newValue: string) => {
    let formattedValue = ''
    let rawValue = ''

    switch (maskType) {
      case 'cpf':
        formattedValue = formatCPF(newValue)
        rawValue = removeNonNumeric(newValue)
        break
      case 'phone':
        formattedValue = formatPhone(newValue)
        rawValue = removeNonNumeric(newValue)
        break
      case 'cep':
        formattedValue = formatCEP(newValue)
        rawValue = removeNonNumeric(newValue)
        break
      case 'date':
        formattedValue = formatDate(newValue)
        rawValue = removeNonNumeric(newValue)
        break
      case 'currency':
        // Para moeda, permitimos números, vírgulas e pontos
        const cleanValue = newValue.replace(/[^\d,.-]/g, '')
        const numericValue = parseFloat(cleanValue.replace(',', '.')) || 0
        formattedValue = formatCurrency(numericValue)
        rawValue = numericValue.toString()
        break
      default:
        formattedValue = newValue
        rawValue = newValue
    }

    setValue(formattedValue)
    onChange?.(formattedValue, rawValue)
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

  return {
    value,
    onChange: handleChange,
    getRawValue,
    getISOValue,
    setValue
  }
}

// Hook específico para campos de moeda
export const useCurrencyInput = (initialValue: number = 0, onChange?: (value: number) => void) => {
  const [displayValue, setDisplayValue] = useState(formatCurrency(initialValue))
  const [rawValue, setRawValue] = useState(initialValue.toString())

  const handleChange = useCallback((newValue: string) => {
    // Remove tudo exceto números e vírgulas
    let cleanValue = newValue.replace(/[^\d,]/g, '')
    
    // Se o valor está vazio, define como 0
    if (!cleanValue) {
      setDisplayValue('R$ 0,00')
      setRawValue('0')
      onChange?.(0)
      return
    }
    
    // Permite apenas uma vírgula
    const commaCount = (cleanValue.match(/,/g) || []).length
    if (commaCount > 1) {
      return // Não permite múltiplas vírgulas
    }
    
    // Se termina com vírgula, permite para continuar digitando os centavos
    if (cleanValue.endsWith(',')) {
      // Formata temporariamente sem os centavos
      const integerPart = cleanValue.slice(0, -1)
      if (integerPart) {
        const tempValue = parseFloat(integerPart) || 0
        setDisplayValue(`R$ ${tempValue.toLocaleString('pt-BR')},`)
      } else {
        setDisplayValue('R$ 0,')
      }
      setRawValue(cleanValue)
      return
    }
    
    // Converte vírgula para ponto para parseFloat
    const valueForParsing = cleanValue.replace(',', '.')
    let numericValue = parseFloat(valueForParsing) || 0
    
    // Se tem vírgula, trata como centavos
    if (cleanValue.includes(',')) {
      const parts = cleanValue.split(',')
      if (parts[1] && parts[1].length <= 2) {
        // Limita a 2 casas decimais
        const integerPart = parseFloat(parts[0]) || 0
        const decimalPart = parts[1].padEnd(2, '0').slice(0, 2)
        numericValue = parseFloat(`${integerPart}.${decimalPart}`)
      }
    }
    
    // Formata para exibição
    const formatted = formatCurrency(numericValue)
    setDisplayValue(formatted)
    setRawValue(numericValue.toString())
    
    // Chama callback com valor numérico
    onChange?.(numericValue)
  }, [onChange])

  const setValue = useCallback((value: number) => {
    const formatted = formatCurrency(value)
    setDisplayValue(formatted)
    setRawValue(value.toString())
  }, [])

  const getValue = useCallback(() => {
    return parseFloat(rawValue) || 0
  }, [rawValue])

  return {
    displayValue,
    onChange: handleChange,
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