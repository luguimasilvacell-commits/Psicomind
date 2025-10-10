# Integração Psicomind com n8n e Evolution API

## 1. Análise da Arquitetura Atual

### 1.1 Sistema de Chat Existente

O sistema Psicomind atualmente possui uma arquitetura robusta de chat baseada em:

**Frontend (React + TypeScript)**
- Hook `useChat` para gerenciamento de estado do chat
- Componentes `ChatInterface`, `ConversationList` e `MessageArea`
- WebSocket para comunicação em tempo real
- Suporte a múltiplos tipos de mensagem (texto, imagem, documento, áudio, vídeo)

**Backend (Node.js + Express)**
- Serviço `WhatsAppService` usando whatsapp-web.js
- Autenticação JWT integrada
- API REST para gerenciamento de conversas e mensagens
- Integração com Supabase (PostgreSQL)

**Funcionalidades Atuais:**
- Gerenciamento de sessões WhatsApp por psicólogo
- QR Code para autenticação
- Mensagens em tempo real via WebSocket
- Status de leitura e entrega
- Suporte a mídia
- Auto-resposta e horário comercial

### 1.2 Limitações Identificadas

- Dependência do whatsapp-web.js (instável para uso comercial)
- Falta de automação avançada de workflows
- Ausência de integração com APIs oficiais do WhatsApp
- Limitações de escalabilidade para múltiplos psicólogos

## 2. Visão Geral das Tecnologias

### 2.1 n8n - Plataforma de Automação

**Características:**
- Workflow automation visual e intuitivo
- 400+ integrações nativas
- Self-hosted ou cloud
- API REST robusta
- Webhooks e triggers avançados
- Execução de código personalizado

**Benefícios para Psicomind:**
- Automação de processos de atendimento
- Integração com múltiplas plataformas
- Workflows personalizados por psicólogo
- Análise e relatórios automatizados

### 2.2 Evolution API - WhatsApp Business API

**Características:**
- API oficial do WhatsApp Business
- Multi-device support
- Webhooks para eventos em tempo real
- Suporte completo a mídia
- Templates de mensagem aprovados
- Métricas e analytics

**Benefícios para Psicomind:**
- Estabilidade e confiabilidade comercial
- Compliance com políticas do WhatsApp
- Recursos avançados de negócios
- Escalabilidade empresarial

## 3. Arquitetura da Integração

### 3.1 Diagrama da Nova Arquitetura

```mermaid
graph TD
    A[Frontend React] --> B[Backend Psicomind]
    B --> C[Evolution API]
    B --> D[n8n Workflows]
    C --> E[WhatsApp Business]
    D --> F[Automações]
    D --> G[Integrações Externas]
    
    subgraph "Camada de Apresentação"
        A
    end
    
    subgraph "Camada de Aplicação"
        B
        H[API Gateway]
    end
    
    subgraph "Camada de Automação"
        D
        I[Workflow Engine]
    end
    
    subgraph "Camada de Comunicação"
        C
        J[Webhook Handler]
    end
    
    subgraph "Serviços Externos"
        E
        F
        G
    end
```

### 3.2 Fluxo de Dados

1. **Mensagens Recebidas:**
   - WhatsApp → Evolution API → Webhook → Backend Psicomind → n8n Workflow → Processamento → Frontend

2. **Mensagens Enviadas:**
   - Frontend → Backend Psicomind → Evolution API → WhatsApp

3. **Automações:**
   - Trigger (tempo/evento) → n8n → Evolution API → WhatsApp
   - n8n → Backend Psicomind → Atualização de dados

## 4. Fluxos de Automação Específicos

### 4.1 Workflow: Agendamento Automático

```mermaid
graph LR
    A[Paciente solicita agendamento] --> B[n8n detecta palavras-chave]
    B --> C[Consulta agenda do psicólogo]
    C --> D[Propõe horários disponíveis]
    D --> E[Paciente confirma]
    E --> F[Cria evento no calendário]
    F --> G[Envia confirmação]
```

### 4.2 Workflow: Lembretes de Consulta

```mermaid
graph LR
    A[24h antes da consulta] --> B[n8n trigger temporal]
    B --> C[Busca consultas do dia seguinte]
    C --> D[Envia lembrete via Evolution API]
    D --> E[Registra envio no sistema]
```

### 4.3 Workflow: Triagem Inicial

```mermaid
graph LR
    A[Novo paciente] --> B[n8n envia questionário]
    B --> C[Coleta respostas]
    C --> D[Analisa urgência]
    D --> E[Direciona para psicólogo adequado]
    E --> F[Notifica psicólogo]
```

## 5. Implementação Técnica

### 5.1 Configuração da Evolution API

**Instalação via Docker:**
```bash
# docker-compose.yml
version: '3.8'
services:
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/evolution
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
    volumes:
      - ./instances:/evolution/instances
```

