-- Criação da tabela arquivos_prontuario para sistema de upload de arquivos
CREATE TABLE IF NOT EXISTS arquivos_prontuario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prontuario_id UUID NOT NULL REFERENCES prontuarios(id) ON DELETE CASCADE,
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    tipo_arquivo VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    url_storage TEXT NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'arquivos-prontuario',
    path_storage TEXT NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50) DEFAULT 'documento' CHECK (categoria IN ('documento', 'imagem', 'audio', 'video', 'outros')),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado', 'excluido')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização de consultas
CREATE INDEX idx_arquivos_prontuario_prontuario_id ON arquivos_prontuario(prontuario_id);
CREATE INDEX idx_arquivos_prontuario_psicologo_id ON arquivos_prontuario(psicologo_id);
CREATE INDEX idx_arquivos_prontuario_categoria ON arquivos_prontuario(categoria);
CREATE INDEX idx_arquivos_prontuario_status ON arquivos_prontuario(status);
CREATE INDEX idx_arquivos_prontuario_created_at ON arquivos_prontuario(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_arquivos_prontuario_updated_at 
    BEFORE UPDATE ON arquivos_prontuario 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE arquivos_prontuario ENABLE ROW LEVEL SECURITY;

-- Política RLS: Psicólogos só podem acessar seus próprios arquivos
CREATE POLICY "Psicólogos podem acessar seus próprios arquivos" ON arquivos_prontuario
    FOR ALL USING (psicologo_id = auth.uid()::uuid);

-- Política RLS: Permitir inserção para psicólogos autenticados
CREATE POLICY "Psicólogos podem inserir arquivos" ON arquivos_prontuario
    FOR INSERT WITH CHECK (psicologo_id = auth.uid()::uuid);

-- Política RLS: Permitir atualização para psicólogos autenticados
CREATE POLICY "Psicólogos podem atualizar seus arquivos" ON arquivos_prontuario
    FOR UPDATE USING (psicologo_id = auth.uid()::uuid);

-- Política RLS: Permitir exclusão para psicólogos autenticados
CREATE POLICY "Psicólogos podem excluir seus arquivos" ON arquivos_prontuario
    FOR DELETE USING (psicologo_id = auth.uid()::uuid);

-- Comentários para documentação
COMMENT ON TABLE arquivos_prontuario IS 'Tabela para armazenar metadados dos arquivos anexados aos prontuários';
COMMENT ON COLUMN arquivos_prontuario.nome_arquivo IS 'Nome único do arquivo no storage';
COMMENT ON COLUMN arquivos_prontuario.nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN arquivos_prontuario.tipo_arquivo IS 'MIME type do arquivo (ex: application/pdf, image/jpeg)';
COMMENT ON COLUMN arquivos_prontuario.tamanho_bytes IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN arquivos_prontuario.url_storage IS 'URL completa para acesso ao arquivo no Supabase Storage';
COMMENT ON COLUMN arquivos_prontuario.bucket_name IS 'Nome do bucket no Supabase Storage';
COMMENT ON COLUMN arquivos_prontuario.path_storage IS 'Caminho completo do arquivo no storage';
COMMENT ON COLUMN arquivos_prontuario.categoria IS 'Categoria do arquivo para organização';
COMMENT ON COLUMN arquivos_prontuario.metadata IS 'Metadados adicionais do arquivo em formato JSON';