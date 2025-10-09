# Cronômetro de Sessão - Sistema de Prontuários

## 1. Visão Geral

Este documento especifica a implementação de um cronômetro/contador de tempo integrado ao sistema de prontuários do Psicomind, permitindo que psicólogos cronometrem suas sessões de consulta de forma precisa e automática.

## 2. Objetivos

- **Cronometragem precisa**: Registrar o tempo exato de duração das sessões
- **Interface intuitiva**: Controles simples e visíveis para o psicólogo
- **Integração automática**: Salvar o tempo automaticamente no prontuário
- **Flexibilidade**: Permitir edição manual do tempo quando necessário
- **Histórico**: Manter registro dos tempos de todas as sessões

## 3. Funcionalidades Principais

### 3.1 Cronômetro Visual
- **Display em tempo real**: Mostrar tempo decorrido em formato HH:MM:SS
- **Controles básicos**: Botões para Iniciar, Pausar, Parar e Resetar
- **Indicadores visuais**: Estados diferentes para cada modo (rodando, pausado, parado)
- **Posicionamento**: Localizado de forma proeminente no formulário de prontuário

### 3.2 Controles de Tempo
- **Iniciar**: Começar a contagem do tempo
- **Pausar**: Pausar temporariamente a contagem (mantém o tempo acumulado)
- **Retomar**: Continuar a contagem após pausa
- **Parar**: Finalizar a contagem e registrar o tempo total
- **Resetar**: Zerar o cronômetro (apenas quando parado)

### 3.3 Persistência de Dados
- **Auto-save**: Salvar automaticamente o tempo quando o prontuário for salvo
- **Edição manual**: Campo para ajustar manualmente o tempo se necessário
- **Histórico**: Manter registro de todos os tempos de sessão

## 4. Especificações Técnicas

### 4.1 Alterações no Banco de Dados

#### Modificação da Tabela `prontuarios`
```sql
-- Adicionar campos para cronometragem
ALTER TABLE prontuarios ADD COLUMN duracao_sessao_segundos INTEGER DEFAULT 0;
ALTER TABLE prontuarios ADD COLUMN tempo_inicio_sessao TIMESTAMP WITH TIME ZONE;
ALTER TABLE prontuarios ADD COLUMN tempo_fim_sessao TIMESTAMP WITH TIME ZONE;

-- Índice para consultas por duração
CREATE INDEX idx_prontuarios_duracao ON prontuarios(duracao_sessao_segundos);
```

#### Campos Adicionados
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `duracao_sessao_segundos` | INTEGER | Duração total da sessão em segundos |
| `tempo_inicio_sessao` | TIMESTAMP | Timestamp do início da sessão |
| `tempo_fim_sessao` | TIMESTAMP | Timestamp do fim da sessão |

### 4.2 Interface do Usuário

#### Componente Cronômetro
```typescript
interface SessionTimerProps {
  onTimeUpdate: (seconds: number) => void;
  initialTime?: number;
  disabled?: boolean;
}

interface TimerState {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
}
```

#### Layout no Formulário
```
┌─────────────────────────────────────┐
│ Novo Prontuário                  [X]│
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │     CRONÔMETRO DA SESSÃO        │ │
│ │                                 │ │
│ │        00:45:32                 │ │
│ │                                 │ │
│ │  [▶️ Iniciar] [⏸️ Pausar] [⏹️ Parar] │ │
│ │                                 │ │
│ │  Duração manual: [00:45:32]     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Resto do formulário...]            │
└─────────────────────────────────────┘
```

### 4.3 Estados do Cronômetro

#### Estados Visuais
1. **Inicial**: Cronômetro zerado, botão "Iniciar" disponível
2. **Rodando**: Tempo contando, botões "Pausar" e "Parar" disponíveis
3. **Pausado**: Tempo pausado, botões "Retomar" e "Parar" disponíveis
4. **Finalizado**: Tempo registrado, botão "Resetar" disponível

#### Cores e Indicadores
- **Verde**: Cronômetro rodando
- **Amarelo**: Cronômetro pausado
- **Azul**: Cronômetro parado/finalizado
- **Cinza**: Cronômetro desabilitado

## 5. Implementação

### 5.1 Hook Personalizado `useSessionTimer`

```typescript
interface UseSessionTimerReturn {
  time: number;
  formattedTime: string;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setManualTime: (seconds: number) => void;
}

const useSessionTimer = (initialTime = 0): UseSessionTimerReturn => {
  // Implementação do hook
};
```

### 5.2 Componente `SessionTimer`

```typescript
const SessionTimer: React.FC<SessionTimerProps> = ({
  onTimeUpdate,
  initialTime = 0,
  disabled = false
}) => {
  const timer = useSessionTimer(initialTime);
  
  // Implementação do componente
};
```

### 5.3 Integração com `ProntuarioForm`

