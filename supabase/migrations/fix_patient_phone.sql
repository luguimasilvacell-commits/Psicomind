-- Corrigir o telefone do paciente Luiz para o formato correto
-- De: 31988068180 Para: (31) 98806-8180

UPDATE pacientes 
SET telefone = '(31) 98806-8180'
WHERE telefone = '31988068180' 
  AND nome = 'Luiz';

-- Verificar a atualização
SELECT 
    id,
    nome,
    telefone,
    psicologo_id,
    status
FROM pacientes 
WHERE nome = 'Luiz';