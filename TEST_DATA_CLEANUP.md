# Limpeza de Dados de Teste - Psicomind

## ✅ Status: DADOS DE TESTE REMOVIDOS

Todos os dados de teste/mocados foram removidos do sistema em 09/01/2025.

## 📋 Arquivos Afetados

### Migrations Comentadas:
- `supabase/migrations/002_create_test_data.sql` - Dados comentados
- `supabase/migrations/003_create_test_patients.sql` - Dados comentados

### Scripts de Teste (NÃO EXECUTAR):
- `create-test-data.js` - Cria dados de teste
- `create-test-user.js` - Cria usuário de teste
- `create-admin-user.js` - Cria usuário admin (OK para usar)

### Migration de Limpeza:
- `supabase/migrations/20250109_clean_test_data.sql` - Remove todos os dados de teste

## 🗑️ Dados Removidos

### Psicólogo de Teste:
- Email: `teste@psicomind.com`
- ID: `1da6af50-2658-4047-873e-04ba7fde3e52`

### Pacientes de Teste:
- Maria Silva (CPF: 123.456.789-01)
- João Santos (CPF: 234.567.890-12)
- Ana Costa (CPF: 345.678.901-23)

### Dados Relacionados:
- Agendamentos dos pacientes de teste
- Prontuários dos pacientes de teste
- Transações financeiras dos pacientes de teste

## ⚠️ IMPORTANTE

### Para Evitar Recriar Dados de Teste:

1. **NÃO execute** os scripts:
   - `node create-test-data.js`
   - `node create-test-user.js`

2. **NÃO descomente** as migrations:
   - `002_create_test_data.sql`
   - `003_create_test_patients.sql`

3. **Para desenvolvimento**, use apenas:
   - `node create-admin-user.js` (cria usuário admin)

## 🔄 Para Reativar Dados de Teste (se necessário)

1. Descomente as linhas nas migrations:
   - `002_create_test_data.sql`
   - `003_create_test_patients.sql`

2. Execute as migrations novamente:
   ```bash
   supabase db push
   ```

3. Ou execute os scripts:
   ```bash
   node create-test-user.js
   node create-test-data.js
   ```

## 🎯 Sistema Limpo

O sistema agora está pronto para produção com:
- ✅ Estrutura de banco completa
- ✅ Usuário admin funcional
- ✅ Sem dados de teste
- ✅ Tabelas vazias prontas para dados reais