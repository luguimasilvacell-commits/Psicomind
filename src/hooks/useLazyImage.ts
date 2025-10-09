import { useEffect, useRef, useState } from 'react';
import { performanceManager } from '../utils/performanceOptimizations';

interface UseLazyImageOptions {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export const useLazyImage = (options: UseLazyImageOptions) => {
  const { src, placeholder = '', threshold = 0.1, rootMargin = '50px' } = options;
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    // Verificar se Intersection Observer é suportado
    if (!('IntersectionObserver' in window)) {
      // Fallback: carregar imagem imediatamente
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Criar nova imagem para preload
            const img = new Image();
            
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              observer.unobserve(imgElement);
            };
            
            img.onerror = () => {
              setIsError(true);
              observer.unobserve(imgElement);
            };
            
            img.src = src;
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgElement);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  return {
    imgRef,
    src: imageSrc,
    isLoaded,
    isError,
  };
};

// Hook para múltiplas imagens
export const useLazyImages = (images: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  const loadImage = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        resolve();
      };
      
      img.onerror = () => {
        setErrorImages(prev => new Set(prev).add(src));
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  };

  const preloadImages = async () => {
    const promises = images.map(loadImage);
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  };

  useEffect(() => {
    preloadImages();
  }, [images]);

  return {
    loadedImages,
    errorImages,
    isImageLoaded: (src: string) => loadedImages.has(src),
    isImageError: (src: string) => errorImages.has(src),
  };
};

// Hook para otimização de imagens baseada na conexão
export const useAdaptiveImageQuality = () => {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      const updateQuality = () => {
        const { effectiveType, saveData } = connection;
        
        if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
          setQuality('low');
        } else if (effectiveType === '3g') {
          setQuality('medium');
        } else {
          setQuality('high');
        }
      };

      updateQuality();
      connection.addEventListener('change', updateQuality);

      return () => {
        connection.removeEventListener('change', updateQuality);
      };
    }
  }, []);

  const getOptimizedSrc = (baseSrc: string) => {
    // Assumindo que você tem diferentes qualidades de imagem
    // Exemplo: image.jpg, image_medium.jpg, image_low.jpg
    const extension = baseSrc.split('.').pop();
    const baseName = baseSrc.replace(`.${extension}`, '');

    switch (quality) {
      case 'low':
        return `${baseName}_low.${extension}`;
      case 'medium':
        return `${baseName}_medium.${extension}`;
      default:
        return baseSrc;
    }
  };

  return {
    quality,
    getOptimizedSrc,
  };
};