/**
 * Utilitários para manipulação e formatação de tempo
 */

/**
 * Formata segundos para HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Converte string HH:MM:SS para segundos
 */
export const parseTimeString = (timeString: string): number => {
  const parts = timeString.split(':');
  if (parts.length !== 3) return 0;
  
  const [hours, minutes, seconds] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
  
  return (hours * 3600) + (minutes * 60) + seconds;
};

/**
 * Valida formato de tempo HH:MM:SS
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Converte segundos para formato legível
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
};

/**
 * Calcula diferença entre duas datas em segundos
 */
export const getTimeDifferenceInSeconds = (start: Date, end: Date): number => {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
};

/**
 * Converte timestamp ISO para Date
 */
export const parseISOTimestamp = (timestamp: string | null): Date | null => {
  if (!timestamp) return null;
  try {
    return new Date(timestamp);
  } catch {
    return null;
  }
};

/**
 * Formata data para exibição
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Formata apenas o horário
 */
export const formatTimeOnly = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Valida se um tempo em segundos está dentro dos limites aceitáveis
 */
export const isValidSessionDuration = (seconds: number): boolean => {
  // Mínimo: 1 minuto, Máximo: 8 horas
  const MIN_DURATION = 60; // 1 minuto
  const MAX_DURATION = 8 * 60 * 60; // 8 horas
  
  return seconds >= MIN_DURATION && seconds <= MAX_DURATION;
};

/**
 * Converte minutos para segundos
 */
export const minutesToSeconds = (minutes: number): number => {
  return minutes * 60;
};

/**
 * Converte horas para segundos
 */
export const hoursToSeconds = (hours: number): number => {
  return hours * 60 * 60;
};

/**
 * Extrai componentes de tempo de segundos
 */
export const getTimeComponents = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return { hours, minutes, seconds: secs };
};

/**
 * Cria um timestamp ISO para o momento atual
 */
export const getCurrentISOTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Calcula tempo decorrido desde um timestamp
 */
export const getElapsedTime = (startTimestamp: string): number => {
  const start = parseISOTimestamp(startTimestamp);
  if (!start) return 0;
  
  return getTimeDifferenceInSeconds(start, new Date());
};

/**
 * Formata duração para exibição em relatórios
 */
export const formatDurationForReport = (seconds: number): string => {
  const { hours, minutes } = getTimeComponents(seconds);
  
  if (hours === 0) {
    return `${minutes} min`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}min`;
};