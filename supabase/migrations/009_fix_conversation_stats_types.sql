-- Fix type mismatch in get_conversation_stats function
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