/**
 * Rotas da API para Sistema de Chat WhatsApp
 * Baseado na arquitetura técnica definida na documentação
 */

import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { auditLogger } from '../middleware/auditLogger.js';
import { sendMessage } from '../services/evolutionAPI.js';
import { notifyNewChatMessage, notifyMessageRead } from '../services/websocket.js';

// Interface para requisições autenticadas
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

const router = express.Router();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Cliente para operações administrativas (service role)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cliente para validação de tokens de usuário (anon key)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Função auxiliar para fazer requisições seguras à Evolution API
interface EvolutionAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  contentType?: string;
  responseText?: string;
}

const makeEvolutionAPIRequest = async (
  url: string, 
  options: RequestInit = {},
  timeout: number = 10000
): Promise<EvolutionAPIResponse> => {
  try {
    // Validar e normalizar URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      throw new Error('URL deve começar com http:// ou https://');
    }

    // Log da requisição
    console.log('🌐 Evolution API Request:', {
      url: normalizedUrl,
      method: options.method || 'GET',
      headers: options.headers,
      timestamp: new Date().toISOString()
    });

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Fazer a requisição
    const response = await fetch(normalizedUrl, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Log da resposta
    const contentType = response.headers.get('content-type') || '';
    console.log('📡 Evolution API Response:', {
      url: normalizedUrl,
      status: response.status,
      statusText: response.statusText,
      contentType,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });

    // Ler o conteúdo da resposta
    const responseText = await response.text();
    
    // Log dos primeiros caracteres para diagnóstico
    const preview = responseText.substring(0, 200);
    console.log('📄 Response Preview:', {
      url: normalizedUrl,
      preview: preview,
      length: responseText.length,
      isHTML: responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html')
    });

    // Verificar se a resposta é JSON válido
    let data = null;
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', {
          url: normalizedUrl,
          contentType,
          responseText: preview,
          error: parseError
        });
        
        return {
          success: false,
          error: `Resposta não é JSON válido. Content-Type: ${contentType}. Conteúdo: ${preview}`,
          statusCode: response.status,
          contentType,
          responseText: preview
        };
      }
    } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      // Tentar fazer parse mesmo se o Content-Type não for JSON
      try {
        data = JSON.parse(responseText);
        console.log('⚠️ JSON detectado sem Content-Type correto:', { url: normalizedUrl, contentType });
      } catch (parseError) {
        console.error('❌ JSON Parse Error (sem Content-Type):', {
          url: normalizedUrl,
          contentType,
          responseText: preview,
          error: parseError
        });
        
        return {
          success: false,
          error: `Resposta parece JSON mas não é válida. Content-Type: ${contentType}. Conteúdo: ${preview}`,
          statusCode: response.status,
          contentType,
          responseText: preview
        };
      }
    } else {
      // Resposta não é JSON
      console.error('❌ Resposta não é JSON:', {
        url: normalizedUrl,
        contentType,
        responseText: preview,
        status: response.status
      });
      
      let errorMessage = 'Resposta da Evolution API não é JSON';
      
      if (responseText.trim().toLowerCase().includes('<!doctype') || responseText.trim().toLowerCase().includes('<html')) {
        errorMessage = 'Evolution API retornou uma página HTML em vez de JSON. Verifique a URL e configurações.';
      } else if (response.status === 404) {
        errorMessage = 'Endpoint não encontrado na Evolution API (404). Verifique a URL base.';
      } else if (response.status === 401) {
        errorMessage = 'Não autorizado (401). Verifique a chave da API.';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado (403). Verifique as permissões da chave da API.';
      } else if (response.status >= 500) {
        errorMessage = 'Erro interno da Evolution API (5xx). Tente novamente mais tarde.';
      }
      
      return {
        success: false,
        error: errorMessage,
        statusCode: response.status,
        contentType,
        responseText: preview
      };
    }

    // Verificar se a requisição foi bem-sucedida
    if (!response.ok) {
      console.error('❌ HTTP Error:', {
        url: normalizedUrl,
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      let errorMessage = `Erro HTTP ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Não autorizado. Verifique a chave da API.';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado. Verifique as permissões da chave da API.';
      } else if (response.status === 404) {
        errorMessage = 'Endpoint não encontrado. Verifique a URL da Evolution API.';
      } else if (response.status >= 500) {
        errorMessage = 'Erro interno da Evolution API. Tente novamente mais tarde.';
      } else if (data && data.message) {
        errorMessage = data.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        statusCode: response.status,
        contentType,
        data
      };
    }

    console.log('✅ Evolution API Success:', {
      url: normalizedUrl,
      status: response.status,
      dataType: typeof data
    });

    return {
      success: true,
      data,
      statusCode: response.status,
      contentType
    };

  } catch (error: any) {
    console.error('💥 Evolution API Request Error:', {
      url,
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    let errorMessage = 'Erro de conexão com a Evolution API';
    
    if (error.name === 'AbortError') {
      errorMessage = `Timeout na requisição (${timeout}ms). Verifique a conectividade com a Evolution API.`;
    } else if (error.message.includes('ENOTFOUND')) {
      errorMessage = 'Servidor Evolution API não encontrado. Verifique a URL.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Conexão recusada pela Evolution API. Verifique se o servidor está rodando.';
    } else if (error.message.includes('ETIMEDOUT')) {
      errorMessage = 'Timeout na conexão com a Evolution API.';
    } else if (error.message.includes('certificate')) {
      errorMessage = 'Erro de certificado SSL. Verifique a configuração HTTPS.';
    }

    return {
      success: false,
      error: errorMessage,
      statusCode: 0
    };
  }
};

// Middleware de autenticação
const authenticateUser = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const token = authHeader.substring(7);
    
    try {
      // Decodificar o JWT token para extrair informações do usuário
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // Verificar se o token não expirou
      if (Date.now() >= payload.exp * 1000) {
        return res.status(401).json({ error: 'Token expirado' });
      }
      
      // Verificar se o usuário existe no banco de dados
      const userId = payload.sub || payload.userId;
      const { data: user, error } = await supabaseAdmin
        .from('psicologos')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        console.log('User not found in database:', userId);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      
      // Criar objeto user compatível com Supabase
      req.user = {
        id: user.id,
        email: user.email,
        ...payload
      };
      
      console.log('Authentication successful for user:', user.email);
      next();
    } catch (decodeError) {
      console.log('Token decode failed:', decodeError);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Aplicar autenticação em todas as rotas
router.use(authenticateUser);

/**
 * GET /api/chat/conversas
 * Listar conversas do psicólogo
 */
router.get('/conversas', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    const psicologoId = req.user.id;

    let query = supabaseAdmin
      .from('conversas')
      .select(`
        *,
        paciente:pacientes(id, nome, telefone, email)
      `)
      .eq('psicologo_id', psicologoId)
      .order('ultima_mensagem', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`paciente.nome.ilike.%${search}%,paciente.telefone.ilike.%${search}%`);
    }

    const { data: conversas, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return res.status(500).json({ error: 'Erro ao buscar conversas' });
    }

    // Buscar preview da última mensagem para cada conversa
    const conversasComPreview = await Promise.all(
      conversas.map(async (conversa) => {
        const { data: ultimaMensagem } = await supabaseAdmin
          .from('mensagens')
          .select('conteudo')
          .eq('conversa_id', conversa.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...conversa,
          preview_mensagem: ultimaMensagem?.conteudo || ''
        };
      })
    );

    // Log da ação
    await auditLogger.log({
      userId: psicologoId,
      action: 'conversation_accessed',
      resource: 'conversation_list',
      details: { count: conversas.length, search }
    });

    res.json({
      conversas: conversasComPreview,
      total: count || 0,
      hasMore: (Number(offset) + Number(limit)) < (count || 0)
    });

  } catch (error) {
    console.error('Erro na rota /conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/chat/conversas/:pacienteId/mensagens
 * Buscar mensagens de uma conversa
 */
router.get('/conversas/:pacienteId/mensagens', async (req: Request, res: Response) => {
  try {
    const { pacienteId } = req.params;
    const { limit = 50, before } = req.query;
    const psicologoId = req.user.id;

    // Verificar se a conversa existe e pertence ao psicólogo
    const { data: conversa, error: conversaError } = await supabaseAdmin
      .from('conversas')
      .select('id')
      .eq('psicologo_id', psicologoId)
      .eq('paciente_id', pacienteId)
      .single();

    if (conversaError || !conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    let query = supabaseAdmin
      .from('mensagens')
      .select('*')
      .eq('conversa_id', conversa.id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (before) {
      const { data: beforeMessage } = await supabaseAdmin
        .from('mensagens')
        .select('created_at')
        .eq('id', before as string)
        .single();

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at);
      }
    }

    const { data: mensagens, error } = await query;

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }

    // Reverter ordem para mostrar mensagens mais antigas primeiro
    const mensagensOrdenadas = mensagens.reverse();

    // Log da ação
    await auditLogger.log({
      userId: psicologoId,
      action: 'conversation_accessed',
      resource: 'conversation',
      resourceId: conversa.id,
      details: { pacienteId, messageCount: mensagens.length }
    });

    res.json({
      mensagens: mensagensOrdenadas,
      hasMore: mensagens.length === Number(limit)
    });

  } catch (error) {
    console.error('Erro na rota /mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/chat/mensagens
 * Enviar mensagem
 */
router.post('/mensagens', async (req: Request, res: Response) => {
  try {
    const { pacienteId, conteudo, tipo = 'texto', replyToMessageId } = req.body;
    const psicologoId = req.user.id;

    if (!pacienteId || !conteudo) {
      return res.status(400).json({ error: 'pacienteId e conteudo são obrigatórios' });
    }

    // Verificar se o paciente pertence ao psicólogo
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('id')
      .eq('id', pacienteId)
      .eq('psicologo_id', psicologoId)
      .single();

    if (pacienteError || !paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Buscar ou criar conversa
    let { data: conversa, error: conversaError } = await supabaseAdmin
      .from('conversas')
      .select('id')
      .eq('psicologo_id', psicologoId)
      .eq('paciente_id', pacienteId)
      .single();

    if (conversaError && conversaError.code === 'PGRST116') {
      // Conversa não existe, criar nova
      const { data: novaConversa, error: criarError } = await supabaseAdmin
        .from('conversas')
        .insert({
          psicologo_id: psicologoId,
          paciente_id: pacienteId
        })
        .select('id')
        .single();

      if (criarError) {
        console.error('Erro ao criar conversa:', criarError);
        return res.status(500).json({ error: 'Erro ao criar conversa' });
      }

      conversa = novaConversa;
    } else if (conversaError) {
      console.error('Erro ao buscar conversa:', conversaError);
      return res.status(500).json({ error: 'Erro ao buscar conversa' });
    }

    // Criar mensagem
    const { data: mensagem, error: mensagemError } = await supabaseAdmin
      .from('mensagens')
      .insert({
        conversa_id: conversa.id,
        conteudo,
        tipo,
        direcao: 'enviada',
        status_entrega: 'entregue',
        reply_to_message_id: replyToMessageId || null
      })
      .select('*')
      .single();

    if (mensagemError) {
      console.error('Erro ao criar mensagem:', mensagemError);
      return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }

    // Log da ação
    await auditLogger.log({
      userId: psicologoId,
      action: 'message_sent',
      resource: 'message',
      resourceId: mensagem.id,
      details: { pacienteId, tipo, conversaId: conversa.id }
    });

    // TODO: Integrar com Evolution API para enviar via WhatsApp
    // await evolutionAPIService.sendMessage(paciente.telefone, conteudo);

    // Notificar via WebSocket
    notifyNewChatMessage(psicologoId, mensagem, conversa);

    res.json({
      mensagemId: mensagem.id,
      status: 'entregue',
      timestamp: mensagem.created_at
    });

  } catch (error) {
    console.error('Erro na rota /mensagens POST:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/chat/conversas/:conversaId/marcar-lida
 * Marcar mensagens como lidas
 */
router.put('/conversas/:conversaId/marcar-lida', async (req: Request, res: Response) => {
  try {
    const { conversaId } = req.params;
    const psicologoId = req.user.id;

    // Verificar se a conversa pertence ao psicólogo
    const { data: conversa, error: conversaError } = await supabaseAdmin
      .from('conversas')
      .select('id')
      .eq('id', conversaId)
      .eq('psicologo_id', psicologoId)
      .single();

    if (conversaError || !conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Chamar função SQL para marcar como lidas
    const { error } = await supabaseAdmin.rpc('marcar_mensagens_como_lidas', {
      conversa_uuid: conversaId
    });

    if (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return res.status(500).json({ error: 'Erro ao marcar mensagens como lidas' });
    }

    // Log da ação
    await auditLogger.log({
      userId: psicologoId,
      action: 'message_read',
      resource: 'conversation',
      resourceId: conversaId
    });

    // Notificar via WebSocket
    notifyMessageRead(psicologoId, conversaId, []);

    res.json({ success: true });

  } catch (error) {
    console.error('Erro na rota /marcar-lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/chat/configuracao
 * Obter configuração da Evolution API
 */
router.get('/configuracao', async (req: Request, res: Response) => {
  try {
    const psicologoId = req.user.id;

    const { data: conversas, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', psicologoId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configuração:', error);
      return res.status(500).json({ error: 'Erro ao buscar configuração' });
    }

    // Não retornar a API key por segurança
    if (config) {
      const { evolution_api_key, ...configSemKey } = config;
      res.json({
        ...configSemKey,
        hasApiKey: !!evolution_api_key
      });
    } else {
      res.json(null);
    }

  } catch (error) {
    console.error('Erro na rota /configuracao GET:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/chat/configuracao
 * Configurar Evolution API
 */
router.post('/configuracao', async (req: Request, res: Response) => {
  try {
    const { apiUrl, apiKey, instanceName, numeroWhatsapp } = req.body;
    const psicologoId = req.user.id;

    if (!apiUrl || !apiKey || !instanceName) {
      return res.status(400).json({ 
        error: 'apiUrl, apiKey e instanceName são obrigatórios' 
      });
    }

    // Upsert da configuração
    const { data: config, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .upsert({
        psicologo_id: psicologoId,
        evolution_api_url: apiUrl,
        evolution_api_key: apiKey,
        instance_name: instanceName,
        numero_whatsapp: numeroWhatsapp,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao salvar configuração:', error);
      return res.status(500).json({ error: 'Erro ao salvar configuração' });
    }

    // Log da ação
    await auditLogger.log({
      userId: psicologoId,
      action: 'config_changed',
      resource: 'configuration',
      resourceId: config.id,
      details: { instanceName, hasApiKey: !!apiKey }
    });

    // Não retornar a API key
    const { evolution_api_key, ...configSemKey } = config;
    res.json({
      ...configSemKey,
      hasApiKey: true
    });

  } catch (error) {
    console.error('Erro na rota /configuracao POST:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/chat/estatisticas
 * Obter estatísticas do chat
 */
router.get('/estatisticas', async (req: Request, res: Response) => {
  try {
    const psicologoId = req.user.id;

    const { data: stats, error } = await supabaseAdmin
      .rpc('get_conversation_stats', { p_psicologo_id: psicologoId });

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }

    res.json(stats[0] || {
      total_conversas: 0,
      conversas_ativas: 0,
      total_mensagens: 0,
      mensagens_nao_lidas: 0,
      ultima_atividade: null
    });

  } catch (error) {
    console.error('Erro na rota /estatisticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/chat/buscar
 * Buscar conversas com filtros avançados
 */
router.get('/buscar', async (req: Request, res: Response) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const psicologoId = req.user.id;

    const { data: resultados, error } = await supabaseAdmin
      .rpc('search_conversations', {
        p_psicologo_id: psicologoId,
        p_search_term: search as string || null,
        p_limit: Number(limit),
        p_offset: Number(offset)
      });

    if (error) {
      console.error('Erro na busca:', error);
      return res.status(500).json({ error: 'Erro na busca' });
    }

    res.json({
      resultados: resultados || [],
      hasMore: (resultados?.length || 0) === Number(limit)
    });

  } catch (error) {
    console.error('Erro na rota /buscar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter configuração do WhatsApp
router.get('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Não retornar a API key por segurança
    if (config) {
      const { evolution_api_key, ...configSemKey } = config;
      res.json({ 
        config: {
          ...configSemKey,
          hasApiKey: !!evolution_api_key
        }
      });
    } else {
      res.json({ config: null });
    }
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para salvar configuração do WhatsApp
router.post('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      evolution_api_url,
      evolution_api_key,
      instance_name,
      webhook_url,
      webhook_secret,
      ativo = true
    } = req.body;

    // Validações
    if (!evolution_api_url || !evolution_api_key || !instance_name) {
      return res.status(400).json({ 
        message: 'URL da API, chave da API e nome da instância são obrigatórios' 
      });
    }

    const configData = {
      psicologo_id: req.user.id,
      evolution_api_url,
      evolution_api_key,
      instance_name,
      webhook_url: webhook_url || `${req.protocol}://${req.get('host')}/api/webhook`,
      webhook_secret,
      ativo,
      updated_at: new Date().toISOString()
    };

    // Verificar se já existe configuração
    const { data: existing } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('id')
      .eq('psicologo_id', req.user.id)
      .single();

    let result;
    if (existing) {
      // Atualizar
      const { data, error } = await supabaseAdmin
        .from('configuracoes_whatsapp')
        .update(configData)
        .eq('psicologo_id', req.user.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Criar
      const { data, error } = await supabaseAdmin
        .from('configuracoes_whatsapp')
        .insert({ ...configData, created_at: new Date().toISOString() })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    // Log da ação
    auditLogger.log({
      userId: req.user.id,
      action: 'update_whatsapp_config',
      resource: 'chat_config',
      details: { instance_name }
    });

    res.json({ config: result });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para testar conexão com Evolution API
router.post('/test-connection', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiUrl, apiKey } = req.body;

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ message: 'URL e chave da API são obrigatórios' });
    }

    // Validar formato da URL
    let testUrl: URL;
    try {
      testUrl = new URL(apiUrl);
    } catch (urlError) {
      console.error('❌ URL inválida:', apiUrl, urlError);
      return res.status(400).json({ 
        message: 'URL da API inválida',
        details: 'Verifique se a URL está no formato correto (ex: https://api.exemplo.com)'
      });
    }

    // Testar conexão usando a função auxiliar
    const fullUrl = `${apiUrl}/instance/fetchInstances`;
    const result = await makeEvolutionAPIRequest(fullUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        details: `API respondeu com ${result.statusCode}`,
        dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
        instanceCount: Array.isArray(result.data) ? result.data.length : 'N/A'
      });
    } else {
      console.error('❌ Erro no teste de conexão:', {
        url: fullUrl,
        error: result.error,
        statusCode: result.statusCode,
        contentType: result.contentType
      });

      const statusCode = result.statusCode || 500;
      res.status(statusCode >= 400 && statusCode < 500 ? 400 : 500).json({ 
        message: result.error || 'Falha na conexão com a API',
        details: `Status: ${result.statusCode || 'N/A'}`,
        contentType: result.contentType,
        statusCode: result.statusCode
      });
    }
  } catch (error: any) {
    console.error('💥 Erro geral ao testar conexão:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      details: error.message || 'Erro desconhecido'
    });
  }
});

