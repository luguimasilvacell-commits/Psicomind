import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface FileUploadProps {
  prontuarioId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface UploadedFile {
  id: string;
  nome_arquivo: string;
  nome_original: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  url_storage: string;
  categoria: string;
  descricao?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  categoria: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const ACCEPTED_TYPES = [
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
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileUpload: React.FC<FileUploadProps> = ({
  prontuarioId,
  onUploadComplete,
  maxFiles = 5,
  maxSizeBytes = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  className = ''
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const getFileCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'imagem';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'documento';
  };

  const getFileIcon = (categoria: string) => {
    switch (categoria) {
      case 'imagem': return <Image className="w-6 h-6" />;
      case 'audio': return <Music className="w-6 h-6" />;
      case 'video': return <Video className="w-6 h-6" />;
      case 'documento': return <FileText className="w-6 h-6" />;
      default: return <File className="w-6 h-6" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Tipo de arquivo não suportado: ${file.type}`;
    }
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Máximo: ${formatFileSize(maxSizeBytes)}`;
    }
    return null;
  };

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFile(file);
      
      if (validation) {
        toast.error(validation);
        continue;
      }

      if (files.length + newFiles.length >= maxFiles) {
        toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
        break;
      }

      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: `${Date.now()}-${i}`,
        categoria: getFileCategory(file.type),
        uploadProgress: 0,
        status: 'pending' as const
      });

      // Criar preview para imagens
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      newFiles.push(fileWithPreview);
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, maxSizeBytes, acceptedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      // Limpar preview URLs para evitar memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updatedFiles;
    });
  }, []);

  const uploadFile = async (file: FileWithPreview): Promise<UploadedFile | null> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `${user.id}/${prontuarioId}/${uniqueFileName}`;

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('arquivos-prontuario')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from('arquivos-prontuario')
        .getPublicUrl(filePath);

      // Salvar metadados no banco de dados
      const { data: dbData, error: dbError } = await supabase
        .from('arquivos_prontuario')
        .insert({
          prontuario_id: prontuarioId,
          psicologo_id: user.id,
          nome_arquivo: uniqueFileName,
          nome_original: file.name,
          tipo_arquivo: file.type,
          tamanho_bytes: file.size,
          url_storage: urlData.publicUrl,
          bucket_name: 'arquivos-prontuario',
          path_storage: filePath,
          categoria: file.categoria,
          metadata: {
            upload_timestamp: timestamp,
            user_agent: navigator.userAgent
          }
        })
        .select()
        .single();

      if (dbError) {
        // Se falhou ao salvar no banco, remover arquivo do storage
        await supabase.storage
          .from('arquivos-prontuario')
          .remove([filePath]);
        throw dbError;
      }

      return dbData;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        if (file.status !== 'pending') continue;

        // Atualizar status para uploading
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'uploading', uploadProgress: 0 }
            : f
        ));

        try {
          const uploadedFile = await uploadFile(file);
          if (uploadedFile) {
            uploadedFiles.push(uploadedFile);
            
            // Atualizar status para success
            setFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { ...f, status: 'success', uploadProgress: 100 }
                : f
            ));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
          
          // Atualizar status para error
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, status: 'error', error: errorMessage }
              : f
          ));
          
          toast.error(`Erro ao enviar ${file.name}: ${errorMessage}`);
        }
      }

      if (uploadedFiles.length > 0) {
        toast.success(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
        onUploadComplete?.(uploadedFiles);
        
        // Limpar arquivos com sucesso após um delay
        setTimeout(() => {
          setFiles(prev => prev.filter(f => f.status !== 'success'));
        }, 2000);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de Drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-sm text-gray-500">
          Máximo {maxFiles} arquivos, até {formatFileSize(maxSizeBytes)} cada
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Formatos suportados: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, MP3, WAV, MP4
        </p>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Arquivos selecionados:</h4>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-gray-500">
                  {getFileIcon(file.categoria)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.categoria}
                  </p>
                  
                  {/* Barra de progresso */}
                  {file.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.uploadProgress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Mensagem de erro */}
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {file.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Botão remover */}
              {file.status !== 'uploading' && (
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão de upload */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading || files.every(f => f.status !== 'pending')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Enviando...' : 'Enviar Arquivos'}
          </button>
        </div>
      )}
    </div>
  );
};