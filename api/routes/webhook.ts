/**
 * Webhook para receber mensagens da Evolution API
 * Baseado na arquitetura técnica definida na documentação
 */

import express, { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { auditLogger } from '../middleware/auditLogger.js';
import { notifyNewChatMessage, notifyWhatsAppStatus } from '../services/websocket.js';

const router = express.Router();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware para validar webhook
const validateWebhook = (req: Request, res: Response, next: any) => {
  try {
    console.log('🔍 [WEBHOOK] Validando webhook recebido:', {
      headers: req.headers,
      hasBody: !!req.body,
      bodySize: JSON.stringify(req.body).length
    });

    const signature = req.headers['x-evolution-signature'] as string;
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] EVOLUTION_WEBHOOK_SECRET não configurado');
      return res.status(500).json({ error: 'Configuração de webhook inválida' });
    }

    if (!signature) {
      console.error('❌ [WEBHOOK] Assinatura do webhook ausente');
      return res.status(401).json({ error: 'Assinatura do webhook ausente' });
    }

    // Verificar assinatura HMAC
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    console.log('🔐 [WEBHOOK] Verificando assinatura:', {
      provided: providedSignature.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...',
      match: expectedSignature === providedSignature
    });

    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      console.error('❌ [WEBHOOK] Assinatura do webhook inválida');
      return res.status(401).json({ error: 'Assinatura do webhook inválida' });
    }

    console.log('✅ [WEBHOOK] Assinatura validada com sucesso');
    next();
  } catch (error) {
    console.error('💥 [WEBHOOK] Erro na validação do webhook:', error);
    res.status(500).json({ error: 'Erro na validação do webhook' });
  }
};

/**
 * POST /api/webhook/evolution
 * Receber mensagens da Evolution API
 */
