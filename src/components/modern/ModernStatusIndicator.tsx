import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Clock, Zap, Wifi, WifiOff } from 'lucide-react';

interface ModernStatusIndicatorProps {
  status: 'success' | 'error' | 'warning' | 'pending' | 'active' | 'online' | 'offline';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Sucesso'
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Erro'
  },
  warning: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertCircle,
    label: 'Atenção'
  },
  pending: {
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Clock,
    label: 'Pendente'
  },
  active: {
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Zap,
    label: 'Ativo'
  },
  online: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Wifi,
    label: 'Online'
  },
  offline: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: WifiOff,
    label: 'Offline'
  }
};

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    icon: 'w-3 h-3',
    text: 'text-xs',
    padding: 'px-2 py-1'
  },
  md: {
    dot: 'w-3 h-3',
    icon: 'w-4 h-4',
    text: 'text-sm',
    padding: 'px-3 py-1.5'
  },
  lg: {
    dot: 'w-4 h-4',
    icon: 'w-5 h-5',
    text: 'text-base',
    padding: 'px-4 py-2'
  }
};

export const ModernStatusIndicator: React.FC<ModernStatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  animated = true,
  showIcon = false,
  className = ''
}) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const pulseAnimation = {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  };

  const displayLabel = label || config.label;

  if (showIcon) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`inline-flex items-center space-x-2 ${sizeStyles.padding} rounded-full ${config.bgColor} ${config.borderColor} border ${className}`}
      >
        <motion.div
          animate={animated ? pulseAnimation : {}}
          className="relative"
        >
          <Icon className={`${sizeStyles.icon} ${config.textColor}`} />
        </motion.div>
        {displayLabel && (
          <span className={`font-medium ${config.textColor} ${sizeStyles.text}`}>
            {displayLabel}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center space-x-2 ${className}`}
    >
      <div className="relative">
        <motion.div
          animate={animated ? pulseAnimation : {}}
          className={`${sizeStyles.dot} ${config.color} rounded-full`}
        />
        {animated && (
          <motion.div
            animate={{
              scale: [1, 2, 1],
              opacity: [0.6, 0, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className={`absolute inset-0 ${sizeStyles.dot} ${config.color} rounded-full`}
          />
        )}
      </div>
      {displayLabel && (
        <span className={`font-medium ${config.textColor} ${sizeStyles.text}`}>
          {displayLabel}
        </span>
      )}
    </motion.div>
  );
};

// Componente específico para status de conexão
export const ConnectionStatus: React.FC<{
  isConnected: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ isConnected, size = 'md', className = '' }) => {
  return (
    <ModernStatusIndicator
      status={isConnected ? 'online' : 'offline'}
      label={isConnected ? 'Conectado' : 'Desconectado'}
      size={size}
      animated={true}
      showIcon={true}
      className={className}
    />
  );
};

// Componente para status de processo
export const ProcessStatus: React.FC<{
  status: 'idle' | 'processing' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const statusMap = {
    idle: 'pending' as const,
    processing: 'active' as const,
    completed: 'success' as const,
    failed: 'error' as const
  };

  const labelMap = {
    idle: 'Aguardando',
    processing: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou'
  };

  return (
    <ModernStatusIndicator
      status={statusMap[status]}
      label={labelMap[status]}
      size={size}
      animated={status === 'processing'}
      showIcon={true}
      className={className}
    />
  );
};