**Configuração de Instância:**
```javascript
// Criar instância para cada psicólogo
const createInstance = async (psychologistId) => {
  const response = await fetch('http://localhost:8080/instance/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      instanceName: `psicomind_${psychologistId}`,
      token: generateToken(),
      qrcode: true,
      webhook: `${process.env.BACKEND_URL}/webhooks/evolution/${psychologistId}`
    })
  });
  
  return response.json();
};
```

### 5.2 Integração com n8n

**Configuração de Webhook:**
```javascript
// n8n webhook endpoint
app.post('/webhooks/n8n/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { psychologistId, patientId, action, data } = req.body;
  
  try {
    // Processar dados do webhook
    const result = await processN8nWebhook(workflowId, {
      psychologistId,
      patientId,
      action,
      data
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Workflow de Exemplo (JSON):**
```json
{
  "name": "Agendamento Automático",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "agendamento",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Processar Mensagem",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Detectar intenção de agendamento\nconst message = $json.message.toLowerCase();\nif (message.includes('agendar') || message.includes('consulta')) {\n  return { intent: 'scheduling', confidence: 0.9 };\n}\nreturn { intent: 'unknown', confidence: 0.1 };"
      }
    },
    {
      "name": "Consultar Agenda",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{$env.BACKEND_URL}}/api/schedule/{{$json.psychologistId}}/available",
        "method": "GET"
      }
    },
    {
      "name": "Enviar Resposta",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{$env.EVOLUTION_API_URL}}/message/sendText/{{$json.instanceName}}",
        "method": "POST",
        "body": {
          "number": "{{$json.patientPhone}}",
          "text": "Horários disponíveis: {{$json.availableSlots}}"
        }
      }
    }
  ]
}
```

### 5.3 Modificações no Backend Psicomind

**Novo Serviço Evolution API:**
```typescript
// services/evolutionApiService.ts
import axios from 'axios';

export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
  }

  async createInstance(psychologistId: string): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/instance/create`, {
      instanceName: `psicomind_${psychologistId}`,
      token: this.generateToken(),
      qrcode: true,
      webhook: `${process.env.BACKEND_URL}/webhooks/evolution/${psychologistId}`
    }, {
      headers: { 'apikey': this.apiKey }
    });

    return response.data;
  }

  async sendMessage(instanceName: string, phone: string, message: string): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/message/sendText/${instanceName}`, {
      number: phone,
      text: message
    }, {
      headers: { 'apikey': this.apiKey }
    });

    return response.data;
  }

  async sendMedia(instanceName: string, phone: string, media: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/message/sendMedia/${instanceName}`, {
      number: phone,
      mediatype: media.type,
      media: media.url,
      caption: media.caption
    }, {
      headers: { 'apikey': this.apiKey }
    });

    return response.data;
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
```

**Webhook Handler:**
```typescript
// routes/webhooks.ts
import express from 'express';
import { EvolutionApiService } from '../services/evolutionApiService';
import { N8nService } from '../services/n8nService';

const router = express.Router();
const evolutionApi = new EvolutionApiService();
const n8nService = new N8nService();

// Webhook da Evolution API
router.post('/evolution/:psychologistId', async (req, res) => {
  const { psychologistId } = req.params;
  const webhookData = req.body;

  try {
    // Processar mensagem recebida
    if (webhookData.event === 'messages.upsert') {
      const message = webhookData.data;
      
      // Salvar mensagem no banco
      await saveMessage({
        psychologistId,
        patientPhone: message.key.remoteJid,
        content: message.message?.conversation || '',
        messageType: 'text',
        senderType: 'patient',
        whatsappMessageId: message.key.id
      });

      // Trigger n8n workflow
      await n8nService.triggerWorkflow('message-received', {
        psychologistId,
        patientPhone: message.key.remoteJid,
        message: message.message?.conversation || '',
        timestamp: message.messageTimestamp
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 5.4 Serviço n8n

```typescript
// services/n8nService.ts
import axios from 'axios';

export class N8nService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY || '';
  }

  async triggerWorkflow(workflowName: string, data: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/webhook/${workflowName}`, data, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async executeWorkflow(workflowId: string, data: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
      data
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async getWorkflowExecutions(workflowId: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/api/v1/executions`, {
      params: { workflowId },
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return response.data;
  }
}
```

## 6. Configuração e Deploy

### 6.1 Variáveis de Ambiente

```bash
# .env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key

# n8n
N8N_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# Webhooks
WEBHOOK_SECRET=your-webhook-secret
BACKEND_URL=http://localhost:3001
```

### 6.2 Docker Compose Completo

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Psicomind Backend
  psicomind-backend:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - EVOLUTION_API_URL=http://evolution-api:8080
      - N8N_URL=http://n8n:5678
    depends_on:
      - postgres
      - redis
      - evolution-api
      - n8n

  # Evolution API
  evolution-api:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/evolution
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  # n8n
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=password
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  # PostgreSQL
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=psicomind
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

### 6.3 Scripts de Inicialização

```bash
#!/bin/bash
# scripts/setup.sh

