-- Funções e Triggers para Sistema de Chat WhatsApp
-- Baseado na arquitetura técnica definida na documentação

-- Função para atualizar última mensagem na conversa
CREATE OR REPLACE FUNCTION update_conversa_ultima_mensagem()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversas 
    SET 
        ultima_mensagem = NEW.created_at,
        mensagens_nao_lidas = CASE 
            WHEN NEW.direcao = 'recebida' THEN mensagens_nao_lidas + 1
            ELSE mensagens_nao_lidas
        END,
        updated_at = NOW()
    WHERE id = NEW.conversa_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar conversa quando nova mensagem é inserida
CREATE TRIGGER trigger_update_conversa_ultima_mensagem
    AFTER INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_conversa_ultima_mensagem();

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION marcar_mensagens_como_lidas(conversa_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE mensagens 
    SET status_entrega = 'lida'
    WHERE conversa_id = conversa_uuid 
    AND direcao = 'recebida' 
    AND status_entrega != 'lida';
    
    UPDATE conversas 
    SET mensagens_nao_lidas = 0
    WHERE id = conversa_uuid;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar ações de auditoria
CREATE OR REPLACE FUNCTION log_chat_action(
    p_psicologo_id UUID,
    p_paciente_id UUID,
    p_action_type VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO chat_audit_logs (
        psicologo_id, paciente_id, action_type, resource_type,
        resource_id, details, ip_address, user_agent
    ) VALUES (
        p_psicologo_id, p_paciente_id, p_action_type, p_resource_type,
        p_resource_id, p_details, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Função para criptografar conteúdo sensível (requer extensão pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION encrypt_message_content(content TEXT, key_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(content, key_id);
END;
$$ LANGUAGE plpgsql;

-- Função para descriptografar conteúdo
CREATE OR REPLACE FUNCTION decrypt_message_content(encrypted_content TEXT, key_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_content, key_id);
END;
$$ LANGUAGE plpgsql;

-- Função para anonimização automática de dados antigos
CREATE OR REPLACE FUNCTION anonymize_old_chat_data()
RETURNS void AS $$
BEGIN
    -- Anonimizar mensagens com mais de 5 anos
    UPDATE mensagens 
    SET 
        conteudo = '[DADOS ANONIMIZADOS]',
        metadata = jsonb_build_object(
            'anonymized', true, 
            'original_date', created_at,
            'anonymized_at', NOW()
        )
    WHERE created_at < NOW() - INTERVAL '5 years'
    AND conteudo != '[DADOS ANONIMIZADOS]';
    
    -- Log da ação de anonimização
    INSERT INTO chat_audit_logs (action_type, resource_type, details)
    VALUES ('data_anonymized', 'bulk_messages', '{"retention_policy": "5_years"}');
END;
$$ LANGUAGE plpgsql;

-- Função para verificar atividades suspeitas
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS void AS $$
DECLARE
    suspicious_count INTEGER;
BEGIN
    -- Verificar tentativas de acesso excessivas
    SELECT COUNT(*) INTO suspicious_count
    FROM chat_audit_logs
    WHERE action_type = 'conversation_accessed'
    AND timestamp >= NOW() - INTERVAL '1 hour'
    AND psicologo_id = ANY(
        SELECT psicologo_id
        FROM chat_audit_logs
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY psicologo_id
        HAVING COUNT(*) > 100
    );
    
    IF suspicious_count > 0 THEN
        -- Enviar alerta (implementar notificação)
        INSERT INTO chat_audit_logs (action_type, resource_type, details)
        VALUES ('security_alert', 'system', jsonb_build_object(
            'alert_type', 'excessive_access', 
            'count', suspicious_count
        ));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para backup de dados de chat
CREATE OR REPLACE FUNCTION backup_chat_data(backup_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    table_name_conversas TEXT;
    table_name_mensagens TEXT;
BEGIN
    table_name_conversas := 'backup_conversas_' || TO_CHAR(backup_date, 'YYYY_MM_DD');
    table_name_mensagens := 'backup_mensagens_' || TO_CHAR(backup_date, 'YYYY_MM_DD');
    
    -- Criar backup das conversas
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM conversas WHERE DATE(created_at) = %L', 
                   table_name_conversas, backup_date);
    
    -- Criar backup das mensagens
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM mensagens WHERE DATE(created_at) = %L', 
                   table_name_mensagens, backup_date);
    
    -- Log do backup
    INSERT INTO chat_audit_logs (action_type, resource_type, details)
    VALUES ('data_backup', 'system', jsonb_build_object('backup_date', backup_date));
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de conversa
CREATE OR REPLACE FUNCTION get_conversation_stats(p_psicologo_id UUID)
RETURNS TABLE(
    total_conversas BIGINT,
    conversas_ativas BIGINT,
    total_mensagens BIGINT,
    mensagens_nao_lidas BIGINT,
    ultima_atividade TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(c.id) as total_conversas,
        COUNT(c.id) FILTER (WHERE c.ativa = true) as conversas_ativas,
        COALESCE(SUM(
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id)::BIGINT
        ), 0)::BIGINT as total_mensagens,
        COALESCE(SUM(c.mensagens_nao_lidas), 0)::BIGINT as mensagens_nao_lidas,
        MAX(c.ultima_mensagem) as ultima_atividade
    FROM conversas c
    WHERE c.psicologo_id = p_psicologo_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar conversas com filtros
CREATE OR REPLACE FUNCTION search_conversations(
    p_psicologo_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    conversa_id UUID,
    paciente_id UUID,
    paciente_nome VARCHAR(255),
    paciente_telefone VARCHAR(20),
    ultima_mensagem TIMESTAMP WITH TIME ZONE,
    mensagens_nao_lidas INTEGER,
    ativa BOOLEAN,
    preview_mensagem TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversa_id,
        p.id as paciente_id,
        p.nome as paciente_nome,
        p.telefone as paciente_telefone,
        c.ultima_mensagem,
        c.mensagens_nao_lidas,
        c.ativa,
        (
            SELECT m.conteudo 
            FROM mensagens m 
            WHERE m.conversa_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
        ) as preview_mensagem
    FROM conversas c
    JOIN pacientes p ON p.id = c.paciente_id
    WHERE c.psicologo_id = p_psicologo_id
    AND (
        p_search_term IS NULL 
        OR p.nome ILIKE '%' || p_search_term || '%'
        OR p.telefone ILIKE '%' || p_search_term || '%'
        OR EXISTS (
            SELECT 1 FROM mensagens m 
            WHERE m.conversa_id = c.id 
            AND m.conteudo ILIKE '%' || p_search_term || '%'
        )
    )
    ORDER BY c.ultima_mensagem DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- View para métricas de segurança
CREATE VIEW chat_security_metrics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    action_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT psicologo_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM chat_audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), action_type
ORDER BY hour DESC;

-- Trigger para log automático de ações críticas
CREATE OR REPLACE FUNCTION auto_log_critical_actions()
RETURNS TRIGGER AS $$
BEGIN
    -- Log quando uma configuração é alterada
    IF TG_TABLE_NAME = 'configuracoes_whatsapp' THEN
        PERFORM log_chat_action(
            NEW.psicologo_id,
            NULL,
            'config_changed',
            'configuration',
            NEW.id,
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas configurações
CREATE TRIGGER trigger_log_config_changes
    AFTER INSERT OR UPDATE ON configuracoes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_critical_actions();

-- Função para limpar dados antigos (GDPR/LGPD compliance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Deletar logs de auditoria com mais de 2 anos
    DELETE FROM chat_audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    -- Anonimizar mensagens antigas
    PERFORM anonymize_old_chat_data();
    
    -- Log da limpeza
    INSERT INTO chat_audit_logs (action_type, resource_type, details)
    VALUES ('data_cleanup', 'system', jsonb_build_object(
        'cleanup_date', NOW(),
        'retention_policy', '2_years'
    ));
END;
$$ LANGUAGE plpgsql;