import React, { useState } from 'react';
import { FileText, Download, Eye, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ReciboGenerator, ReciboData, generateReciboNumber, saveReciboToDatabase } from '../utils/reciboGenerator';
import { useAuthStore } from '../stores/authStore';

interface ReciboGeneratorProps {
  transacao: {
    id: string;
    valor: number;
    data_transacao: string;
    descricao: string;
    forma_pagamento?: string;
    data_pagamento?: string;
    paciente: {
      id: string;
      nome: string;
      cpf?: string;
      endereco?: string;
      telefone?: string;
      email?: string;
    };
  };
  psicologo: {
    id: string;
    nome: string;
    cpf?: string;
    crp?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
  };
  onReciboGenerated?: (reciboId: string) => void;
}

export default function ReciboGeneratorComponent({ 
  transacao, 
  psicologo, 
  onReciboGenerated 
}: ReciboGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [reciboData, setReciboData] = useState<ReciboData | null>(null);
  const { user } = useAuthStore();

  const prepareReciboData = async (): Promise<ReciboData> => {
    const numeroRecibo = await generateReciboNumber();
    
    return {
      numero_recibo: numeroRecibo,
      valor_recibo: transacao.valor,
      data_emissao: new Date().toISOString(),
      descricao_servico: transacao.descricao || 'Serviços de Psicologia',
      forma_pagamento: transacao.forma_pagamento,
      data_pagamento: transacao.data_pagamento,
      
      // Dados do emissor (psicólogo)
      emissor_nome: psicologo.nome,
      emissor_cpf: psicologo.cpf,
      emissor_crp: psicologo.crp,
      emissor_endereco: psicologo.endereco,
      emissor_telefone: psicologo.telefone,
      emissor_email: psicologo.email,
      
      // Dados do pagador (paciente)
      pagador_nome: transacao.paciente.nome,
      pagador_cpf: transacao.paciente.cpf,
      pagador_endereco: transacao.paciente.endereco,
      pagador_telefone: transacao.paciente.telefone,
      pagador_email: transacao.paciente.email,
    };
  };

  const handleGenerateRecibo = async (downloadOnly = false) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsGenerating(true);
    
    try {
      const data = await prepareReciboData();
      setReciboData(data);
      
      const generator = new ReciboGenerator();
      const { pdf, hash, signature } = await generator.generateRecibo(data);
      
      if (downloadOnly) {
        // Apenas fazer download sem salvar no banco
        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-${data.numero_recibo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Recibo gerado e baixado com sucesso!');
      } else {
        // Salvar no banco de dados
        const reciboSalvo = await saveReciboToDatabase(
          data,
          transacao.id,
          psicologo.id,
          transacao.paciente.id,
          undefined, // PDF URL (seria necessário upload para storage)
          hash,
          signature
        );
        
        // Fazer download
        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recibo-${data.numero_recibo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Recibo gerado, salvo e baixado com sucesso!');
        
        if (onReciboGenerated) {
          onReciboGenerated(reciboSalvo.id);
        }
      }
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      toast.error('Erro ao gerar recibo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewMode(true);
    
    try {
      const data = await prepareReciboData();
      setReciboData(data);
      
      const generator = new ReciboGenerator();
      const { pdf } = await generator.generateRecibo(data);
      
      // Abrir preview em nova aba
      const url = URL.createObjectURL(pdf);
      window.open(url, '_blank');
      
      // Limpar URL após um tempo
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
      
      toast.success('Preview do recibo aberto em nova aba');
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast.error('Erro ao gerar preview do recibo');
    } finally {
      setIsPreviewMode(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Botão de Preview */}
        <button
          onClick={handlePreview}
          disabled={isPreviewMode}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Visualizar recibo antes de gerar"
        >
          {isPreviewMode ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          Preview
        </button>

        {/* Botão de Download Rápido */}
        <button
          onClick={() => handleGenerateRecibo(true)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Gerar e baixar recibo (sem salvar no sistema)"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download
        </button>

        {/* Botão de Gerar e Salvar */}
        <button
          onClick={() => handleGenerateRecibo(false)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Gerar, salvar no sistema e baixar recibo"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Gerar Recibo
        </button>
      </div>

      {/* Informações do recibo que será gerado */}
      <div className="text-xs text-gray-500 mt-1">
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          <span>Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transacao.valor)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          <span>Paciente: {transacao.paciente.nome}</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          <span>Psicólogo: {psicologo.nome}</span>
        </div>
      </div>
    </div>
  );
}