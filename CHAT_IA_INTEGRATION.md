# 🤖 Chat IA - Guia de Integração

Este documento contém instruções para integrar o Chat IA do Psicomind com Google Gemini e WhatsApp Business API.

## 📋 Status Atual

✅ **Implementado:**
- Interface completa do Chat IA
- Sistema de configurações
- Hook personalizado para gerenciamento
- Histórico de conversas
- Respostas simuladas inteligentes
- Estrutura para integrações futuras

⏳ **Pendente:**
- Integração real com Google Gemini
- Integração com WhatsApp Business API
- Webhook para receber mensagens do WhatsApp

## 🔧 Configuração do Google Gemini

### 1. Obter API Key

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada (formato: `AIza...`)

### 1.1 Modelos Disponíveis

O sistema suporta os seguintes modelos do Google Gemini:

- **gemini-pro**: Modelo padrão para texto
- **gemini-pro-vision**: Modelo com capacidade de visão computacional
- **gemini-2.5-flash**: Modelo mais rápido e eficiente (nova versão)

### 2. Implementar Integração

Substitua a função `sendMessageToGemini` no arquivo `src/hooks/useChatAI.ts`:

```typescript
const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!config.geminiApiKey || !status.geminiConnected) {
    throw new Error('Gemini não está configurado ou conectado')
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.aiModel}:generateContent?key=${config.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Você é um assistente especializado para psicólogos. Responda de forma profissional e técnica: ${message}`
          }]
        }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        }
      })
    })

    if (!response.ok) {
      throw new Error('Erro na API do Gemini')
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    throw new Error('Erro ao comunicar com Gemini')
  }
}
```

### 3. Verificar Conexão

Atualize a função `checkGeminiConnection`:

```typescript
const checkGeminiConnection = async (apiKey: string) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Teste de conexão'
          }]
        }]
      })
    })

    if (response.ok) {
      setStatus(prev => ({ ...prev, geminiConnected: true }))
      return true
    } else {
      setStatus(prev => ({ ...prev, geminiConnected: false }))
      return false
    }
  } catch (error) {
    setStatus(prev => ({ ...prev, geminiConnected: false }))
    return false
  }
}
```

## 📱 Configuração do WhatsApp Business API

### 1. Configurar Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um novo app
3. Adicione o produto "WhatsApp Business"
4. Configure o webhook para receber mensagens

### 2. Obter Credenciais

- **Token de Acesso**: Obtido no painel do app (formato: `EAAx...`)
- **Phone Number ID**: ID do número de telefone configurado
- **Webhook URL**: URL do seu servidor para receber mensagens

### 3. Implementar Webhook (Backend)

Adicione no arquivo `api/routes/webhook.ts`:

```typescript
import express from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// Verificação do webhook
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge)
  } else {
    res.status(403).send('Forbidden')
  }
})

// Receber mensagens
router.post('/whatsapp', async (req, res) => {
  try {
    const { entry } = req.body

    for (const item of entry) {
      if (item.changes) {
        for (const change of item.changes) {
          if (change.field === 'messages') {
            const { messages } = change.value
            
            for (const message of messages) {
              await processWhatsAppMessage(message)
            }
          }
        }
      }
    }

    res.status(200).send('OK')
  } catch (error) {
    console.error('Erro no webhook:', error)
    res.status(500).send('Error')
  }
})

async function processWhatsAppMessage(message: any) {
  // Processar mensagem recebida
  // Enviar para IA
  // Responder via WhatsApp
}

export default router
```

### 4. Implementar Envio de Mensagens

Atualize a função `sendWhatsAppMessage`:

```typescript
const sendWhatsAppMessage = async (to: string, message: string) => {
  if (!config.whatsappToken || !config.whatsappPhoneId || !status.whatsappConnected) {
    throw new Error('WhatsApp não está configurado ou conectado')
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    })

    if (!response.ok) {
      throw new Error('Erro ao enviar mensagem')
    }

    return true
  } catch (error) {
    throw new Error('Erro ao enviar mensagem via WhatsApp')
  }
}
```

## 🔐 Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_token_here
WHATSAPP_PHONE_ID=your_phone_id_here
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
```

## 🚀 Próximos Passos

1. **Implementar integração real com Gemini**
2. **Configurar webhook do WhatsApp**
3. **Adicionar autenticação de usuários via WhatsApp**
4. **Implementar templates de mensagens**
5. **Adicionar analytics de conversas**
6. **Implementar rate limiting**
7. **Adicionar suporte a mídia (imagens, documentos)**

## 📚 Recursos Úteis

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Webhooks Guide](https://developers.facebook.com/docs/graph-api/webhooks)

## ⚠️ Considerações Importantes

- **Segurança**: Nunca exponha API keys no frontend
- **Rate Limiting**: Implemente limites de requisições
- **Logs**: Mantenha logs detalhados para debugging
- **Backup**: Faça backup regular das conversas
- **Compliance**: Respeite as políticas do WhatsApp e Google
- **LGPD**: Implemente consentimento para armazenamento de dados

## 🐛 Troubleshooting

### Gemini não conecta
- Verifique se a API key está correta
- Confirme se a API está habilitada no Google Cloud
- Verifique limites de quota

### WhatsApp não recebe mensagens
- Confirme se o webhook está configurado corretamente
- Verifique se o token de verificação está correto
- Teste a URL do webhook externamente

### Mensagens não são enviadas
- Verifique se o token de acesso está válido
- Confirme se o Phone Number ID está correto
- Verifique se o número está verificado no Business Manager