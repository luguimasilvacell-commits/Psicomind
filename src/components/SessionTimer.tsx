import React, { useState } from 'react';
import { Play, Pause, Square, RotateCcw, Clock, Edit3, Check, X } from 'lucide-react';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { SessionTimerProps } from '../types/timer';
import { parseTimeString, isValidTimeFormat } from '../utils/timeUtils';

export const SessionTimer: React.FC<SessionTimerProps> = ({
  onTimeUpdate,
  initialTime = 0,
  disabled = false,
  autoSave = true,
  sessionId,
}) => {
  const timer = useSessionTimer(initialTime, sessionId, autoSave);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(timer.formattedTime);

  // Notificar mudanças de tempo
  React.useEffect(() => {
    onTimeUpdate(timer.time);
  }, [timer.time, onTimeUpdate]);

  // Atualizar valor de edição quando o tempo muda
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(timer.formattedTime);
    }
  }, [timer.formattedTime, isEditing]);

  const handleEditStart = () => {
    if (!disabled && !timer.isRunning) {
      setIsEditing(true);
      setEditValue(timer.formattedTime);
    }
  };

  const handleEditSave = () => {
    if (isValidTimeFormat(editValue)) {
      const seconds = parseTimeString(editValue);
      timer.setManualTime(seconds);
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setEditValue(timer.formattedTime);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const getStatusColor = () => {
    if (disabled) return 'text-gray-400';
    if (timer.isRunning) return 'text-green-600';
    if (timer.isPaused) return 'text-yellow-600';
    if (timer.isStopped) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (disabled) return 'Desabilitado';
    if (timer.isRunning) return 'Em andamento';
    if (timer.isPaused) return 'Pausado';
    if (timer.isStopped) return 'Finalizado';
    return 'Pronto para iniciar';
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Cronômetro da Sessão
        </h4>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Display do Tempo */}
      <div className="text-center mb-4">
        {isEditing ? (
          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-3xl font-mono font-bold text-center border border-gray-300 rounded px-2 py-1 w-32"
              placeholder="HH:MM:SS"
              autoFocus
            />
            <button
              onClick={handleEditSave}
              className="p-1 text-green-600 hover:text-green-800"
              title="Salvar"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={handleEditCancel}
              className="p-1 text-red-600 hover:text-red-800"
              title="Cancelar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <span className={`text-4xl font-mono font-bold ${getStatusColor()}`}>
              {timer.formattedTime}
            </span>
            {!disabled && !timer.isRunning && (
              <button
                onClick={handleEditStart}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Editar tempo manualmente"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex justify-center space-x-2">
        {!timer.isRunning && !timer.isPaused && (
          <button
            onClick={timer.start}
            disabled={disabled}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar
          </button>
        )}

        {timer.isRunning && (
          <button
            onClick={timer.pause}
            disabled={disabled}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </button>
        )}

        {timer.isPaused && (
          <button
            onClick={timer.resume}
            disabled={disabled}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4 mr-2" />
            Retomar
          </button>
        )}

        {(timer.isRunning || timer.isPaused) && (
          <button
            onClick={timer.stop}
            disabled={disabled}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="h-4 w-4 mr-2" />
            Parar
          </button>
        )}

        {timer.isStopped && (
          <button
            onClick={timer.reset}
            disabled={disabled}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </button>
        )}
      </div>

      {/* Informações adicionais */}
      {(timer.startTime || timer.endTime) && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {timer.startTime && (
            <div>Início: {timer.startTime.toLocaleTimeString()}</div>
          )}
          {timer.endTime && (
            <div>Fim: {timer.endTime.toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionTimer;