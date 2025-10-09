// Utilitários para otimizações de performance

/**
 * Debounce function para otimizar eventos frequentes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function para limitar execução de funções
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy loading de imagens com Intersection Observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  
  constructor() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                this.observer?.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01,
        }
      );
    }
  }
  
  observe(element: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(element);
    } else {
      // Fallback para browsers sem suporte
      const src = element.dataset.src;
      if (src) {
        element.src = src;
        element.removeAttribute('data-src');
      }
    }
  }
  
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

/**
 * Preload de recursos críticos
 */
export const preloadResource = (href: string, as: string, type?: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  
  document.head.appendChild(link);
};

/**
 * Prefetch de recursos para navegação futura
 */
export const prefetchResource = (href: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  
  document.head.appendChild(link);
};

/**
 * Otimização de re-renders com memoização
 */
export const createMemoizedSelector = <T, R>(
  selector: (state: T) => R
) => {
  let lastArgs: T | undefined;
  let lastResult: R;
  
  return (state: T): R => {
    if (state !== lastArgs) {
      lastArgs = state;
      lastResult = selector(state);
    }
    return lastResult;
  };
};

/**
 * Virtual scrolling para listas grandes
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const calculateVirtualScrollItems = (
  scrollTop: number,
  totalItems: number,
  options: VirtualScrollOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    startIndex + visibleItemsCount + overscan * 2
  );
  
  return {
    startIndex,
    endIndex,
    visibleItemsCount,
    offsetY: startIndex * itemHeight,
  };
};

/**
 * Cache de recursos com TTL
 */
export class ResourceCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();
  
  set(key: string, data: T, ttl: number = 5 * 60 * 1000) { // 5 minutos default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

/**
 * Otimização de eventos de scroll
 */
export const createOptimizedScrollHandler = (
  callback: (scrollTop: number) => void,
  options: { throttle?: number; passive?: boolean } = {}
) => {
  const { throttle: throttleMs = 16, passive = true } = options;
  
  const throttledCallback = throttle(callback, throttleMs);
  
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    throttledCallback(target.scrollTop);
  };
  
  return {
    handler: handleScroll,
    options: { passive },
  };
};

/**
 * Detecção de dispositivos para otimizações específicas
 */
export const getDeviceCapabilities = () => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    // Capacidades de rede
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
    
    // Capacidades de hardware
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    deviceMemory: (navigator as any).deviceMemory || 0,
    
    // Preferências do usuário
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  };
};

/**
 * Otimização de animações baseada nas capacidades do dispositivo
 */
export const getOptimalAnimationSettings = () => {
  const capabilities = getDeviceCapabilities();
  
  // Reduzir animações em dispositivos com pouca memória ou conexão lenta
  const shouldReduceAnimations = 
    capabilities.prefersReducedMotion ||
    capabilities.deviceMemory < 4 ||
    capabilities.effectiveType === 'slow-2g' ||
    capabilities.effectiveType === '2g';
  
  return {
    duration: shouldReduceAnimations ? 0 : 300,
    easing: shouldReduceAnimations ? 'linear' : 'ease-out',
    enabled: !shouldReduceAnimations,
  };
};

/**
 * Singleton para gerenciar otimizações globais
 */
export class PerformanceManager {
  private static instance: PerformanceManager;
  private resourceCache = new ResourceCache();
  private lazyImageLoader = new LazyImageLoader();
  
  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }
  
  getCache() {
    return this.resourceCache;
  }
  
  getLazyImageLoader() {
    return this.lazyImageLoader;
  }
  
  cleanup() {
    this.resourceCache.clear();
    this.lazyImageLoader.disconnect();
  }
}

// Export da instância singleton
export const performanceManager = PerformanceManager.getInstance();