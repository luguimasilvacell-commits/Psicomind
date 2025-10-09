/**
 * Componente para gerenciar notificações PWA
 */
import { useState, useEffect } from 'react'
import { usePWA } from '../hooks/usePWA'
import { Download, RefreshCw, Wifi, WifiOff, X, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

export function PWANotifications() {
  const {
    isInstallable,
    isOnline,
    isUpdateAvailable,
    installApp,
    updateApp
  } = usePWA()

  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  useEffect(() => {
    if (isInstallable) {
      setShowInstallBanner(true)
    }
  }, [isInstallable])

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowUpdateBanner(true)
    }
  }, [isUpdateAvailable])

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineBanner(true)
      toast.warning('Você está offline. Algumas funcionalidades podem estar limitadas.')
    } else {
      setShowOfflineBanner(false)
      if (showOfflineBanner) {
        toast.success('Conexão restaurada!')
      }
    }
  }, [isOnline, showOfflineBanner])

  const handleInstall = async () => {
    try {
      await installApp()
      setShowInstallBanner(false)
      toast.success('App instalado com sucesso!')
    } catch (error) {
      console.error('Erro ao instalar:', error)
      toast.error('Erro ao instalar o app')
    }
  }

  const handleUpdate = async () => {
    try {
      await updateApp()
      setShowUpdateBanner(false)
      toast.success('App atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar o app')
    }
  }

  return (
    <>
      {/* Banner de Instalação */}
      {showInstallBanner && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Instalar Psicomind</h3>
                <p className="text-sm opacity-90">
                  Instale o app para acesso rápido e funcionalidades offline
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstall}
                className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Instalar</span>
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-white hover:bg-white/20 p-2 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Atualização */}
      {showUpdateBanner && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Atualização Disponível</h3>
                <p className="text-sm opacity-90">
                  Uma nova versão do app está disponível
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpdate}
                className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className="text-white hover:bg-white/20 p-2 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Status de Conexão */}
      <div className="fixed bottom-4 right-4 z-40">
        {!isOnline && (
          <div className="bg-red-500 text-white p-3 rounded-full shadow-lg animate-pulse">
            <WifiOff className="h-5 w-5" />
          </div>
        )}
        {isOnline && showOfflineBanner && (
          <div className="bg-green-500 text-white p-3 rounded-full shadow-lg animate-in zoom-in-50 duration-300">
            <Wifi className="h-5 w-5" />
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Componente para exibir informações PWA no menu de configurações
 */
export function PWASettings() {
  const {
    isInstalled,
    isOnline,
    isUpdateAvailable,
    installApp,
    updateApp,
    clearCache
  } = usePWA()

  const handleClearCache = async () => {
    try {
      await clearCache()
      toast.success('Cache limpo com sucesso!')
    } catch (error) {
      console.error('Erro ao limpar cache:', error)
      toast.error('Erro ao limpar cache')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configurações PWA</h3>
      
      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isInstalled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isInstalled ? 'Instalado' : 'Não Instalado'}
            </span>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-2">
        {!isInstalled && (
          <button
            onClick={installApp}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Instalar App</span>
          </button>
        )}
        
        {isUpdateAvailable && (
          <button
            onClick={updateApp}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar App</span>
          </button>
        )}
        
        <button
          onClick={handleClearCache}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Limpar Cache
        </button>
      </div>

      {/* Informações */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• O app pode ser usado offline após a instalação</p>
        <p>• Dados são sincronizados quando a conexão é restaurada</p>
        <p>• Limpar o cache pode melhorar a performance</p>
      </div>
    </div>
  )
}