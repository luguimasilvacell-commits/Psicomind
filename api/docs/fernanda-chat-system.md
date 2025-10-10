# Sistema de Chat WhatsApp da Fernanda - Documentação

## Visão Geral

O Sistema de Chat WhatsApp da Fernanda é um backend completo para processamento automatizado de mensagens WhatsApp, incluindo:

- **Processamento de mensagens** com extração de dados e transcrição de áudio
- **Sistema de bloqueio de agente** usando Redis para controle de sessões
- **IA Júlia** para respostas automatizadas e análise de intenções
- **Gerenciamento de sessões** por telefone com persistência
- **APIs RESTful** para integração e monitoramento

## Arquitetura

### Componentes Principais

1. **WhatsAppProcessor** - Processa webhooks do WhatsApp
2. **WhatsAppSessionService** - Gerencia sessões de chat
3. **AIService** - Integração com OpenAI e Google Gemini
4. **RedisService** - Cache e controle de sessões
5. **API Routes** - Endpoints REST para integração

### Fluxo de Processamento

```
WhatsApp → Evolution API → Webhook → WhatsAppProcessor → AIService → Resposta
                                         ↓
                                   RedisService (Cache/Sessões)
                                         ↓
                                   Supabase (Persistência)
```

## Configuração

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_WHISPER_MODEL=whisper-1

# Google Gemini Configuration (opcional)
GOOGLE_API_KEY=your-google-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key-here
EVOLUTION_INSTANCE_NAME=fernanda-psicomind

# Webhook Configuration
FERNANDA_WEBHOOK_API_KEY=fernanda-webhook-secret-2025

