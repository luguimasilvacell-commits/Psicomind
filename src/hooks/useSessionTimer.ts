import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerState, UseSessionTimerReturn } from '../types/timer';
import { formatTime } from '../utils/timeUtils';

const STORAGE_KEY_PREFIX = 'session_timer_';

export const useSessionTimer = (
  initialTime = 0,
  sessionId?: string,
  autoSave = true
): UseSessionTimerReturn => {
  const [state, setState] = useState<TimerState>({
    seconds: initialTime,
    isRunning: false,
    isPaused: false,
    startTime: null,
    endTime: null,
    lastPauseTime: null,
    totalPausedTime: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = sessionId ? `${STORAGE_KEY_PREFIX}${sessionId}` : null;

  // Carregar estado do localStorage se disponível
  useEffect(() => {
    if (storageKey && autoSave) {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setState(prev => ({
            ...prev,
            ...parsed,
            startTime: parsed.startTime ? new Date(parsed.startTime) : null,
            endTime: parsed.endTime ? new Date(parsed.endTime) : null,
            lastPauseTime: parsed.lastPauseTime ? new Date(parsed.lastPauseTime) : null,
          }));
        } catch (error) {
          console.error('Erro ao carregar estado do timer:', error);
        }
      }
    }
  }, [storageKey, autoSave]);

  // Salvar estado no localStorage
  const saveState = useCallback((newState: TimerState) => {
    if (storageKey && autoSave) {
      localStorage.setItem(storageKey, JSON.stringify(newState));
    }
  }, [storageKey, autoSave]);

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Função para iniciar o timer
  const start = useCallback(() => {
    const now = new Date();
    const newState: TimerState = {
      ...state,
      isRunning: true,
      isPaused: false,
      startTime: state.startTime || now,
      endTime: null,
    };

    setState(newState);
    saveState(newState);

    intervalRef.current = setInterval(() => {
      setState(prev => {
        const updated = { ...prev, seconds: prev.seconds + 1 };
        saveState(updated);
        return updated;
      });
    }, 1000);
  }, [state, saveState]);

  // Função para pausar o timer
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const now = new Date();
    const newState: TimerState = {
      ...state,
      isRunning: false,
      isPaused: true,
      lastPauseTime: now,
    };

    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  // Função para retomar o timer
  const resume = useCallback(() => {
    if (state.isPaused) {
      const now = new Date();
      const pauseDuration = state.lastPauseTime 
        ? Math.floor((now.getTime() - state.lastPauseTime.getTime()) / 1000)
        : 0;

      const newState: TimerState = {
        ...state,
        isRunning: true,
        isPaused: false,
        totalPausedTime: state.totalPausedTime + pauseDuration,
        lastPauseTime: null,
      };

      setState(newState);
      saveState(newState);

      intervalRef.current = setInterval(() => {
        setState(prev => {
          const updated = { ...prev, seconds: prev.seconds + 1 };
          saveState(updated);
          return updated;
        });
      }, 1000);
    }
  }, [state, saveState]);

  // Função para parar o timer
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const now = new Date();
    const newState: TimerState = {
      ...state,
      isRunning: false,
      isPaused: false,
      endTime: now,
    };

    setState(newState);
    saveState(newState);

    // Limpar do localStorage após parar
    if (storageKey && autoSave) {
      localStorage.removeItem(storageKey);
    }
  }, [state, saveState, storageKey, autoSave]);

  // Função para resetar o timer
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const newState: TimerState = {
      seconds: 0,
      isRunning: false,
      isPaused: false,
      startTime: null,
      endTime: null,
      lastPauseTime: null,
      totalPausedTime: 0,
    };

    setState(newState);
    
    // Limpar do localStorage
    if (storageKey && autoSave) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, autoSave]);

  // Função para definir tempo manualmente
  const setManualTime = useCallback((seconds: number) => {
    if (seconds >= 0) {
      const newState: TimerState = {
        ...state,
        seconds,
      };
      setState(newState);
      saveState(newState);
    }
  }, [state, saveState]);

  return {
    time: state.seconds,
    formattedTime: formatTime(state.seconds),
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    isStopped: !state.isRunning && !state.isPaused && state.seconds > 0,
    startTime: state.startTime,
    endTime: state.endTime,
    start,
    pause,
    resume,
    stop,
    reset,
    setManualTime,
  };
};