echo "Configurando ambiente Psicomind + n8n + Evolution API..."

# Criar diretórios necessários
mkdir -p instances workflows

# Iniciar serviços
docker-compose up -d

# Aguardar serviços ficarem prontos
echo "Aguardando serviços..."
sleep 30

# Configurar n8n workflows
echo "Importando workflows do n8n..."
curl -X POST http://localhost:5678/api/v1/workflows/import \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflows/agendamento.json

# Configurar Evolution API
echo "Configurando Evolution API..."
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "psicomind_default",
    "token": "default-token",
    "qrcode": true,
    "webhook": "http://psicomind-backend:3001/webhooks/evolution/default"
  }'

echo "Setup concluído!"
```

## 7. Benefícios e Casos de Uso

### 7.1 Benefícios da Integração

**Para Psicólogos:**
- Automação de tarefas repetitivas
- Melhor organização de agendamentos
- Respostas automáticas fora do horário
- Triagem inicial automatizada
- Relatórios e métricas automáticas

**Para Pacientes:**
- Atendimento 24/7 para questões básicas
- Agendamento simplificado
- Lembretes automáticos
- Respostas mais rápidas
- Experiência mais fluida

**Para o Sistema:**
- Maior estabilidade e confiabilidade
- Escalabilidade empresarial
- Compliance com políticas do WhatsApp
- Integrações ilimitadas
- Análise avançada de dados

### 7.2 Casos de Uso Específicos

**1. Triagem de Emergência:**
- Detectar palavras-chave de risco
- Acionar protocolo de emergência
- Notificar psicólogo imediatamente
- Fornecer recursos de apoio

**2. Acompanhamento Pós-Consulta:**
- Enviar questionário de feedback
- Agendar próxima sessão
- Compartilhar recursos educativos
- Monitorar progresso

**3. Gestão de Cancelamentos:**
- Detectar solicitações de cancelamento
- Reagendar automaticamente
- Notificar lista de espera
- Atualizar agenda

**4. Análise de Sentimentos:**
- Analisar tom das mensagens
- Identificar pacientes em risco
- Priorizar atendimentos urgentes
- Gerar alertas para psicólogos

### 7.3 Métricas e KPIs

**Operacionais:**
- Tempo de resposta médio
- Taxa de resolução automática
- Volume de mensagens processadas
- Uptime do sistema

**Clínicos:**
- Satisfação do paciente
- Taxa de no-show reduzida
- Tempo até primeiro atendimento
- Engajamento do paciente

**Financeiros:**
- Redução de custos operacionais
- Aumento da capacidade de atendimento
- ROI da automação
- Receita por psicólogo

## 8. Roadmap de Implementação

### Fase 1 (Semanas 1-2): Infraestrutura Base
- [ ] Configurar Evolution API
- [ ] Configurar n8n
- [ ] Implementar webhooks básicos
- [ ] Migrar autenticação WhatsApp

### Fase 2 (Semanas 3-4): Workflows Básicos
- [ ] Implementar agendamento automático
- [ ] Configurar auto-resposta
- [ ] Implementar lembretes
- [ ] Testes de integração

### Fase 3 (Semanas 5-6): Funcionalidades Avançadas
- [ ] Triagem automatizada
- [ ] Análise de sentimentos
- [ ] Relatórios automáticos
- [ ] Integrações externas

### Fase 4 (Semanas 7-8): Otimização e Deploy
- [ ] Testes de carga
- [ ] Otimização de performance
- [ ] Deploy em produção
- [ ] Treinamento da equipe

## 9. Considerações de Segurança

### 9.1 Proteção de Dados
- Criptografia end-to-end para mensagens sensíveis
- Tokenização de dados pessoais
- Logs auditáveis de todas as interações
- Backup seguro e recuperação de desastres

### 9.2 Compliance
- Adequação à LGPD
- Políticas do WhatsApp Business
- Certificações de segurança
- Controle de acesso baseado em roles

### 9.3 Monitoramento
- Alertas de segurança em tempo real
- Detecção de anomalias
- Monitoramento de performance
- Logs centralizados

## 10. Conclusão

A integração do Psicomind com n8n e Evolution API representa um salto significativo na qualidade e eficiência do atendimento psicológico digital. Esta solução oferece:

- **Estabilidade**: Migração do whatsapp-web.js para Evolution API oficial
- **Automação**: Workflows inteligentes via n8n
- **Escalabilidade**: Arquitetura preparada para crescimento
- **Compliance**: Adequação às políticas comerciais do WhatsApp
- **Experiência**: Melhor UX para psicólogos e pacientes

A implementação gradual proposta permite uma transição suave, minimizando riscos e maximizando os benefícios para todos os stakeholders do sistema Psicomind.