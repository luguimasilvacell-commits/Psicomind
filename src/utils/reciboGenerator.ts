import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

export interface ReciboData {
  numero_recibo: string;
  valor_recibo: number;
  data_emissao: string;
  data_vencimento?: string;
  descricao_servico: string;
  observacoes?: string;
  forma_pagamento?: string;
  data_pagamento?: string;
  
  // Dados do emissor (psicólogo)
  emissor_nome: string;
  emissor_cpf?: string;
  emissor_crp?: string;
  emissor_endereco?: string;
  emissor_telefone?: string;
  emissor_email?: string;
  
  // Dados do pagador (paciente)
  pagador_nome: string;
  pagador_cpf?: string;
  pagador_endereco?: string;
  pagador_telefone?: string;
  pagador_email?: string;
}

export class ReciboGenerator {
  private doc: jsPDF;
  
  constructor() {
    this.doc = new jsPDF();
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private addHeader(): void {
    // Título principal
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('RECIBO DE PAGAMENTO', 105, 30, { align: 'center' });
    
    // Linha decorativa
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 35, 190, 35);
  }

  private addReciboInfo(data: ReciboData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    // Número do recibo
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Recibo Nº:', 20, 50);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.numero_recibo, 50, 50);
    
    // Data de emissão
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Data de Emissão:', 120, 50);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(this.formatDate(data.data_emissao), 165, 50);
    
    // Valor
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Valor:', 20, 65);
    this.doc.text(this.formatCurrency(data.valor_recibo), 45, 65);
  }

