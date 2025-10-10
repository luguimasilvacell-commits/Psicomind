-- Verificar se existe paciente com o número +5531988068180
-- Número formatado: (31) 98806-8180

SELECT 
    id,
    nome,
    telefone,
    psicologo_id,
    status,
    created_at
FROM pacientes 
WHERE telefone = '(31) 98806-8180'
   OR telefone = '31988068180'
   OR telefone = '+5531988068180'
   OR telefone = '5531988068180'
   OR telefone LIKE '%31988068180%'
ORDER BY created_at DESC;

-- Verificar todos os telefones cadastrados para debug
SELECT 
    id,
    nome,
    telefone,
    status
FROM pacientes 
WHERE status = 'ativo'
ORDER BY telefone;