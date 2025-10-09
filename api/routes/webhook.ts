import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { evolutionApiService } from '../services/evolutionApiService.js';
import geminiService from '../services/geminiService.js';
import sentimentService from '../services/sentimentService.js';

const router = express.Router();

// Middleware para logs detalhados de webhook
const webhookLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`[WEBHOOK] ${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString(),
  });
  next();
};

// Aplicar logger a todas as rotas de webhook
router.use(webhookLogger);

// ===== WEBHOOK DA EVOLUTION API =====

// Verificação do webhook (GET) - Evolution API não usa verificação como Meta WhatsApp
router.get('/whatsapp', (req, res) => {
  try {
    console.log('[WEBHOOK] Verificação da Evolution API');
    
    // Evolution API não requer verificação de webhook como Meta WhatsApp
    // Retorna status OK para confirmar que o endpoint está ativo
    res.status(200).json({
      status: 'active',
      service: 'evolution-api',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WEBHOOK] Erro na verificação:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Recebimento de mensagens (POST)
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('[WEBHOOK] Mensagem recebida da Evolution API:', JSON.stringify(req.body, null, 2));

    // Processar webhook da Evolution API
    const { messages, statuses } = evolutionApiService.processWebhookMessage(req.body);

    // Processar mensagens recebidas
    for (const message of messages) {
      try {
        await processIncomingMessage(message);
      } catch (error) {
        console.error('[WEBHOOK] Erro ao processar mensagem:', error);
      }
    }

    // Processar status de mensagens enviadas
    for (const status of statuses) {
      try {
        await processMessageStatus(status);
      } catch (error) {
        console.error('[WEBHOOK] Erro ao processar status:', error);
      }
    }

    // Responder rapidamente para a Evolution API
    res.status(200).send('OK');
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Função para processar mensagens recebidas
async function processIncomingMessage(message: {
  from: string;
  text: string;
  timestamp: Date;
  messageId: string;
}) {
  console.log('[WEBHOOK] Processando mensagem:', message);

  try {
    // 1. Análise de sentimentos
    const sentimentAnalysis = sentimentService.analyze(message.text, {
      patientId: message.from, // Usar número do WhatsApp como ID temporário
      messageType: 'whatsapp',
    });

    console.log('[WEBHOOK] Análise de sentimentos:', sentimentAnalysis);

    // 2. Verificar se é uma situação de emergência
    if (sentimentAnalysis.psychologyInsights.riskLevel === 'high') {
      await handleEmergencyMessage(message, sentimentAnalysis);
      return;
    }

    // 3. Gerar resposta com Gemini (se configurado)
    let aiResponse = '';
    if (geminiService.isConfigured()) {
      try {
        const geminiResult = await geminiService.sendMessage(message.text, {
          patientId: message.from,
          sessionType: 'whatsapp_chat',
          analysisType: 'both',
        });
        aiResponse = geminiResult.content;
      } catch (error) {
        console.error('[WEBHOOK] Erro ao gerar resposta com Gemini:', error);
        aiResponse = getDefaultResponse(sentimentAnalysis);
      }
    } else {
      aiResponse = getDefaultResponse(sentimentAnalysis);
    }

    // 4. Enviar resposta via Evolution API
    if (evolutionApiService.isConfigured() && evolutionApiService.getConnectionStatus()) {
      await evolutionApiService.sendMessage(message.from, aiResponse);
      console.log('[WEBHOOK] Resposta enviada:', aiResponse);
    }

    // 5. Log da interação
    logInteraction({
      type: 'whatsapp_message',
      from: message.from,
      message: message.text,
      response: aiResponse,
      sentiment: sentimentAnalysis,
      timestamp: message.timestamp,
    });

  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar mensagem:', error);
    
    // Enviar mensagem de erro amigável
    if (evolutionApiService.isConfigured() && evolutionApiService.getConnectionStatus()) {
      await evolutionApiService.sendMessage(
        message.from,
        'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns minutos ou entre em contato diretamente com seu terapeuta.'
      );
    }
  }
}

// Função para lidar com mensagens de emergência
async function handleEmergencyMessage(
  message: { from: string; text: string; timestamp: Date; messageId: string },
  sentimentAnalysis: any
) {
  console.log('[WEBHOOK] EMERGÊNCIA DETECTADA:', {
    from: message.from,
    riskLevel: sentimentAnalysis.psychologyInsights.riskLevel,
    keywords: sentimentAnalysis.psychologyInsights.keywords,
  });

  // 1. Enviar resposta de emergência imediata
  const emergencyTemplate = evolutionApiService.getTemplate('emergency_support');
  if (emergencyTemplate && evolutionApiService.isConfigured() && evolutionApiService.getConnectionStatus()) {
    await evolutionApiService.sendMessage(message.from, emergencyTemplate.content);
  }

  // 2. Enviar botões de ação rápida
  if (evolutionApiService.isConfigured() && evolutionApiService.getConnectionStatus()) {
    await evolutionApiService.sendInteractiveMessage(
      message.from,
      'Estou aqui para ajudar. Escolha uma opção:',
      [
        { id: 'emergency_call', title: '🚨 Emergência (CVV 188)' },
        { id: 'schedule_urgent', title: '📅 Agendar Urgente' },
        { id: 'talk_now', title: '💬 Conversar Agora' },
      ]
    );
  }

  // 3. Notificar sistema de emergência (implementar conforme necessário)
  await notifyEmergencySystem({
    patientPhone: message.from,
    message: message.text,
    riskLevel: sentimentAnalysis.psychologyInsights.riskLevel,
    timestamp: message.timestamp,
    sentimentAnalysis,
  });

  // 4. Log de emergência
  logInteraction({
    type: 'emergency_alert',
    from: message.from,
    message: message.text,
    sentiment: sentimentAnalysis,
    timestamp: message.timestamp,
    priority: 'CRITICAL',
  });
}

// Função para processar status de mensagens
async function processMessageStatus(status: {
  messageId: string;
  status: string;
  timestamp: Date;
  recipientId: string;
}) {
  console.log('[WEBHOOK] Status da mensagem:', status);

  // Log do status da mensagem
  logInteraction({
    type: 'message_status',
    messageId: status.messageId,
    status: status.status,
    recipientId: status.recipientId,
    timestamp: status.timestamp,
  });

  // Implementar lógica adicional conforme necessário
  // Por exemplo: atualizar banco de dados, notificar terapeutas, etc.
}

// Função para gerar resposta padrão baseada no sentimento
function getDefaultResponse(sentimentAnalysis: any): string {
  const { label, psychologyInsights } = sentimentAnalysis;

  switch (psychologyInsights.riskLevel) {
    case 'high':
      return 'Percebo que você está passando por um momento muito difícil. É importante buscar ajuda profissional imediata. Se for uma emergência, ligue para o CVV (188) ou SAMU (192). Estou aqui para apoiá-lo(a).';
    
    case 'medium':
      return 'Entendo que você está enfrentando algumas dificuldades. Suas emoções são válidas e é normal passar por momentos assim. Que tal conversarmos sobre o que está acontecendo? Estou aqui para ouvir e ajudar.';
    
    case 'low':
      if (label === 'positive') {
        return 'Fico feliz em saber que você está bem! É importante celebrar os momentos positivos. Continue cuidando de si mesmo(a) e lembre-se de que estou aqui sempre que precisar.';
      } else if (label === 'negative') {
        return 'Percebo que você pode estar se sentindo um pouco para baixo. Isso é normal e faz parte da experiência humana. Gostaria de compartilhar o que está sentindo? Estou aqui para ouvir.';
      } else {
        return 'Olá! Como posso ajudá-lo(a) hoje? Estou aqui para conversar e oferecer suporte sempre que precisar.';
      }
    
    default:
      return 'Olá! Obrigado por entrar em contato. Como posso ajudá-lo(a) hoje? Estou aqui para oferecer suporte e conversar sobre qualquer coisa que esteja em sua mente.';
  }
}

// Função para notificar sistema de emergência
async function notifyEmergencySystem(emergencyData: {
  patientPhone: string;
  message: string;
  riskLevel: string;
  timestamp: Date;
  sentimentAnalysis: any;
}) {
  // Implementar notificação para terapeutas, sistema de emergência, etc.
  console.log('[EMERGENCY] Notificação de emergência:', emergencyData);
  
  // Aqui você pode implementar:
  // - Envio de email para terapeutas
  // - Notificação push para aplicativo
  // - Integração com sistema de emergência hospitalar
  // - Criação de ticket de alta prioridade
  // - etc.
}

// Função para log de interações
function logInteraction(data: any) {
  const logEntry = {
    ...data,
    timestamp: data.timestamp || new Date(),
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  console.log('[INTERACTION_LOG]', JSON.stringify(logEntry, null, 2));
  
  // Aqui você pode implementar:
  // - Salvar em banco de dados
  // - Enviar para sistema de analytics
  // - Armazenar em arquivo de log
  // - etc.
}

// ===== WEBHOOK PARA OUTROS SERVIÇOS =====

// Webhook genérico para integrações futuras
router.post('/generic', [
  body('service').notEmpty().withMessage('Serviço é obrigatório'),
  body('event').notEmpty().withMessage('Evento é obrigatório'),
  body('data').isObject().withMessage('Dados devem ser um objeto'),
], async (req, res) => {
  try {
    const { service, event, data } = req.body;
    
    console.log(`[WEBHOOK] ${service} - ${event}:`, data);

    // Processar webhook baseado no serviço
    switch (service) {
      case 'calendar':
        await processCalendarWebhook(event, data);
        break;
      case 'payment':
        await processPaymentWebhook(event, data);
        break;
      case 'email':
        await processEmailWebhook(event, data);
        break;
      default:
        console.log(`[WEBHOOK] Serviço não reconhecido: ${service}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar webhook genérico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Funções para processar webhooks específicos
