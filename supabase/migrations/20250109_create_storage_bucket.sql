-- Criar bucket para arquivos de prontuário
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arquivos-prontuario',
  'arquivos-prontuario',
  true,
  10485760, -- 10MB em bytes
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/mpeg'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Nota: As políticas de storage devem ser configuradas via interface do Supabase
-- devido a limitações de permissão nas migrações SQL.
-- 
-- Políticas necessárias:
-- 1. INSERT: bucket_id = 'arquivos-prontuario' AND auth.uid()::text = (storage.foldername(name))[1]
-- 2. SELECT: bucket_id = 'arquivos-prontuario' AND auth.uid()::text = (storage.foldername(name))[1]  
-- 3. UPDATE: bucket_id = 'arquivos-prontuario' AND auth.uid()::text = (storage.foldername(name))[1]
-- 4. DELETE: bucket_id = 'arquivos-prontuario' AND auth.uid()::text = (storage.foldername(name))[1]