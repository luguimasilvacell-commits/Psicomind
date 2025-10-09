import React from 'react';
import { useLazyImage, useAdaptiveImageQuality } from '../../hooks/useLazyImage';
import { cn } from '../../utils/cn';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  lazy?: boolean;
  adaptive?: boolean;
  fallback?: string;
  containerClassName?: string;
  threshold?: number;
  rootMargin?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiNjY2MiPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  lazy = true,
  adaptive = true,
  fallback,
  containerClassName,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  onLoad,
  onError,
  ...props
}) => {
  const { getOptimizedSrc } = useAdaptiveImageQuality();
  
  // Determinar a src final baseada nas otimizações
  const finalSrc = adaptive ? getOptimizedSrc(src) : src;
  
  const {
    imgRef,
    src: displaySrc,
    isLoaded,
    isError,
  } = useLazyImage({
    src: lazy ? finalSrc : finalSrc,
    placeholder: lazy ? placeholder : finalSrc,
    threshold,
    rootMargin,
  });

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(event);
  };

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (fallback && !isError) {
      // Tentar carregar imagem de fallback
      const img = event.target as HTMLImageElement;
      img.src = fallback;
    }
    onError?.(event);
  };

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          {
            'opacity-0': lazy && !isLoaded && !isError,
            'opacity-100': !lazy || isLoaded || isError,
          },
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Loading skeleton */}
      {lazy && !isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Carregando...</div>
        </div>
      )}
      
      {/* Error state */}
      {isError && !fallback && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center">
            <div className="mb-2">⚠️</div>
            <div>Erro ao carregar imagem</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para avatar otimizado
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  className?: string;
}

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallbackText,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const fallbackInitials = fallbackText || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!src) {
    return (
      <div className={cn(
        'rounded-full bg-gray-300 flex items-center justify-center font-medium text-gray-600',
        sizeClasses[size],
        className
      )}>
        {fallbackInitials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      containerClassName="rounded-full"
      fallback={`data:image/svg+xml;base64,${btoa(`
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#e5e7eb" rx="50"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
                font-family="system-ui" font-size="24px" fill="#6b7280">
            ${fallbackInitials}
          </text>
        </svg>
      `)}`}
    />
  );
};

// Componente para galeria de imagens otimizada
interface OptimizedGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
}

export const OptimizedGallery: React.FC<OptimizedGalleryProps> = ({
  images,
  columns = 3,
  gap = 4,
  className,
}) => {
  return (
    <div 
      className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1,
          'grid-cols-2': columns === 2,
          'grid-cols-3': columns === 3,
          'grid-cols-4': columns === 4,
        },
        className
      )}
      style={{ gap: `${gap * 0.25}rem` }}
    >
      {images.map((image, index) => (
        <div key={index} className="group">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
            containerClassName="rounded-lg overflow-hidden"
          />
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600 text-center">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};