async function processCalendarWebhook(event: string, data: any) {
  console.log('[WEBHOOK] Processando evento de calendário:', event, data);
  // Implementar lógica para eventos de calendário
}

async function processPaymentWebhook(event: string, data: any) {
  console.log('[WEBHOOK] Processando evento de pagamento:', event, data);
  // Implementar lógica para eventos de pagamento
}

async function processEmailWebhook(event: string, data: any) {
  console.log('[WEBHOOK] Processando evento de email:', event, data);
  // Implementar lógica para eventos de email
}

// Rota de teste para webhooks
router.post('/test', async (req, res) => {
  try {
    console.log('[WEBHOOK] Teste recebido:', req.body);
    
    res.status(200).json({
      success: true,
      message: 'Webhook de teste recebido com sucesso',
      timestamp: new Date(),
      data: req.body,
    });
  } catch (error) {
    console.error('[WEBHOOK] Erro no teste:', error);
    res.status(500).json({ error: 'Erro no teste do webhook' });
  }
});

// Rota para verificar saúde dos webhooks
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    services: {
      evolutionApi: evolutionApiService.isConfigured(),
      evolutionApiConnected: evolutionApiService.getConnectionStatus(),
      gemini: geminiService.isConfigured(),
      sentiment: true,
    },
  });
});

export default router;