  private addEmissorInfo(data: ReciboData): number {
    let yPosition = 85;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DADOS DO EMISSOR', 20, yPosition);
    
    yPosition += 10;
    this.doc.setFont('helvetica', 'normal');
    
    // Nome
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Nome:', 20, yPosition);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.emissor_nome, 40, yPosition);
    
    // CPF e CRP na mesma linha
    if (data.emissor_cpf) {
      yPosition += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('CPF:', 20, yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.formatCPF(data.emissor_cpf), 35, yPosition);
    }
    
    if (data.emissor_crp) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('CRP:', 100, yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(data.emissor_crp, 115, yPosition);
    }
    
    // Endereço
    if (data.emissor_endereco) {
      yPosition += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Endereço:', 20, yPosition);
      this.doc.setFont('helvetica', 'normal');
      const endereco = this.doc.splitTextToSize(data.emissor_endereco, 140);
      this.doc.text(endereco, 55, yPosition);
      yPosition += (endereco.length - 1) * 5;
    }
    
    // Telefone e Email
    if (data.emissor_telefone || data.emissor_email) {
      yPosition += 8;
      if (data.emissor_telefone) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Telefone:', 20, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(data.emissor_telefone, 55, yPosition);
      }
      
      if (data.emissor_email) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Email:', 100, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(data.emissor_email, 120, yPosition);
      }
    }
    
    return yPosition + 15;
  }

  private addPagadorInfo(data: ReciboData, startY: number): number {
    let yPosition = startY;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DADOS DO PAGADOR', 20, yPosition);
    
    yPosition += 10;
    this.doc.setFont('helvetica', 'normal');
    
    // Nome
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Nome:', 20, yPosition);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.pagador_nome, 40, yPosition);
    
    // CPF
    if (data.pagador_cpf) {
      yPosition += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('CPF:', 20, yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.formatCPF(data.pagador_cpf), 35, yPosition);
    }
    
    // Endereço
    if (data.pagador_endereco) {
      yPosition += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Endereço:', 20, yPosition);
      this.doc.setFont('helvetica', 'normal');
      const endereco = this.doc.splitTextToSize(data.pagador_endereco, 140);
      this.doc.text(endereco, 55, yPosition);
      yPosition += (endereco.length - 1) * 5;
    }
    
    // Telefone e Email
    if (data.pagador_telefone || data.pagador_email) {
      yPosition += 8;
      if (data.pagador_telefone) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Telefone:', 20, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(data.pagador_telefone, 55, yPosition);
      }
      
      if (data.pagador_email) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Email:', 100, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(data.pagador_email, 120, yPosition);
      }
    }
    
    return yPosition + 15;
  }

  private addServicoInfo(data: ReciboData, startY: number): number {
    let yPosition = startY;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DESCRIÇÃO DO SERVIÇO', 20, yPosition);
    
    yPosition += 10;
    this.doc.setFont('helvetica', 'normal');
    
    const descricao = this.doc.splitTextToSize(data.descricao_servico, 170);
    this.doc.text(descricao, 20, yPosition);
    yPosition += descricao.length * 5;
    
    // Observações
    if (data.observacoes) {
      yPosition += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Observações:', 20, yPosition);
      yPosition += 5;
      this.doc.setFont('helvetica', 'normal');
      const obs = this.doc.splitTextToSize(data.observacoes, 170);
      this.doc.text(obs, 20, yPosition);
      yPosition += obs.length * 5;
    }
    
    return yPosition + 10;
  }

  private addPagamentoInfo(data: ReciboData, startY: number): number {
    let yPosition = startY;
    
    if (data.forma_pagamento || data.data_pagamento) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('INFORMAÇÕES DE PAGAMENTO', 20, yPosition);
      
      yPosition += 10;
      
      if (data.forma_pagamento) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Forma de Pagamento:', 20, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(data.forma_pagamento, 85, yPosition);
        yPosition += 8;
      }
      
      if (data.data_pagamento) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Data do Pagamento:', 20, yPosition);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(this.formatDate(data.data_pagamento), 80, yPosition);
        yPosition += 8;
      }
      
      yPosition += 5;
    }
    
    return yPosition;
  }

  private addAssinatura(startY: number, emissorNome: string): void {
    const yPosition = Math.max(startY, 240);
    
    // Linha para assinatura
    this.doc.setLineWidth(0.3);
    this.doc.line(120, yPosition, 190, yPosition);
    
    // Criar assinatura fake baseada no nome
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'italic');
    
    // Gerar uma assinatura estilizada baseada no nome
    const assinaturaFake = this.generateFakeSignature(emissorNome);
    this.doc.text(assinaturaFake, 155, yPosition - 5, { align: 'center' });
    
    // Nome do emissor abaixo da linha
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(emissorNome, 155, yPosition + 8, { align: 'center' });
  }

  private generateFakeSignature(nome: string): string {
    // Criar uma representação estilizada do nome para simular uma assinatura
    const palavras = nome.split(' ');
    let assinatura = '';
    
    // Pegar primeira letra de cada palavra e algumas letras do primeiro nome
    if (palavras.length > 0) {
      // Primeira palavra (nome) - pegar algumas letras
      const primeiroNome = palavras[0];
      assinatura += primeiroNome.charAt(0).toUpperCase();
      if (primeiroNome.length > 1) {
        assinatura += primeiroNome.substring(1, Math.min(4, primeiroNome.length)).toLowerCase();
      }
      
      // Adicionar iniciais dos outros nomes
      for (let i = 1; i < palavras.length; i++) {
        if (palavras[i].length > 0) {
          assinatura += ' ' + palavras[i].charAt(0).toUpperCase() + '.';
        }
      }
    }
    
    return assinatura;
  }

  private addFooter(): void {
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Este recibo foi gerado automaticamente pelo sistema Psicomind', 105, 280, { align: 'center' });
    this.doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' });
  }

  private generateHash(content: string): string {
    // Implementação simples de hash para verificação de integridade
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private generateDigitalSignature(data: ReciboData): string {
    // Implementação básica de assinatura digital
    const content = JSON.stringify(data);
    const timestamp = Date.now().toString();
    const signature = btoa(content + timestamp);
    return signature;
  }

  public async generateRecibo(data: ReciboData): Promise<{ pdf: Blob; hash: string; signature: string }> {
    // Limpar documento
    this.doc = new jsPDF();
    
    // Adicionar conteúdo
    this.addHeader();
    this.addReciboInfo(data);
    
    let currentY = this.addEmissorInfo(data);
    currentY = this.addPagadorInfo(data, currentY);
    currentY = this.addServicoInfo(data, currentY);
    currentY = this.addPagamentoInfo(data, currentY);
    
    this.addAssinatura(currentY, data.emissor_nome);
    this.addFooter();
    
    // Gerar PDF como blob
    const pdfBlob = this.doc.output('blob');
    
    // Gerar hash e assinatura
    const pdfContent = await pdfBlob.text();
    const hash = this.generateHash(pdfContent);
    const signature = this.generateDigitalSignature(data);
    
    return {
      pdf: pdfBlob,
      hash,
      signature
    };
  }

  public downloadRecibo(data: ReciboData, filename?: string): void {
    this.generateRecibo(data).then(({ pdf }) => {
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `recibo-${data.numero_recibo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}

// Função utilitária para gerar número de recibo
export async function generateReciboNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Buscar o último número do ano atual
  const { data: lastRecibo } = await supabase
    .from('recibos')
    .select('numero_recibo')
    .like('numero_recibo', `REC-${year}-%`)
    .order('numero_recibo', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  
  if (lastRecibo && lastRecibo.length > 0) {
    const lastNumber = lastRecibo[0].numero_recibo.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `REC-${year}-${nextNumber.toString().padStart(4, '0')}`;
}

// Função para salvar recibo no banco de dados
export async function saveReciboToDatabase(
  reciboData: ReciboData,
  transacaoId: string,
  psicologoId: string,
  pacienteId: string,
  pdfUrl?: string,
  pdfHash?: string,
  assinaturaDigital?: string
) {
  const { data, error } = await supabase
    .from('recibos')
    .insert({
      transacao_id: transacaoId,
      psicologo_id: psicologoId,
      paciente_id: pacienteId,
      numero_recibo: reciboData.numero_recibo,
      valor_recibo: reciboData.valor_recibo,
      data_emissao: reciboData.data_emissao,
      data_vencimento: reciboData.data_vencimento,
      descricao_servico: reciboData.descricao_servico,
      observacoes: reciboData.observacoes,
      forma_pagamento: reciboData.forma_pagamento,
      data_pagamento: reciboData.data_pagamento,
      emissor_nome: reciboData.emissor_nome,
      emissor_cpf: reciboData.emissor_cpf,
      emissor_crp: reciboData.emissor_crp,
      emissor_endereco: reciboData.emissor_endereco,
      emissor_telefone: reciboData.emissor_telefone,
      emissor_email: reciboData.emissor_email,
      pagador_nome: reciboData.pagador_nome,
      pagador_cpf: reciboData.pagador_cpf,
      pagador_endereco: reciboData.pagador_endereco,
      pagador_telefone: reciboData.pagador_telefone,
      pagador_email: reciboData.pagador_email,
      pdf_gerado: !!pdfUrl,
      pdf_url: pdfUrl,
      pdf_hash: pdfHash,
      assinatura_digital: assinaturaDigital,
      created_by: psicologoId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar recibo: ${error.message}`);
  }

  return data;
}