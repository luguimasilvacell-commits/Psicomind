-- Deletar conversas antigas da Ana Costa
DELETE FROM conversas 
WHERE paciente_id = 'fcb141fa-1c53-4ae0-9ec0-29977cc865e7';

-- Atualizar o psicólogo da Ana Costa para o usuário logado
UPDATE pacientes 
SET psicologo_id = '975cdada-b05b-4604-b4ab-e664aad693eb' 
WHERE id = 'fcb141fa-1c53-4ae0-9ec0-29977cc865e7';