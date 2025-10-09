-- Criar tabela para conversas com pacientes via WhatsApp
CREATE TABLE IF NOT EXISTS conversas_pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('enviada', 'recebida')),
  status_entrega VARCHAR(20) DEFAULT 'enviando' CHECK (status_entrega IN ('enviando', 'entregue', 'lida', 'erro')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversas_pacientes_psicologo_id ON conversas_pacientes(psicologo_id);
CREATE INDEX IF NOT EXISTS idx_conversas_pacientes_paciente_id ON conversas_pacientes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_pacientes_created_at ON conversas_pacientes(created_at);
CREATE INDEX IF NOT EXISTS idx_conversas_pacientes_tipo ON conversas_pacientes(tipo);

-- Habilitar RLS (Row Level Security)
ALTER TABLE conversas_pacientes ENABLE ROW LEVEL SECURITY;

-- Política para psicólogos verem apenas suas próprias conversas
CREATE POLICY "Psicólogos podem ver suas próprias conversas" ON conversas_pacientes
  FOR ALL USING (psicologo_id = auth.uid());

-- Política para psicólogos inserirem conversas
CREATE POLICY "Psicólogos podem inserir conversas" ON conversas_pacientes
  FOR INSERT WITH CHECK (psicologo_id = auth.uid());

-- Política para psicólogos atualizarem suas conversas
CREATE POLICY "Psicólogos podem atualizar suas conversas" ON conversas_pacientes
  FOR UPDATE USING (psicologo_id = auth.uid());

-- Conceder permissões para os roles
GRANT SELECT, INSERT, UPDATE ON conversas_pacientes TO authenticated;
GRANT SELECT ON conversas_pacientes TO anon;