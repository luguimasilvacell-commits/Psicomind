// Utilitários para máscaras brasileiras

// Remove todos os caracteres não numéricos
export const removeNonNumeric = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  return stringValue.replace(/\D/g, '')
}

// Máscara para CPF (000.000.000-00)
export const formatCPF = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const numbers = removeNonNumeric(value)
  
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
}

// Máscara para telefone ((00) 00000-0000)
export const formatPhone = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const numbers = removeNonNumeric(value)
  
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

// Máscara para CEP (00000-000)
export const formatCEP = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const numbers = removeNonNumeric(value)
  
  if (numbers.length <= 5) return numbers
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
}

// Máscara para data (DD/MM/AAAA)
export const formatDate = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  const numbers = removeNonNumeric(value)
  
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
}

// Máscara para moeda brasileira (R$ 0.000,00)
export const formatCurrency = (value: string | number): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value
  
  if (isNaN(numericValue)) return 'R$ 0,00'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue)
}

// Converte valor monetário formatado para número
export const parseCurrency = (value: string): number => {
  if (!value || typeof value !== 'string') return 0
  
  // Remove tudo exceto números e vírgulas
  const cleanValue = value.replace(/[^\d,]/g, '')
  
  if (!cleanValue) return 0
  
  // Converte vírgula para ponto para parseFloat
  const numericValue = cleanValue.replace(',', '.')
  const result = parseFloat(numericValue)
  
  return isNaN(result) ? 0 : result
}

// Converte data DD/MM/AAAA para AAAA-MM-DD (formato ISO)
export const parseDate = (value: string): string => {
  const numbers = removeNonNumeric(value)
  
  if (numbers.length === 8) {
    const day = numbers.slice(0, 2)
    const month = numbers.slice(2, 4)
    const year = numbers.slice(4, 8)
    return `${year}-${month}-${day}`
  }
  
  return ''
}

// Converte data AAAA-MM-DD para DD/MM/AAAA
export const formatDateFromISO = (value: string): string => {
  if (!value) return ''
  
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// Valida CPF
export const isValidCPF = (cpf: string): boolean => {
  const numbers = removeNonNumeric(cpf)
  
  if (numbers.length !== 11) return false
  if (/^(\d)\1{10}$/.test(numbers)) return false // Todos os dígitos iguais
  
  // Validação dos dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit1 = 11 - (sum % 11)
  if (digit1 > 9) digit1 = 0
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  let digit2 = 11 - (sum % 11)
  if (digit2 > 9) digit2 = 0
  
  return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2
}

// Valida telefone brasileiro
export const isValidPhone = (phone: string): boolean => {
  const numbers = removeNonNumeric(phone)
  return numbers.length === 10 || numbers.length === 11
}

// Valida CEP
export const isValidCEP = (cep: string): boolean => {
  const numbers = removeNonNumeric(cep)
  return numbers.length === 8
}

// Valida data DD/MM/AAAA
export const isValidDate = (date: string): boolean => {
  const numbers = removeNonNumeric(date)
  
  if (numbers.length !== 8) return false
  
  const day = parseInt(numbers.slice(0, 2))
  const month = parseInt(numbers.slice(2, 4))
  const year = parseInt(numbers.slice(4, 8))
  
  if (day < 1 || day > 31) return false
  if (month < 1 || month > 12) return false
  if (year < 1900 || year > 2100) return false
  
  // Verificação básica de dias por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  
  // Ano bissexto
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29
  }
  
  return day <= daysInMonth[month - 1]
}