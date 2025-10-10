/**
 * Componente para exibir status de conexão do WhatsApp
 */
import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Loader, 
  QrCode, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { WhatsAppStatus as Status } from '../../types/chat';

interface WhatsAppStatusProps {
  status: Status;
  qrCode?: string | null;
  clientInfo?: any;
  onInitialize?: () => void;
  onDisconnect?: () => void;
  onRestart?: () => void;
  loading?: boolean;
}

const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({
  status,
  qrCode,
  clientInfo,
  onInitialize,
  onDisconnect,
  onRestart,
  loading = false
}) => {
  const getStatusConfig = (status: Status) => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'WhatsApp Conectado',
          description: 'Pronto para enviar e receber mensagens'
        };
      case 'initializing':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Conectando...',
          description: 'Inicializando conexão com WhatsApp'
        };
      case 'qr_code':
        return {
          icon: QrCode,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Aguardando QR Code',
          description: 'Escaneie o QR Code com seu WhatsApp'
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'WhatsApp Desconectado',
          description: 'Clique em conectar para iniciar'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor} p-4`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${statusConfig.color}`}>
          <StatusIcon 
            className={`w-6 h-6 ${status === 'initializing' ? 'animate-spin' : ''}`} 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {statusConfig.description}
          </p>
          
          {/* Client Info */}
          {status === 'connected' && clientInfo && (
            <div className="mt-2 text-xs text-gray-500">
              <p>Número: {clientInfo.number}</p>
              {clientInfo.name && <p>Nome: {clientInfo.name}</p>}
            </div>
          )}
          
          {/* QR Code */}
          {status === 'qr_code' && qrCode && (
            <div className="mt-3">
              <div className="bg-white p-3 rounded-lg border inline-block">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                1. Abra o WhatsApp no seu celular<br/>
                2. Toque em Menu ou Configurações<br/>
                3. Toque em WhatsApp Web<br/>
                4. Aponte seu celular para esta tela
              </p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex-shrink-0">
          <div className="flex space-x-2">
            {status === 'disconnected' && (
              <button
                onClick={onInitialize}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Wifi className="w-3 h-3 mr-1" />
                )}
                Conectar
              </button>
            )}
            
            {status === 'connected' && (
              <>
                <button
                  onClick={onRestart}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Reiniciar
                </button>
                <button
                  onClick={onDisconnect}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <WifiOff className="w-3 h-3 mr-1" />
                  )}
                  Desconectar
                </button>
              </>
            )}
            
            {(status === 'initializing' || status === 'qr_code') && (
              <button
                onClick={onDisconnect}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppStatus;