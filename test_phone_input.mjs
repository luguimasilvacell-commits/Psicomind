// Teste para verificar se o campo telefone está funcionando
// Este script vai simular o comportamento do useMaskedInput

import { formatPhone, removeNonNumeric } from './src/utils/masks.js'

console.log('=== Teste do campo telefone ===')

// Simular entrada de dados
const testInputs = ['1', '11', '119', '1199', '11999', '119999', '1199999', '11999999', '119999999', '1199999999', '11999999999']

testInputs.forEach(input => {
  const formatted = formatPhone(input)
  const raw = removeNonNumeric(input)
  console.log(`Input: "${input}" -> Formatted: "${formatted}" -> Raw: "${raw}"`)
})

console.log('\n=== Teste com caracteres especiais ===')
const specialInputs = ['(11)', '(11) 9', '(11) 99999', '(11) 99999-9999', 'abc123def456']

specialInputs.forEach(input => {
  const formatted = formatPhone(input)
  const raw = removeNonNumeric(input)
  console.log(`Input: "${input}" -> Formatted: "${formatted}" -> Raw: "${raw}"`)
})