# Sistema de Chat - Configurações
CHAT_SESSION_TIMEOUT=3600
CHAT_MAX_MESSAGE_LENGTH=4000
CHAT_RATE_LIMIT_PER_MINUTE=20
CHAT_CLEANUP_INTERVAL_MINUTES=5
CHAT_DAYS_TO_KEEP_DATA=30
```

### 2. Dependências

Instale as dependências necessárias:

```bash
npm install ioredis axios openai @google/generative-ai
```

### 3. Banco de Dados

Execute a migração SQL para criar as tabelas:

```bash
npx supabase db push
```

As seguintes tabelas serão criadas:
- `chat_whatsapp` - Histórico de mensagens
- `chat_sessions` - Sessões de chat
- `ai_config` - Configuração da IA Júlia
- `chat_processing_logs` - Logs de processamento
- `agent_blocks` - Controle de bloqueio de agente

### 4. Redis

Certifique-se de que o Redis está rodando:

```bash
redis-server
```

## Endpoints da API

### Webhook do WhatsApp

**POST** `/api/fernanda/webhook/whatsapp`

Recebe mensagens do WhatsApp via Evolution API.

**Headers:**
- `X-API-Key`: Chave de API do webhook

**Body:**
```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "id": "message-id"
  },
  "message": {
    "conversation": "Olá, gostaria de agendar uma consulta"
  },
  "messageTimestamp": 1642678800,
  "pushName": "João Silva"
}
```

### Gerenciamento de Sessões

#### Obter Sessão Ativa
**GET** `/api/fernanda/sessions/:telefone`

#### Histórico de Sessões
**GET** `/api/fernanda/sessions/:telefone/history?limit=10&offset=0`

#### Finalizar Sessão
**POST** `/api/fernanda/sessions/:telefone/finalize`
```json
{
  "motivo": "Atendimento finalizado"
}
```

#### Bloquear Agente
**POST** `/api/fernanda/sessions/:telefone/block-agent`
```json
{
  "motivo": "Solicitação do paciente",
  "duracaoSegundos": 3600
}
```

#### Desbloquear Agente
**POST** `/api/fernanda/sessions/:telefone/unblock-agent`

#### Estatísticas de Sessões
**GET** `/api/fernanda/sessions/stats?telefone=5511999999999`

### Configuração da IA

#### Obter Configuração
**GET** `/api/fernanda/ai/config`

#### Atualizar Configuração
**PUT** `/api/fernanda/ai/config`
```json
{
  "nome": "Júlia",
  "personalidade": "Assistente empática e profissional",
  "instrucoes_sistema": "Você é a assistente da psicóloga Fernanda...",
  "modelo_openai": "gpt-4o-mini",
  "temperatura": 0.7,
  "max_tokens": 1000,
  "ativa": true
}
```

#### Testar IA
**POST** `/api/fernanda/ai/test`
```json
{
  "mensagem": "Olá, como você pode me ajudar?",
  "telefone": "5511999999999"
}
```

#### Estatísticas da IA
**GET** `/api/fernanda/ai/stats`

### Monitoramento

#### Health Check
**GET** `/api/fernanda/health`

#### Métricas de Performance
**GET** `/api/fernanda/metrics`

#### Limpeza de Dados
**POST** `/api/fernanda/cleanup`
```json
{
  "diasParaManter": 30
}
```

#### Reprocessar Mensagens
**POST** `/api/fernanda/reprocess`

## Funcionalidades

### 1. Processamento de Mensagens

- **Extração de dados** do webhook do WhatsApp
- **Validação e sanitização** de conteúdo
- **Rate limiting** por telefone
- **Transcrição de áudio** usando OpenAI Whisper
- **Concatenação de mensagens** no Redis

### 2. Sistema de Bloqueio de Agente

- **Bloqueio automático** por comandos específicos
- **Bloqueio manual** via API
- **Controle de duração** do bloqueio
- **Persistência** no Redis e banco de dados

### 3. IA Júlia

- **Processamento de linguagem natural** com OpenAI/Gemini
- **Análise de intenções** (agendar, remarcar, cancelar, etc.)
- **Respostas contextuais** baseadas no histórico
- **Análise de sentimento** das mensagens

### 4. Gerenciamento de Sessões

- **Sessões por telefone** com timeout automático
- **Controle de atividade** e última interação
- **Limpeza automática** de sessões expiradas
- **Estatísticas** e métricas de uso

### 5. Cache e Performance

- **Redis** para cache de sessões e mensagens
- **Rate limiting** inteligente por telefone
- **Cleanup automático** de dados antigos
- **Métricas de performance** em tempo real

## Segurança

### Autenticação

- **API Keys** para webhooks
- **JWT tokens** para APIs de gerenciamento
- **Validação de origem** para webhooks

### Rate Limiting

- **200 requests/min** para webhook WhatsApp
- **60 requests/min** para APIs de gerenciamento
- **Rate limiting por telefone** para evitar spam

### Validação

- **Validação de entrada** em todos os endpoints
- **Sanitização** de conteúdo de mensagens
- **Validação de telefones** brasileiros

## Monitoramento

### Logs

- **Logs estruturados** de processamento
- **Auditoria** de todas as operações
- **Métricas** de performance e uso

### Health Checks

- **Status** dos serviços (Redis, Banco, IA)
- **Métricas** de performance em tempo real
- **Alertas** para problemas de conectividade

### Estatísticas

- **Sessões ativas** e históricas
- **Taxa de sucesso** do processamento
- **Tempo médio** de resposta
- **Uso de memória** do Redis

## Troubleshooting

### Problemas Comuns

1. **Redis não conecta**
   - Verificar se o Redis está rodando
   - Conferir URL e credenciais no .env

2. **OpenAI API falha**
   - Verificar chave de API válida
   - Conferir limites de uso da conta

3. **Webhook não recebe mensagens**
   - Verificar configuração da Evolution API
   - Conferir chave de API do webhook

4. **Sessões não persistem**
   - Verificar conexão com Supabase
   - Conferir permissões das tabelas

### Logs Úteis

```bash
# Logs do processamento
tail -f logs/chat-processing.log

# Logs do Redis
redis-cli monitor

# Logs da aplicação
npm run dev
```

## Desenvolvimento

### Estrutura de Arquivos

```
api/
├── services/
│   ├── whatsappProcessor.ts      # Processamento de mensagens
│   ├── whatsappSessionService.ts # Gerenciamento de sessões
│   ├── aiService.ts              # Integração com IA
│   └── redisService.ts           # Cache e sessões
├── routes/
│   └── fernanda-chat.ts          # Endpoints da API
├── types/
│   └── fernanda-chat.ts          # Tipos TypeScript
└── docs/
    └── fernanda-chat-system.md   # Esta documentação
```

### Testes

```bash
# Testar webhook
curl -X POST http://localhost:3001/api/fernanda/webhook/whatsapp \
  -H "X-API-Key: fernanda-webhook-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{"key":{"remoteJid":"5511999999999@s.whatsapp.net","id":"test"},"message":{"conversation":"Teste"},"messageTimestamp":1642678800}'

# Testar health check
curl http://localhost:3001/api/fernanda/health

# Testar IA
curl -X POST http://localhost:3001/api/fernanda/ai/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Olá, como você pode me ajudar?"}'
```

## Próximos Passos

1. **Configurar Evolution API** com a instância do WhatsApp
2. **Configurar chaves de API** (OpenAI, Google)
3. **Testar webhook** com mensagens reais
4. **Configurar monitoramento** em produção
5. **Implementar backup** automático dos dados