/**
 * Hook para gerenciar funcionalidades PWA
 */
import { useState, useEffect } from 'react'

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isUpdateAvailable: boolean
  isLoading: boolean
}

interface PWAActions {
  installApp: () => Promise<void>
  updateApp: () => Promise<void>
  clearCache: () => Promise<void>
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isLoading: true
  })

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Verificar se é PWA instalado
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInstalled = isStandalone || isInWebAppiOS
      
      setState(prev => ({ ...prev, isInstalled }))
    }

    // Registrar Service Worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js')
          setRegistration(reg)
          
          console.log('[PWA] Service Worker registrado:', reg)
          
          // Verificar atualizações
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }))
                }
              })
            }
          })
          
          // Verificar se há um service worker aguardando
          if (reg.waiting) {
            setState(prev => ({ ...prev, isUpdateAvailable: true }))
          }
          
        } catch (error) {
          console.error('[PWA] Erro ao registrar Service Worker:', error)
        }
      }
      
      setState(prev => ({ ...prev, isLoading: false }))
    }

    // Event listeners
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState(prev => ({ ...prev, isInstallable: true }))
    }

    const handleAppInstalled = () => {
      console.log('[PWA] App instalado')
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }))
      setDeferredPrompt(null)
    }

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    // Adicionar event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Inicializar
    checkIfInstalled()
    registerServiceWorker()

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      throw new Error('App não pode ser instalado no momento')
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou a instalação')
      } else {
        console.log('[PWA] Usuário rejeitou a instalação')
      }
      
      setDeferredPrompt(null)
      setState(prev => ({ ...prev, isInstallable: false }))
    } catch (error) {
      console.error('[PWA] Erro ao instalar app:', error)
      throw error
    }
  }

  const updateApp = async (): Promise<void> => {
    if (!registration || !registration.waiting) {
      throw new Error('Nenhuma atualização disponível')
    }

    try {
      // Enviar mensagem para o service worker para pular a espera
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Aguardar o novo service worker assumir o controle
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
          resolve()
        }
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      })
      
      setState(prev => ({ ...prev, isUpdateAvailable: false }))
      
      // Recarregar a página para aplicar as atualizações
      window.location.reload()
    } catch (error) {
      console.error('[PWA] Erro ao atualizar app:', error)
      throw error
    }
  }

  const clearCache = async (): Promise<void> => {
    if (!registration) {
      throw new Error('Service Worker não registrado')
    }

    try {
      // Enviar mensagem para limpar cache
      const messageChannel = new MessageChannel()
      
      await new Promise<void>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          } else {
            reject(new Error('Erro ao limpar cache'))
          }
        }
        
        registration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        )
      })
      
      console.log('[PWA] Cache limpo com sucesso')
    } catch (error) {
      console.error('[PWA] Erro ao limpar cache:', error)
      throw error
    }
  }

  return {
    ...state,
    installApp,
    updateApp,
    clearCache
  }
}

/**
 * Hook para detectar se o app está sendo executado como PWA
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInWebAppChrome = window.matchMedia('(display-mode: minimal-ui)').matches
      
      setIsPWA(isStandalone || isInWebAppiOS || isInWebAppChrome)
    }

    checkPWA()
    
    // Verificar mudanças no display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkPWA)
    
    return () => {
      mediaQuery.removeEventListener('change', checkPWA)
    }
  }, [])

  return isPWA
}

/**
 * Hook para gerenciar notificações push
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      throw new Error('Notificações não suportadas')
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    
    return result === 'granted'
  }

  const subscribe = async (): Promise<PushSubscription> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications não suportadas')
    }

    const registration = await navigator.serviceWorker.ready
    
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
    })
    
    setSubscription(sub)
    return sub
  }

  const unsubscribe = async (): Promise<void> => {
    if (subscription) {
      await subscription.unsubscribe()
      setSubscription(null)
    }
  }

  return {
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  }
}