// Rota para verificar status da instância
router.post('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ message: 'Nome da instância é obrigatório' });
    }

    // Buscar configuração
    const { data: config, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', req.user.id)
      .single();

    if (error || !config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }

    // Verificar status na Evolution API usando a função auxiliar
    const url = `${config.evolution_api_url}/instance/connectionState/${instanceName}`;
    const result = await makeEvolutionAPIRequest(url, {
      method: 'GET',
      headers: {
        'apikey': config.evolution_api_key,
        'Content-Type': 'application/json'
      }
    });

    if (result.success) {
      res.json({ status: result.data });
    } else {
      console.error('❌ Erro ao verificar status da instância:', {
        url,
        error: result.error,
        statusCode: result.statusCode,
        contentType: result.contentType
      });
      
      res.status(400).json({ 
        message: 'Erro ao verificar status da instância',
        details: result.error,
        statusCode: result.statusCode
      });
    }
  } catch (error) {
    console.error('💥 Erro interno ao verificar status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para conectar instância
router.post('/connect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ message: 'Nome da instância é obrigatório' });
    }

    // Buscar configuração
    const { data: config, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', req.user.id)
      .single();

    if (error || !config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }

    console.log('🔍 Verificando instâncias existentes para:', instanceName);

    // Verificar se instância existe usando a função auxiliar
    const fetchUrl = `${config.evolution_api_url}/instance/fetchInstances`;
    const fetchResult = await makeEvolutionAPIRequest(fetchUrl, {
      method: 'GET',
      headers: {
        'apikey': config.evolution_api_key,
        'Content-Type': 'application/json'
      }
    });

    let existingInstance = null;
    if (fetchResult.success && Array.isArray(fetchResult.data)) {
      // Verificar tanto 'name' quanto 'instanceName' para compatibilidade
      existingInstance = fetchResult.data.find((instance: any) => 
        instance.name === instanceName || instance.instanceName === instanceName
      );
      
      console.log('📋 Instâncias encontradas:', fetchResult.data.map((i: any) => ({
        name: i.name,
        instanceName: i.instanceName,
        connectionStatus: i.connectionStatus
      })));
      
      if (existingInstance) {
        console.log('✅ Instância encontrada:', {
          name: existingInstance.name,
          instanceName: existingInstance.instanceName,
          connectionStatus: existingInstance.connectionStatus
        });
      }
    }

    // Se a instância existe, verificar o status da conexão
    if (existingInstance) {
      const connectionStatus = existingInstance.connectionStatus;
      
      console.log('🔗 Status da conexão da instância existente:', connectionStatus);
      
      // Se já está conectada, retornar sucesso
      if (connectionStatus === 'open') {
        console.log('✅ Instância já está conectada');
        
        // Atualizar status no banco
        await supabaseAdmin
          .from('configuracoes_whatsapp')
          .update({ 
            status_conexao: 'conectado',
            updated_at: new Date().toISOString()
          })
          .eq('psicologo_id', req.user.id);

        return res.json({ 
          status: 'connected',
          message: 'Instância já está conectada',
          connectionStatus: connectionStatus,
          instanceData: existingInstance
        });
      }
      
      // Se está desconectada, tentar reconectar
      if (connectionStatus === 'close' || connectionStatus === 'connecting') {
        console.log('🔄 Tentando reconectar instância existente...');
        
        const connectUrl = `${config.evolution_api_url}/instance/connect/${instanceName}`;
        const connectResult = await makeEvolutionAPIRequest(connectUrl, {
          method: 'GET',
          headers: {
            'apikey': config.evolution_api_key,
            'Content-Type': 'application/json'
          }
        });

        if (connectResult.success) {
          // Atualizar status no banco
          await supabaseAdmin
            .from('configuracoes_whatsapp')
            .update({ 
              status_conexao: 'conectando',
              updated_at: new Date().toISOString()
            })
            .eq('psicologo_id', req.user.id);

          return res.json({ 
            status: connectResult.data,
            message: 'Reconectando instância existente',
            connectionStatus: connectionStatus
          });
        } else {
          console.error('❌ Erro ao reconectar instância existente:', {
            url: connectUrl,
            error: connectResult.error,
            statusCode: connectResult.statusCode
          });
          
          return res.status(400).json({ 
            message: 'Erro ao reconectar instância existente',
            details: connectResult.error,
            statusCode: connectResult.statusCode
          });
        }
      }
    }

    // Se não existe, criar a instância usando a função auxiliar
    console.log('🆕 Criando nova instância:', instanceName);
    
    const createPayload = {
      instanceName: instanceName,
      token: config.evolution_api_key,
      qrcode: true,
      webhook: config.webhook_url || `${req.protocol}://${req.get('host')}/api/webhook/evolution`,
      webhook_by_events: false,
      events: [
        'APPLICATION_STARTUP',
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ]
    };

    const createUrl = `${config.evolution_api_url}/instance/create`;
    const createResult = await makeEvolutionAPIRequest(createUrl, {
      method: 'POST',
      headers: {
        'apikey': config.evolution_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createResult.success) {
      console.error('❌ Erro ao criar instância:', {
        url: createUrl,
        error: createResult.error,
        statusCode: createResult.statusCode,
        contentType: createResult.contentType
      });
      
      // Verificar se o erro é de nome duplicado
      if (createResult.statusCode === 403 && 
          createResult.data?.response?.message?.some((msg: string) => 
            msg.includes('already in use') || msg.includes('já está em uso')
          )) {
        return res.status(409).json({ 
          message: 'Nome da instância já está em uso',
          details: 'Uma instância com este nome já existe. Tente usar um nome diferente ou verifique se a instância já está configurada.',
          statusCode: 409,
          suggestion: 'Tente usar um nome como: ' + instanceName + '_' + new Date().getFullYear()
        });
      }
      
      return res.status(400).json({ 
        message: 'Erro ao criar instância',
        details: createResult.error,
        statusCode: createResult.statusCode
      });
    }

    console.log('✅ Instância criada com sucesso');

    // Conectar instância na Evolution API usando a função auxiliar
    const connectUrl = `${config.evolution_api_url}/instance/connect/${instanceName}`;
    const connectResult = await makeEvolutionAPIRequest(connectUrl, {
      method: 'GET',
      headers: {
        'apikey': config.evolution_api_key,
        'Content-Type': 'application/json'
      }
    });

    if (connectResult.success) {
      // Atualizar status no banco
      await supabaseAdmin
        .from('configuracoes_whatsapp')
        .update({ 
          status_conexao: 'conectando',
          updated_at: new Date().toISOString()
        })
        .eq('psicologo_id', req.user.id);

      res.json({ 
        status: connectResult.data,
        message: 'Nova instância criada e conectando'
      });
    } else {
      console.error('❌ Erro ao conectar nova instância:', {
        url: connectUrl,
        error: connectResult.error,
        statusCode: connectResult.statusCode,
        contentType: connectResult.contentType
      });
      
      res.status(400).json({ 
        message: 'Instância criada, mas erro ao conectar',
        details: connectResult.error,
        statusCode: connectResult.statusCode
      });
    }
  } catch (error) {
    console.error('💥 Erro interno ao conectar instância:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para desconectar instância
router.post('/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ message: 'Nome da instância é obrigatório' });
    }

    // Buscar configuração
    const { data: config, error } = await supabaseAdmin
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', req.user.id)
      .single();

    if (error || !config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }

    // Desconectar instância na Evolution API usando a função auxiliar
    const url = `${config.evolution_api_url}/instance/logout/${instanceName}`;
    const result = await makeEvolutionAPIRequest(url, {
      method: 'DELETE',
      headers: {
        'apikey': config.evolution_api_key,
        'Content-Type': 'application/json'
      }
    });

    if (result.success) {
      // Atualizar status no banco
      await supabaseAdmin
        .from('configuracoes_whatsapp')
        .update({ 
          status_conexao: 'desconectado',
          updated_at: new Date().toISOString()
        })
        .eq('psicologo_id', req.user.id);

      res.json({ success: true });
    } else {
      console.error('❌ Erro ao desconectar instância:', {
        url,
        error: result.error,
        statusCode: result.statusCode,
        contentType: result.contentType
      });
      
      res.status(400).json({ 
        message: 'Erro ao desconectar instância',
        details: result.error,
        statusCode: result.statusCode
      });
    }
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;