router.post('/evolution', validateWebhook, async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    // Log detalhado do webhook recebido
    console.log('📨 [WEBHOOK] Webhook recebido:', {
      event,
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(data || {}),
      dataSize: JSON.stringify(data).length
    });

    // Log específico para cada tipo de evento
    if (event === 'messages.upsert' && data?.messages) {
      console.log('💬 [WEBHOOK] Mensagens recebidas:', {
        count: data.messages.length,
        messages: data.messages.map((msg: any) => ({
          id: msg.key?.id,
          fromMe: msg.key?.fromMe,
          remoteJid: msg.key?.remoteJid,
          hasConversation: !!msg.message?.conversation,
          messageType: Object.keys(msg.message || {})[0]
        }))
      });
    }

    switch (event) {
      case 'messages.upsert':
        await processIncomingMessage(data);
        break;
      
      case 'messages.update':
        await processMessageUpdate(data);
        break;
      
      case 'connection.update':
        await processConnectionUpdate(data);
        break;
      
      default:
        console.log('⚠️ [WEBHOOK] Evento não processado:', event);
    }

    console.log('✅ [WEBHOOK] Webhook processado com sucesso');
    res.json({ success: true });

  } catch (error) {
    console.error('💥 [WEBHOOK] Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Processar mensagem recebida
 */
async function processIncomingMessage(data: any) {
  try {
    console.log('🔄 [PROCESS] Iniciando processamento de mensagens');
    const { messages } = data;

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ [PROCESS] Dados de mensagens inválidos:', { messages });
      return;
    }

    for (const message of messages) {
      console.log('📝 [PROCESS] Processando mensagem:', {
        messageId: message.key?.id,
        fromMe: message.key?.fromMe,
        remoteJid: message.key?.remoteJid,
        timestamp: message.messageTimestamp
      });

      // Verificar se é mensagem de entrada (não enviada pelo sistema)
      if (message.key.fromMe) {
        console.log('⏭️ [PROCESS] Ignorando mensagem enviada pelo sistema');
        continue;
      }

      const numeroRemetente = message.key.remoteJid.replace('@s.whatsapp.net', '');
      console.log('🔍 [PROCESS] Buscando paciente para número:', numeroRemetente);
      
      // Normalizar número para busca (remover 55 do país se presente)
      let numeroNormalizado = numeroRemetente;
      if (numeroNormalizado.startsWith('55') && numeroNormalizado.length === 13) {
        numeroNormalizado = numeroNormalizado.substring(2); // Remove o código do país
      }
      
      // Formatar número para o padrão do banco: (XX) XXXXX-XXXX
      const numeroFormatado = numeroNormalizado.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      
      console.log('🔍 [PROCESS] Número formatado para busca:', {
        original: numeroRemetente,
        normalizado: numeroNormalizado,
        formatado: numeroFormatado
      });
      
      // Buscar paciente pelo número de telefone
      const { data: paciente, error: pacienteError } = await supabase
        .from('pacientes')
        .select('id, psicologo_id, nome')
        .eq('telefone', numeroFormatado)
        .maybeSingle();

      if (pacienteError || !paciente) {
        console.log('❌ [PROCESS] Paciente não encontrado para o número:', {
          numero: numeroRemetente,
          error: pacienteError?.message
        });
        
        // Log de tentativa de contato não autorizado
        await auditLogger.log({
          userId: 'system',
          action: 'unauthorized_contact_attempt',
          resource: 'message',
          details: { 
            numeroRemetente,
            conteudo: message.message?.conversation || 'Mensagem não textual'
          }
        });
        
        continue;
      }

      console.log('✅ [PROCESS] Paciente encontrado:', {
        pacienteId: paciente.id,
        nome: paciente.nome,
        psicologoId: paciente.psicologo_id
      });

      // Buscar ou criar conversa
      console.log('🔍 [PROCESS] Buscando conversa existente');
      let { data: conversa, error: conversaError } = await supabase
        .from('conversas')
        .select('id')
        .eq('psicologo_id', paciente.psicologo_id)
        .eq('paciente_id', paciente.id)
        .single();

      if (conversaError && conversaError.code === 'PGRST116') {
        // Conversa não existe, criar nova
        console.log('➕ [PROCESS] Criando nova conversa');
        const { data: novaConversa, error: criarError } = await supabase
          .from('conversas')
          .insert({
            psicologo_id: paciente.psicologo_id,
            paciente_id: paciente.id
          })
          .select('id')
          .single();

        if (criarError) {
          console.error('❌ [PROCESS] Erro ao criar conversa:', criarError);
          continue;
        }

        conversa = novaConversa;
        console.log('✅ [PROCESS] Nova conversa criada:', conversa.id);
      } else if (conversaError) {
        console.error('❌ [PROCESS] Erro ao buscar conversa:', conversaError);
        continue;
      } else {
        console.log('✅ [PROCESS] Conversa encontrada:', conversa.id);
      }

      // Extrair conteúdo da mensagem
      let conteudo = '';
      let tipo = 'texto';

      console.log('📄 [PROCESS] Extraindo conteúdo da mensagem:', {
        messageKeys: Object.keys(message.message || {})
      });

      if (message.message?.conversation) {
        conteudo = message.message.conversation;
        tipo = 'texto';
      } else if (message.message?.imageMessage) {
        conteudo = message.message.imageMessage.caption || '[Imagem]';
        tipo = 'imagem';
      } else if (message.message?.audioMessage) {
        conteudo = '[Áudio]';
        tipo = 'audio';
      } else if (message.message?.documentMessage) {
        conteudo = message.message.documentMessage.fileName || '[Documento]';
        tipo = 'documento';
      } else {
        conteudo = '[Mensagem não suportada]';
        tipo = 'outros';
      }

      console.log('📝 [PROCESS] Conteúdo extraído:', { conteudo, tipo });

      // Verificar se a mensagem já existe (evitar duplicatas)
      console.log('🔍 [PROCESS] Verificando duplicatas');
      const { data: mensagemExistente } = await supabase
        .from('mensagens')
        .select('id')
        .eq('whatsapp_message_id', message.key.id)
        .single();

      if (mensagemExistente) {
        console.log('⏭️ [PROCESS] Mensagem já processada:', message.key.id);
        continue;
      }

      // Criar mensagem no banco
      console.log('💾 [PROCESS] Salvando mensagem no banco');
      const { data: novaMensagem, error: mensagemError } = await supabase
        .from('mensagens')
        .insert({
          conversa_id: conversa.id,
          conteudo,
          tipo,
          direcao: 'recebida',
          status_entrega: 'entregue',
          whatsapp_message_id: message.key.id,
          metadata: {
            timestamp: message.messageTimestamp,
            pushName: message.pushName,
            originalMessage: message
          }
        })
        .select('*')
        .single();

      if (mensagemError) {
        console.error('❌ [PROCESS] Erro ao criar mensagem:', mensagemError);
        continue;
      }

      console.log('✅ [PROCESS] Mensagem salva com sucesso:', {
        mensagemId: novaMensagem.id,
        conversaId: conversa.id
      });

      // Log da mensagem recebida
      await auditLogger.log({
        userId: paciente.psicologo_id,
        action: 'message_received',
        resource: 'message',
        resourceId: novaMensagem.id,
        details: { 
          pacienteId: paciente.id,
          tipo,
          numeroRemetente
        }
      });

      // Notificar via WebSocket
      console.log('📡 [PROCESS] Enviando notificação WebSocket');
      try {
        notifyNewChatMessage(paciente.psicologo_id, novaMensagem, conversa);
        console.log('✅ [PROCESS] Notificação WebSocket enviada');
      } catch (wsError) {
        console.error('❌ [PROCESS] Erro ao enviar notificação WebSocket:', wsError);
      }

      console.log('🎉 [PROCESS] Mensagem processada com sucesso:', {
        mensagemId: novaMensagem.id,
        paciente: paciente.nome,
        tipo,
        conteudo: conteudo.substring(0, 50) + (conteudo.length > 50 ? '...' : '')
      });
    }

    console.log('✅ [PROCESS] Processamento de mensagens concluído');

  } catch (error) {
    console.error('💥 [PROCESS] Erro ao processar mensagem recebida:', error);
    throw error;
  }
}

/**
 * Processar atualização de status de mensagem
 */
async function processMessageUpdate(data: any) {
  try {
    const { messages } = data;

    for (const message of messages) {
      // Atualizar status de entrega/leitura
      let novoStatus = 'enviada';
      
      if (message.update?.status === 3) {
        novoStatus = 'entregue';
      } else if (message.update?.status === 4) {
        novoStatus = 'lida';
      }

      const { error } = await supabase
        .from('mensagens')
        .update({ 
          status_entrega: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('whatsapp_message_id', message.key.id);

      if (error) {
        console.error('Erro ao atualizar status da mensagem:', error);
      } else {
        console.log('Status da mensagem atualizado:', {
          messageId: message.key.id,
          novoStatus
        });
      }
    }

  } catch (error) {
    console.error('Erro ao processar atualização de mensagem:', error);
    throw error;
  }
}

/**
 * Processar atualização de conexão
 */
async function processConnectionUpdate(data: any) {
  try {
    const { instance, state } = data;

    // Atualizar status da instância na configuração
    const { error } = await supabase
      .from('configuracoes_whatsapp')
      .update({ 
        status_conexao: state,
        ultima_conexao: new Date().toISOString()
      })
      .eq('instance_name', instance);

    if (error) {
      console.error('Erro ao atualizar status de conexão:', error);
    } else {
      // Notificar mudança de status via WebSocket
      // Buscar psicólogo pela instância
      const { data: config } = await supabase
        .from('configuracoes_whatsapp')
        .select('psicologo_id')
        .eq('instance_name', instance)
        .single();

      if (config) {
        notifyWhatsAppStatus(config.psicologo_id, {
          instance,
          state,
          qrcode: data.qrcode
        });
      }

      console.log('Status de conexão atualizado:', { instance, state });
    }

    // Log da mudança de status
    await auditLogger.log({
      userId: 'system',
      action: 'connection_status_changed',
      resource: 'configuration',
      details: { instance, state }
    });

  } catch (error) {
    console.error('Erro ao processar atualização de conexão:', error);
    throw error;
  }
}

/**
 * Endpoints de desenvolvimento/debug
 */
if (process.env.NODE_ENV === 'development') {
  // Endpoint para testar webhook
  router.post('/test', (req: Request, res: Response) => {
    console.log('📨 [WEBHOOK TEST] Recebido:', req.body);
    res.json({ success: true, received: req.body });
  });

  // Endpoint para verificar mensagens no banco
  router.get('/check-messages', async (req: Request, res: Response) => {
    try {
      console.log('🔍 [DEBUG] Verificando mensagens no banco...');
      
      // Buscar conversas
      const { data: conversas, error: conversasError } = await supabase
        .from('conversas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (conversasError) {
        console.error('❌ [DEBUG] Erro ao buscar conversas:', conversasError);
        return res.status(500).json({ error: 'Erro ao buscar conversas', details: conversasError });
      }

      // Buscar mensagens
      const { data: mensagens, error: mensagensError } = await supabase
        .from('mensagens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (mensagensError) {
        console.error('❌ [DEBUG] Erro ao buscar mensagens:', mensagensError);
        return res.status(500).json({ error: 'Erro ao buscar mensagens', details: mensagensError });
      }

      // Buscar pacientes
      const { data: pacientes, error: pacientesError } = await supabase
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pacientesError) {
        console.error('❌ [DEBUG] Erro ao buscar pacientes:', pacientesError);
        return res.status(500).json({ error: 'Erro ao buscar pacientes', details: pacientesError });
      }

      console.log('✅ [DEBUG] Dados encontrados:', {
        conversas: conversas?.length || 0,
        mensagens: mensagens?.length || 0,
        pacientes: pacientes?.length || 0
      });

      res.json({
        success: true,
        data: {
          conversas: conversas || [],
          mensagens: mensagens || [],
          pacientes: pacientes || [],
          counts: {
            conversas: conversas?.length || 0,
            mensagens: mensagens?.length || 0,
            pacientes: pacientes?.length || 0
          }
        }
      });

    } catch (error) {
      console.error('💥 [DEBUG] Erro ao verificar mensagens:', error);
      res.status(500).json({ error: 'Erro interno', details: error });
    }
  });

  // Endpoint para atualizar psicólogo da conversa
  router.post('/update-conversation-psychologist', async (req: Request, res: Response) => {
    try {
      const { conversaId, newPsicologoId } = req.body;
      console.log('🔄 [DEBUG] Atualizando psicólogo da conversa:', conversaId, 'para:', newPsicologoId);

      const { data, error } = await supabase
        .from('conversas')
        .update({ psicologo_id: newPsicologoId })
        .eq('id', conversaId)
        .select();

      if (error) {
        console.error('❌ [DEBUG] Erro ao atualizar conversa:', error);
        return res.status(500).json({ error: 'Erro ao atualizar conversa', details: error });
      }

      console.log('✅ [DEBUG] Conversa atualizada:', data);
      res.json({ success: true, data });

    } catch (error) {
      console.error('💥 [DEBUG] Erro ao atualizar conversa:', error);
      res.status(500).json({ error: 'Erro interno', details: error });
    }
  });

  // Endpoint para testar API de chat sem autenticação
  router.get('/test-chat-api/:pacienteId', async (req: Request, res: Response) => {
    try {
      const { pacienteId } = req.params;
      console.log('🔍 [DEBUG] Testando API de chat para paciente:', pacienteId);

      // Buscar conversa do paciente
      const { data: conversa, error: conversaError } = await supabase
        .from('conversas')
        .select('*')
        .eq('paciente_id', pacienteId)
        .single();

      if (conversaError) {
        console.error('❌ [DEBUG] Erro ao buscar conversa:', conversaError);
        return res.status(404).json({ error: 'Conversa não encontrada', details: conversaError });
      }

      // Buscar mensagens da conversa
      const { data: mensagens, error: mensagensError } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversa.id)
        .order('created_at', { ascending: true });

      if (mensagensError) {
        console.error('❌ [DEBUG] Erro ao buscar mensagens:', mensagensError);
        return res.status(500).json({ error: 'Erro ao buscar mensagens', details: mensagensError });
      }

      // Buscar dados do paciente
      const { data: paciente, error: pacienteError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single();

      if (pacienteError) {
        console.error('❌ [DEBUG] Erro ao buscar paciente:', pacienteError);
        return res.status(404).json({ error: 'Paciente não encontrado', details: pacienteError });
      }

      console.log('✅ [DEBUG] Dados da conversa encontrados:', {
        conversa: conversa.id,
        mensagens: mensagens?.length || 0,
        paciente: paciente.nome
      });

      res.json({
        success: true,
        data: {
          conversa,
          mensagens: mensagens || [],
          paciente,
          counts: {
            mensagens: mensagens?.length || 0
          }
        }
      });

    } catch (error) {
      console.error('💥 [DEBUG] Erro ao testar API de chat:', error);
      res.status(500).json({ error: 'Erro interno', details: error });
    }
  });

  // Endpoint para simular mensagem do WhatsApp
  router.post('/simulate-message', async (req: Request, res: Response) => {
    try {
      console.log('🧪 [SIMULATE] Simulando mensagem do WhatsApp');
      
      const { telefone, mensagem } = req.body;
      
      if (!telefone || !mensagem) {
        return res.status(400).json({ 
          error: 'Telefone e mensagem são obrigatórios',
          example: {
            telefone: '5511999999999',
            mensagem: 'Olá, esta é uma mensagem de teste'
          }
        });
      }

      // Simular estrutura de mensagem da Evolution API
      const simulatedWebhook = {
        event: 'messages.upsert',
        data: {
          messages: [{
            key: {
              id: `SIMULATED_${Date.now()}`,
              fromMe: false,
              remoteJid: `${telefone}@s.whatsapp.net`
            },
            message: {
              conversation: mensagem
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            pushName: 'Teste Simulado'
          }]
        }
      };

      console.log('🧪 [SIMULATE] Processando mensagem simulada:', simulatedWebhook);

      // Processar a mensagem simulada
      await processIncomingMessage(simulatedWebhook.data);

      res.json({ 
        success: true, 
        message: 'Mensagem simulada processada com sucesso',
        data: simulatedWebhook
      });

    } catch (error) {
      console.error('💥 [SIMULATE] Erro ao simular mensagem:', error);
      res.status(500).json({ 
        error: 'Erro ao simular mensagem',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}

export default router;