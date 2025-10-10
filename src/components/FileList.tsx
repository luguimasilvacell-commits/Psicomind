import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, File, Image, Video, Music, FileText, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FileListProps {
  prontuarioId: string;
  onFileDeleted?: () => void;
  className?: string;
}

interface ArquivoProntuario {
  id: string;
  nome_arquivo: string;
  nome_original: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  url_storage: string;
  categoria: string;
  descricao?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const FileList: React.FC<FileListProps> = ({
  prontuarioId,
  onFileDeleted,
  className = ''
}) => {
  const [arquivos, setArquivos] = useState<ArquivoProntuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const getFileIcon = (categoria: string) => {
    switch (categoria) {
      case 'imagem': return <Image className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'documento': return <FileText className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (categoria: string): string => {
    switch (categoria) {
      case 'imagem': return 'bg-green-100 text-green-800';
      case 'audio': return 'bg-purple-100 text-purple-800';
      case 'video': return 'bg-red-100 text-red-800';
      case 'documento': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadArquivos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('arquivos_prontuario')
        .select('*')
        .eq('prontuario_id', prontuarioId)
        .eq('psicologo_id', user.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setArquivos(data || []);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (arquivo: ArquivoProntuario) => {
    try {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = arquivo.url_storage;
      link.download = arquivo.nome_original;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao fazer download do arquivo');
    }
  };

  const handleView = (arquivo: ArquivoProntuario) => {
    // Abrir arquivo em nova aba
    window.open(arquivo.url_storage, '_blank');
  };

  const handleDelete = async (arquivo: ArquivoProntuario) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${arquivo.nome_original}"?`)) {
      return;
    }

    try {
      setDeletingId(arquivo.id);

      // Marcar como excluído no banco (soft delete)
      const { error: dbError } = await supabase
        .from('arquivos_prontuario')
        .update({ status: 'excluido' })
        .eq('id', arquivo.id);

      if (dbError) {
        throw dbError;
      }

      // Remover do storage (opcional - pode manter para auditoria)
      // const { error: storageError } = await supabase.storage
      //   .from('arquivos-prontuario')
      //   .remove([arquivo.path_storage]);

      // Atualizar lista local
      setArquivos(prev => prev.filter(a => a.id !== arquivo.id));
      
      toast.success('Arquivo excluído com sucesso');
      onFileDeleted?.();
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      toast.error('Erro ao excluir arquivo');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadArquivos();
  }, [prontuarioId, user]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (arquivos.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <File className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Nenhum arquivo anexado a este prontuário</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700">
          Arquivos Anexados ({arquivos.length})
        </h4>
        <button
          onClick={loadArquivos}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-2">
        {arquivos.map((arquivo) => (
          <div
            key={arquivo.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Ícone do tipo de arquivo */}
              <div className="text-gray-500 flex-shrink-0">
                {getFileIcon(arquivo.categoria)}
              </div>

              {/* Informações do arquivo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {arquivo.nome_original}
                  </p>
                  <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(arquivo.categoria)}`}>
                    {arquivo.categoria}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <File className="w-3 h-3" />
                    <span>{formatFileSize(arquivo.tamanho_bytes)}</span>
                  </span>
                  
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(arquivo.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </span>
                </div>

                {/* Descrição se houver */}
                {arquivo.descricao && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {arquivo.descricao}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Visualizar */}
              <button
                onClick={() => handleView(arquivo)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Visualizar arquivo"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Download */}
              <button
                onClick={() => handleDownload(arquivo)}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                title="Fazer download"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Excluir */}
              <button
                onClick={() => handleDelete(arquivo)}
                disabled={deletingId === arquivo.id}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Excluir arquivo"
              >
                {deletingId === arquivo.id ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};