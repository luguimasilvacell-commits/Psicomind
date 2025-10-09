# 👑 Guia do Administrador - Psicomind

## ✅ Status: IMPLEMENTADO E FUNCIONAL

O sistema de administração foi implementado com sucesso e está totalmente funcional!

## Visão Geral

O sistema Psicomind agora possui suporte completo para usuários administradores com privilégios especiais e acesso total ao sistema.

## 🔐 Credenciais do Administrador

**Email:** `admin@psicomind.com`  
**Senha:** `admin123`  
**Role:** `admin`  
**CRP:** `ADMIN-001`

> ⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 🚀 Funcionalidades do Admin

### Privilégios Especiais
- ✅ Acesso total a todos os dados do sistema
- ✅ Visualização de todos os psicólogos, pacientes e agendamentos
- ✅ Acesso a todos os prontuários e transações financeiras
- ✅ Visualização completa do histórico de chat
- ✅ Indicador visual de role no dashboard

### Políticas de Segurança (RLS)
O sistema implementa Row Level Security (RLS) com políticas específicas para admins:

- **Psicólogos:** Admins podem ver todos os psicólogos
- **Pacientes:** Admins podem gerenciar todos os pacientes
- **Agendamentos:** Admins têm acesso a todos os agendamentos
- **Prontuários:** Admins podem visualizar todos os prontuários
- **Transações:** Admins têm acesso a todas as transações financeiras
- **Chat:** Admins podem ver todo o histórico de conversas

## 🛠️ Scripts de Gerenciamento

### Criar Usuário Admin
```bash
node create-admin-user.js
```

### Listar Usuários Admin
```bash
node create-admin-user.js --list
```

### Verificar Status
```bash
node create-admin-user.js --list
```

## 🔧 Estrutura Técnica

### Banco de Dados
- **Campo `role`** adicionado na tabela `psicologos`
- **Valores permitidos:** `'admin'` | `'psicologo'`
- **Valor padrão:** `'psicologo'`
- **Índice criado** para otimizar consultas por role

### Frontend (React/TypeScript)
- **Interface `Psicologo`** atualizada com campo `role`
- **AuthStore** com funções de verificação de role:
  - `isAdmin()`: Verifica se o usuário é admin
  - `isPsicologo()`: Verifica se o usuário é psicólogo
  - `hasRole(role)`: Verifica role específica

### Funções de Verificação
```typescript
const { isAdmin, isPsicologo, hasRole } = useAuthStore()

// Verificar se é admin
if (isAdmin()) {
  // Lógica específica para admin
}

// Verificar role específica
if (hasRole('admin')) {
  // Acesso administrativo
}
```

## 🎨 Interface do Usuário

### Indicador Visual
- **Admin:** Badge roxo com ícone de coroa (👑 Administrador)
- **Psicólogo:** Badge azul com ícone médico (👨‍⚕️ Psicólogo)

### Dashboard
O dashboard mostra informações do usuário logado no canto superior direito:
- Nome completo
- Email
- Role com indicador visual

## 🔒 Segurança

### Autenticação
- Utiliza **Supabase Auth** para gerenciamento de sessões
- Senhas são gerenciadas pelo Supabase (não armazenadas localmente)
- Tokens JWT com expiração automática

### Autorização
- **Row Level Security (RLS)** implementado em todas as tabelas
- Políticas específicas para admins e psicólogos
- Verificação de role em tempo real

### Boas Práticas
1. **Altere a senha padrão** imediatamente após o primeiro login
2. **Use senhas fortes** para contas administrativas
3. **Monitore logs de auditoria** para atividades administrativas
4. **Revise permissões** periodicamente

## 🚨 Troubleshooting

### Problemas Comuns

**1. Erro ao fazer login como admin**
```bash
# Verificar se o usuário existe
node create-admin-user.js --list
```

**2. Role não aparece corretamente**
- Verificar se a migration foi aplicada
- Confirmar que o campo `role` existe na tabela
- Verificar se o frontend foi atualizado

**3. Permissões não funcionam**
- Verificar políticas RLS no Supabase
- Confirmar que as políticas de admin estão ativas
- Testar com usuário psicólogo para comparação

### Logs e Debugging
```bash
# Verificar logs do servidor
npm run server:dev

# Verificar console do browser
# Abrir DevTools > Console
```

## 📝 Changelog

### v1.0.0 - Sistema de Admin Implementado
- ✅ Campo `role` adicionado na tabela `psicologos`
- ✅ Migration aplicada com políticas RLS
- ✅ Script de criação de admin
- ✅ AuthStore atualizado com verificações de role
- ✅ Interface visual para identificação de role
- ✅ Usuário admin padrão criado

## 🤝 Suporte

Para questões relacionadas ao sistema de administração:

1. **Verificar logs** do sistema
2. **Consultar documentação** técnica
3. **Testar com usuário de teste** primeiro
4. **Verificar permissões** no Supabase Dashboard

---

**Desenvolvido para Psicomind** 🧠  
Sistema de Agendamento de Consultas Psicológicas