#### Modificações no Schema
```typescript
const prontuarioSchema = z.object({
  paciente_id: z.string().min(1, 'Selecione um paciente'),
  data_sessao: z.string().min(1, 'Data da sessão é obrigatória'),
  diagnostico: z.string().optional(),
  observacoes: z.string().min(1, 'Observações são obrigatórias'),
  plano_tratamento: z.string().optional(),
  medicamentos: z.string().optional(),
  proxima_sessao: z.string().optional(),
  // Novos campos
  duracao_sessao_segundos: z.number().default(0),
  tempo_inicio_sessao: z.string().optional(),
  tempo_fim_sessao: z.string().optional(),
});
```

#### Estado do Formulário
```typescript
const [sessionTime, setSessionTime] = useState(0);
const [sessionStarted, setSessionStarted] = useState(false);
```

### 5.4 Funções Utilitárias

#### Formatação de Tempo
```typescript
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const parseTimeString = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
};
```

## 6. Fluxo de Uso

### 6.1 Cenário Principal
1. **Psicólogo abre novo prontuário** → Cronômetro aparece zerado
2. **Paciente chega para sessão** → Psicólogo clica "Iniciar"
3. **Durante a sessão** → Cronômetro conta o tempo em tempo real
4. **Pausa necessária** → Psicólogo pode pausar e retomar
5. **Fim da sessão** → Psicólogo clica "Parar"
6. **Salvar prontuário** → Tempo é automaticamente salvo

### 6.2 Cenário de Edição
1. **Psicólogo abre prontuário existente** → Cronômetro mostra tempo salvo
2. **Ajuste necessário** → Pode editar manualmente o campo de duração
3. **Salvar alterações** → Novo tempo é persistido

### 6.3 Cenário de Recuperação
1. **Sessão interrompida** → Sistema salva estado atual
2. **Retorno ao formulário** → Cronômetro restaura estado anterior
3. **Continuar sessão** → Psicólogo pode retomar de onde parou

## 7. Validações e Regras de Negócio

### 7.1 Validações
- **Tempo mínimo**: Sessão deve ter pelo menos 1 minuto
- **Tempo máximo**: Sessão não pode exceder 8 horas
- **Formato válido**: Entrada manual deve estar no formato HH:MM:SS
- **Consistência**: Tempo de início deve ser anterior ao tempo de fim

### 7.2 Regras de Negócio
- **Auto-save**: Tempo é salvo automaticamente ao salvar prontuário
- **Persistência**: Estado do cronômetro é mantido durante navegação
- **Histórico**: Todos os tempos são mantidos para análise posterior
- **Relatórios**: Tempos podem ser usados em relatórios de produtividade

## 8. Melhorias Futuras

### 8.1 Funcionalidades Avançadas
- **Alertas de tempo**: Notificações em intervalos específicos
- **Tempo médio**: Cálculo automático de tempo médio por paciente
- **Relatórios**: Análise de produtividade baseada em tempo
- **Integração com agenda**: Comparação com tempo agendado

### 8.2 Otimizações
- **Sincronização**: Backup automático do estado do cronômetro
- **Offline**: Funcionamento sem conexão com internet
- **Performance**: Otimização para não impactar performance do formulário

## 9. Considerações de UX

### 9.1 Usabilidade
- **Visibilidade**: Cronômetro deve ser facilmente visível
- **Simplicidade**: Controles intuitivos e diretos
- **Feedback**: Indicações claras do estado atual
- **Acessibilidade**: Suporte a leitores de tela

### 9.2 Design
- **Consistência**: Seguir padrão visual do sistema
- **Responsividade**: Funcionar bem em diferentes tamanhos de tela
- **Cores**: Usar cores que indiquem claramente o estado
- **Tipografia**: Fonte legível para o display do tempo

## 10. Testes

### 10.1 Casos de Teste
- **Iniciar cronômetro**: Verificar se inicia corretamente
- **Pausar/Retomar**: Verificar se pausa e retoma adequadamente
- **Parar cronômetro**: Verificar se para e registra tempo
- **Edição manual**: Verificar se aceita entrada manual válida
- **Persistência**: Verificar se salva e carrega corretamente
- **Validações**: Verificar se valida entradas inválidas

### 10.2 Testes de Integração
- **Formulário**: Verificar integração com formulário de prontuário
- **Banco de dados**: Verificar se salva corretamente no banco
- **Estados**: Verificar transições entre estados
- **Performance**: Verificar se não impacta performance

## 11. Cronograma de Implementação

### Fase 1: Estrutura Base (2-3 dias)
- [ ] Alterações no banco de dados
- [ ] Hook `useSessionTimer`
- [ ] Componente básico `SessionTimer`

### Fase 2: Integração (2-3 dias)
- [ ] Integração com `ProntuarioForm`
- [ ] Persistência de dados
- [ ] Validações básicas

### Fase 3: Refinamentos (1-2 dias)
- [ ] Melhorias de UX
- [ ] Testes completos
- [ ] Documentação final

**Total estimado**: 5-8 dias de desenvolvimento