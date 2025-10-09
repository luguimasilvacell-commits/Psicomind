-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões para role anon (usuários não logados)
-- Apenas leitura básica para algumas tabelas públicas se necessário
-- Para este sistema, anon não precisa de acesso às tabelas

-- Conceder permissões para role authenticated (usuários logados)
-- Psicólogos
GRANT ALL PRIVILEGES ON psicologos TO authenticated;

-- Pacientes
GRANT ALL PRIVILEGES ON pacientes TO authenticated;

-- Agendamentos
GRANT ALL PRIVILEGES ON agendamentos TO authenticated;

-- Prontuários
GRANT ALL PRIVILEGES ON prontuarios TO authenticated;

-- Transações Financeiras
GRANT ALL PRIVILEGES ON transacoes_financeiras TO authenticated;

-- Chat Histórico
GRANT ALL PRIVILEGES ON chat_historico TO authenticated;

-- Verificar permissões após concessão
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;