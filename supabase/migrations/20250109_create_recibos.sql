-- Criação da tabela recibos para geração de recibos de pagamento
CREATE TABLE IF NOT EXISTS recibos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transacao_id UUID NOT NULL REFERENCES transacoes_financeiras(id) ON DELETE CASCADE,
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    numero_recibo VARCHAR(50) NOT NULL UNIQUE,
    valor_recibo DECIMAL(10,2) NOT NULL,
    data_emissao TIMESTAMPTZ DEFAULT NOW(),
    data_vencimento DATE,
    descricao_servico TEXT NOT NULL,
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'emitido' CHECK (status IN ('emitido', 'cancelado', 'substituido')),
    
    -- Dados do emissor (psicólogo) no momento da emissão
    emissor_nome VARCHAR(255) NOT NULL,
    emissor_cpf VARCHAR(14),
    emissor_crp VARCHAR(20),
    emissor_endereco TEXT,
    emissor_telefone VARCHAR(20),
    emissor_email VARCHAR(255),
    
    -- Dados do pagador (paciente) no momento da emissão
    pagador_nome VARCHAR(255) NOT NULL,
    pagador_cpf VARCHAR(14),
    pagador_endereco TEXT,
    pagador_telefone VARCHAR(20),
    pagador_email VARCHAR(255),
    
    -- Dados da transação
    forma_pagamento VARCHAR(50),
    data_pagamento TIMESTAMPTZ,
    
    -- Metadados do PDF
    pdf_gerado BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    pdf_hash VARCHAR(64), -- Hash SHA-256 para verificação de integridade
    
    -- Assinatura digital
    assinatura_digital TEXT, -- Base64 da assinatura
    certificado_digital TEXT, -- Informações do certificado (se houver)
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES psicologos(id),
    
    -- Controle de versão (para substituições)
    versao INTEGER DEFAULT 1,
    recibo_original_id UUID REFERENCES recibos(id), -- Para recibos substitutos
    
    CONSTRAINT recibos_valor_positivo CHECK (valor_recibo > 0),
    CONSTRAINT recibos_data_vencimento_valida CHECK (data_vencimento >= CURRENT_DATE OR data_vencimento IS NULL)
);

-- Índices para otimização de consultas
CREATE INDEX idx_recibos_transacao_id ON recibos(transacao_id);
CREATE INDEX idx_recibos_psicologo_id ON recibos(psicologo_id);
CREATE INDEX idx_recibos_paciente_id ON recibos(paciente_id);
CREATE INDEX idx_recibos_numero ON recibos(numero_recibo);
CREATE INDEX idx_recibos_data_emissao ON recibos(data_emissao);
CREATE INDEX idx_recibos_status ON recibos(status);
CREATE INDEX idx_recibos_data_pagamento ON recibos(data_pagamento);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_recibos_updated_at 
    BEFORE UPDATE ON recibos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número de recibo sequencial
CREATE OR REPLACE FUNCTION gerar_numero_recibo(psicologo_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    ano_atual TEXT;
    proximo_numero INTEGER;
    numero_formatado TEXT;
BEGIN
    -- Obter ano atual
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Buscar o próximo número sequencial para o psicólogo no ano atual
    SELECT COALESCE(MAX(
        CASE 
            WHEN numero_recibo ~ ('^REC-' || ano_atual || '-[0-9]+$') 
            THEN CAST(SPLIT_PART(numero_recibo, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO proximo_numero
    FROM recibos 
    WHERE psicologo_id = psicologo_uuid
    AND numero_recibo LIKE 'REC-' || ano_atual || '-%';
    
    -- Formatar número com zeros à esquerda (4 dígitos)
    numero_formatado := 'REC-' || ano_atual || '-' || LPAD(proximo_numero::TEXT, 4, '0');
    
    RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número de recibo automaticamente
CREATE OR REPLACE FUNCTION trigger_gerar_numero_recibo()
RETURNS TRIGGER AS $$
BEGIN
    -- Se número não foi fornecido, gerar automaticamente
    IF NEW.numero_recibo IS NULL OR NEW.numero_recibo = '' THEN
        NEW.numero_recibo := gerar_numero_recibo(NEW.psicologo_id);
    END IF;
    
    -- Definir created_by se não foi fornecido
    IF NEW.created_by IS NULL THEN
        NEW.created_by := NEW.psicologo_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recibos_numero_automatico
    BEFORE INSERT ON recibos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_gerar_numero_recibo();

-- Habilitar RLS (Row Level Security)
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;

-- Política RLS: Psicólogos só podem acessar seus próprios recibos
CREATE POLICY "Psicólogos podem acessar seus próprios recibos" ON recibos
    FOR ALL USING (psicologo_id = auth.uid()::uuid);

-- Política RLS: Permitir inserção para psicólogos autenticados
CREATE POLICY "Psicólogos podem inserir recibos" ON recibos
    FOR INSERT WITH CHECK (psicologo_id = auth.uid()::uuid);

-- Política RLS: Permitir atualização para psicólogos autenticados
CREATE POLICY "Psicólogos podem atualizar seus recibos" ON recibos
    FOR UPDATE USING (psicologo_id = auth.uid()::uuid);

-- Comentários para documentação
COMMENT ON TABLE recibos IS 'Tabela para armazenar recibos de pagamento gerados pelo sistema';
COMMENT ON COLUMN recibos.numero_recibo IS 'Número único do recibo no formato REC-YYYY-NNNN';
COMMENT ON COLUMN recibos.valor_recibo IS 'Valor do recibo em reais';
COMMENT ON COLUMN recibos.descricao_servico IS 'Descrição detalhada do serviço prestado';
COMMENT ON COLUMN recibos.pdf_hash IS 'Hash SHA-256 do PDF para verificação de integridade';
COMMENT ON COLUMN recibos.assinatura_digital IS 'Assinatura digital em base64 para autenticidade';
COMMENT ON COLUMN recibos.versao IS 'Versão do recibo para controle de substituições';
COMMENT ON COLUMN recibos.recibo_original_id IS 'Referência ao recibo original em caso de substituição';