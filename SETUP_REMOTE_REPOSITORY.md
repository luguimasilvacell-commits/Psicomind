# Configuração de Repositório Remoto - Psicomind

## Instruções para GitHub

### 1. Criar repositório no GitHub
1. Acesse [GitHub](https://github.com)
2. Clique em "New repository"
3. Nome: `Psicomind`
4. Descrição: `Sistema de Agendamento de Consultas Psicológicas`
5. Mantenha como **privado** (recomendado por conter configurações sensíveis)
6. **NÃO** inicialize com README, .gitignore ou license (já temos esses arquivos)

### 2. Conectar repositório local ao GitHub
```bash
# Adicionar repositório remoto
git remote add origin https://github.com/SEU_USUARIO/Psicomind.git

# Verificar se foi adicionado corretamente
git remote -v

# Fazer push do código
git push -u origin main
```

### 3. Configurar variáveis de ambiente no GitHub (para CI/CD)
Se você planeja usar GitHub Actions, adicione as seguintes secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## Instruções para GitLab

### 1. Criar repositório no GitLab
1. Acesse [GitLab](https://gitlab.com)
2. Clique em "New project"
3. Escolha "Create blank project"
4. Nome: `Psicomind`
5. Descrição: `Sistema de Agendamento de Consultas Psicológicas`
6. Mantenha como **privado**
7. **NÃO** inicialize com README

### 2. Conectar repositório local ao GitLab
```bash
# Adicionar repositório remoto
git remote add origin https://gitlab.com/SEU_USUARIO/Psicomind.git

# Verificar se foi adicionado corretamente
git remote -v

# Fazer push do código
git push -u origin main
```

## Comandos Úteis

### Verificar status do repositório
```bash
git status
git log --oneline
```

### Fazer novos commits
```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

### Verificar repositórios remotos configurados
```bash
git remote -v
```

## Arquivos Importantes Incluídos no Repositório

✅ **Código fonte completo**
- `src/` - Frontend React/TypeScript
- `api/` - Backend Node.js/Express

✅ **Configurações**
- `package.json` - Dependências e scripts
- `tsconfig.json` - Configuração TypeScript
- `vite.config.ts` - Configuração Vite
- `tailwind.config.js` - Configuração Tailwind CSS
- `vercel.json` - Configuração de deploy

✅ **Banco de dados**
- `supabase/migrations/` - Migrações do banco

✅ **Documentação**
- `README.md` - Documentação principal
- `.trae/documents/` - Documentação adicional

✅ **Configurações de ambiente**
- `.env.example` - Template de variáveis de ambiente
- `.gitignore` - Arquivos ignorados pelo Git

## ⚠️ Importante

- O arquivo `.env` com as chaves reais **NÃO** está incluído no repositório por segurança
- Lembre-se de configurar as variáveis de ambiente no serviço de hospedagem
- Mantenha o repositório como privado se contiver informações sensíveis

## Backup Local

Um backup completo foi criado em:
`../Psicomind_backup_YYYYMMDD_HHMMSS.tar.gz`

Este backup contém todos os arquivos importantes, excluindo:
- `node_modules/`
- `.git/`
- `dist/`
- `logs/`
- `.env` (por segurança)

## Instruções para GitHub

### 1. Criar repositório no GitHub
1. Acesse [GitHub](https://github.com)
2. Clique em "New repository"
3. Nome: `Psicomind`
4. Descrição: `Sistema de Agendamento de Consultas Psicológicas`
5. Mantenha como **privado** (recomendado por conter configurações sensíveis)
6. **NÃO** inicialize com README, .gitignore ou license (já temos esses arquivos)

### 2. Conectar repositório local ao GitHub
```bash
# Adicionar repositório remoto
git remote add origin https://github.com/SEU_USUARIO/Psicomind.git

# Verificar se foi adicionado corretamente
git remote -v

# Fazer push do código
git push -u origin main
```

### 3. Configurar variáveis de ambiente no GitHub (para CI/CD)
Se você planeja usar GitHub Actions, adicione as seguintes secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## Instruções para GitLab

### 1. Criar repositório no GitLab
1. Acesse [GitLab](https://gitlab.com)
2. Clique em "New project"
3. Escolha "Create blank project"
4. Nome: `Psicomind`
5. Descrição: `Sistema de Agendamento de Consultas Psicológicas`
6. Mantenha como **privado**
7. **NÃO** inicialize com README

### 2. Conectar repositório local ao GitLab
```bash
# Adicionar repositório remoto
git remote add origin https://gitlab.com/SEU_USUARIO/Psicomind.git

# Verificar se foi adicionado corretamente
git remote -v

# Fazer push do código
git push -u origin main
```

## Comandos Úteis

### Verificar status do repositório
```bash
git status
git log --oneline
```

### Fazer novos commits
```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

### Verificar repositórios remotos configurados
```bash
git remote -v
```

## Arquivos Importantes Incluídos no Repositório

✅ **Código fonte completo**
- `src/` - Frontend React/TypeScript
- `api/` - Backend Node.js/Express

✅ **Configurações**
- `package.json` - Dependências e scripts
- `tsconfig.json` - Configuração TypeScript
- `vite.config.ts` - Configuração Vite
- `tailwind.config.js` - Configuração Tailwind CSS
- `vercel.json` - Configuração de deploy

✅ **Banco de dados**
- `supabase/migrations/` - Migrações do banco

✅ **Documentação**
- `README.md` - Documentação principal
- `.trae/documents/` - Documentação adicional

✅ **Configurações de ambiente**
- `.env.example` - Template de variáveis de ambiente
- `.gitignore` - Arquivos ignorados pelo Git

## ⚠️ Importante

- O arquivo `.env` com as chaves reais **NÃO** está incluído no repositório por segurança
- Lembre-se de configurar as variáveis de ambiente no serviço de hospedagem
- Mantenha o repositório como privado se contiver informações sensíveis

## Backup Local

Um backup completo foi criado em:
`../Psicomind_backup_YYYYMMDD_HHMMSS.tar.gz`

Este backup contém todos os arquivos importantes, excluindo:
- `node_modules/`
- `.git/`
- `dist/`
- `logs/`
- `.env` (por segurança)