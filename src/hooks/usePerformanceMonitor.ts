import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  
  // Outras métricas importantes
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Métricas de memória
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  
  // Métricas de navegação
  domContentLoaded?: number;
  loadComplete?: number;
}

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar suporte do browser
    const supported = 'performance' in window && 'PerformanceObserver' in window;
    setIsSupported(supported);

    if (!supported) return;

    // Observer para Core Web Vitals
    const observeWebVitals = () => {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          fcpObserver.disconnect();
        };
      } catch (error) {
        console.warn('Erro ao configurar Performance Observer:', error);
      }
    };

    // Métricas de navegação
    const getNavigationMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          ttfb: navigation.responseStart - navigation.requestStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        }));
      }
    };

    // Métricas de memória
    const getMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        }));
      }
    };

    // Executar observadores
    const cleanup = observeWebVitals();
    
    // Aguardar carregamento completo para métricas de navegação
    if (document.readyState === 'complete') {
      getNavigationMetrics();
    } else {
      window.addEventListener('load', getNavigationMetrics);
    }

    // Atualizar métricas de memória periodicamente
    const memoryInterval = setInterval(getMemoryMetrics, 5000);

    return () => {
      cleanup?.();
      window.removeEventListener('load', getNavigationMetrics);
      clearInterval(memoryInterval);
    };
  }, []);

  // Função para avaliar performance
  const getPerformanceScore = (): 'good' | 'needs-improvement' | 'poor' => {
    const { lcp, fid, cls } = metrics;
    
    let score = 0;
    let total = 0;

    if (lcp !== undefined) {
      total++;
      if (lcp <= 2500) score++;
      else if (lcp <= 4000) score += 0.5;
    }

    if (fid !== undefined) {
      total++;
      if (fid <= 100) score++;
      else if (fid <= 300) score += 0.5;
    }

    if (cls !== undefined) {
      total++;
      if (cls <= 0.1) score++;
      else if (cls <= 0.25) score += 0.5;
    }

    if (total === 0) return 'good';

    const percentage = score / total;
    if (percentage >= 0.8) return 'good';
    if (percentage >= 0.5) return 'needs-improvement';
    return 'poor';
  };

  // Função para formatar métricas
  const formatMetric = (value: number | undefined, unit: string = 'ms'): string => {
    if (value === undefined) return 'N/A';
    
    if (unit === 'bytes') {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(value) / Math.log(1024));
      return `${(value / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
    
    return `${Math.round(value)}${unit}`;
  };

  // Função para reportar métricas para analytics (placeholder)
  const reportMetrics = () => {
    if (process.env.NODE_ENV === 'production') {
      // Aqui você pode enviar métricas para seu serviço de analytics
      console.log('Performance Metrics:', metrics);
    }
  };

  return {
    metrics,
    isSupported,
    performanceScore: getPerformanceScore(),
    formatMetric,
    reportMetrics,
  };
};

// Hook para monitorar recursos específicos
export const useResourceMonitor = () => {
  const [resources, setResources] = useState<PerformanceEntry[]>([]);

  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      setResources(prev => [...prev, ...entries]);
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, []);

  const getSlowResources = (threshold: number = 1000) => {
    return resources.filter(resource => resource.duration > threshold);
  };

  const getResourcesByType = (type: string) => {
    return resources.filter(resource => resource.name.includes(type));
  };

  return {
    resources,
    getSlowResources,
    getResourcesByType,
  };
};