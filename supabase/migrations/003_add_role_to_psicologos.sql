-- Adicionar campo role na tabela psicologos
-- Migration para suporte a usuários admin

-- Adicionar coluna role com valor padrão 'psicologo'
ALTER TABLE psicologos 
ADD COLUMN role VARCHAR(20) DEFAULT 'psicologo' CHECK (role IN ('admin', 'psicologo'));

-- Criar índice para otimizar consultas por role
CREATE INDEX idx_psicologos_role ON psicologos(role);

-- Atualizar políticas RLS para permitir que admins vejam todos os dados
-- Política para admins verem todos os psicólogos
CREATE POLICY "Admins podem ver todos os psicólogos" ON psicologos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Política para admins gerenciarem todos os pacientes
CREATE POLICY "Admins podem ver todos os pacientes" ON pacientes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Política para admins verem todos os agendamentos
CREATE POLICY "Admins podem ver todos os agendamentos" ON agendamentos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Política para admins verem todos os prontuários
CREATE POLICY "Admins podem ver todos os prontuários" ON prontuarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Política para admins verem todas as transações financeiras
CREATE POLICY "Admins podem ver todas as transações" ON transacoes_financeiras
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Política para admins verem todo o histórico de chat
CREATE POLICY "Admins podem ver todo histórico de chat" ON chat_historico
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM psicologos admin_check 
            WHERE admin_check.id::text = auth.uid()::text 
            AND admin_check.role = 'admin'
        )
    );

-- Comentário sobre a implementação
COMMENT ON COLUMN psicologos.role IS 'Role do usuário: admin ou psicologo. Admins têm acesso total ao sistema.';