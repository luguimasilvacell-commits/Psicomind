/**
 * Tipos TypeScript para o sistema de cronômetro de sessão
 */

export interface TimerState {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
  lastPauseTime: Date | null;
  totalPausedTime: number;
}

export interface SessionTimerProps {
  onTimeUpdate: (seconds: number) => void;
  initialTime?: number;
  disabled?: boolean;
  autoSave?: boolean;
  sessionId?: string;
}

export interface TimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setManualTime: (seconds: number) => void;
}

export interface UseSessionTimerReturn extends TimerControls {
  time: number;
  formattedTime: string;
  isRunning: boolean;
  isPaused: boolean;
  isStopped: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

export interface SessionData {
  duracao_sessao_segundos: number;
  tempo_inicio_sessao?: string;
  tempo_fim_sessao?: string;
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface TimerDisplayProps {
  time: number;
  status: TimerStatus;
  isEditing?: boolean;
  onEdit?: (time: number) => void;
}

export interface TimerControlsProps {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}