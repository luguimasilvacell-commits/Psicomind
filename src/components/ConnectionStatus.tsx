import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react'
import { isOnline, checkSupabaseConnection, setupNetworkMonitoring } from '../lib/supabaseUtils'
import { toast } from 'sonner'

interface ConnectionStatusProps {
  className?: string
  showText?: boolean
}

export default function ConnectionStatus({ className = '', showText = true }: ConnectionStatusProps) {
  const [isNetworkOnline, setIsNetworkOnline] = useState(isOnline())
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Verificar conexão com Supabase periodicamente
  const checkConnection = async () => {
    if (!isNetworkOnline) {
      setIsSupabaseConnected(false)
      return
    }

    setIsChecking(true)
    try {
      const connected = await checkSupabaseConnection()
      setIsSupabaseConnected(connected)
    } catch (error) {
      setIsSupabaseConnected(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Verificar conexão inicial
    checkConnection()

    // Configurar monitoramento de rede
    const cleanup = setupNetworkMonitoring()

    // Verificar conexão periodicamente
    const interval = setInterval(checkConnection, 30000) // A cada 30 segundos

    // Listener para mudanças de rede
    const handleOnline = () => {
      setIsNetworkOnline(true)
      checkConnection()
    }

    const handleOffline = () => {
      setIsNetworkOnline(false)
      setIsSupabaseConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cleanup()
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getStatusInfo = () => {
    if (!isNetworkOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        text: 'Sem conexão',
        description: 'Verifique sua conexão com a internet'
      }
    }

    if (isChecking) {
      return {
        icon: AlertCircle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        text: 'Verificando...',
        description: 'Testando conexão com servidor'
      }
    }

    if (isSupabaseConnected === false) {
      return {
        icon: AlertCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        text: 'Servidor indisponível',
        description: 'Problemas de conexão com o servidor'
      }
    }

    if (isSupabaseConnected === true) {
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: 'Conectado',
        description: 'Conexão estável com o servidor'
      }
    }

    return {
      icon: Wifi,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      text: 'Verificando...',
      description: 'Verificando status da conexão'
    }
  }

  const status = getStatusInfo()
  const Icon = status.icon

  const handleClick = () => {
    checkConnection()
    toast.info('Verificando conexão...')
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${status.bgColor} ${status.borderColor} ${className}`}
      onClick={handleClick}
      title={status.description}
    >
      <Icon className={`h-4 w-4 ${status.color} ${isChecking ? 'animate-pulse' : ''}`} />
      {showText && (
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      )}
    </div>
  )
}

// Componente compacto para a barra de navegação
export function ConnectionIndicator() {
  return <ConnectionStatus className="ml-auto" showText={false} />
}

// Hook para usar o status de conexão em outros componentes
export function useConnectionStatus() {
  const [isNetworkOnline, setIsNetworkOnline] = useState(isOnline())
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      if (!isNetworkOnline) {
        setIsSupabaseConnected(false)
        return
      }

      try {
        const connected = await checkSupabaseConnection()
        setIsSupabaseConnected(connected)
      } catch (error) {
        setIsSupabaseConnected(false)
      }
    }

    checkConnection()

    const handleOnline = () => {
      setIsNetworkOnline(true)
      checkConnection()
    }

    const handleOffline = () => {
      setIsNetworkOnline(false)
      setIsSupabaseConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(checkConnection, 60000) // A cada minuto

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isNetworkOnline])

  return {
    isNetworkOnline,
    isSupabaseConnected,
    isConnected: isNetworkOnline && isSupabaseConnected === true
  }
}