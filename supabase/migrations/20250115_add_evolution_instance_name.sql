-- Adicionar campo evolution_instance_name na tabela automation_configs
ALTER TABLE automation_configs 
ADD COLUMN evolution_instance_name VARCHAR(255);

-- Comentário para documentação
COMMENT ON COLUMN automation_configs.evolution_instance_name IS 'Nome da instância da Evolution API';