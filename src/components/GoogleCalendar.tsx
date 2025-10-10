import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface GoogleCalendarProps {
  height?: number;
  className?: string;
  showHeader?: boolean;
  allowFullscreen?: boolean;
}

export const GoogleCalendar: React.FC<GoogleCalendarProps> = ({
  height = 600,
  className = '',
  showHeader = true,
  allowFullscreen = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const calendarUrl = "https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FSao_Paulo&showPrint=0&src=bHVndWltYXNpbHZhY2VsbEBnbWFpbC5jb20&src=ZmFtaWx5MTY3OTQwNzc1MDMwMzA4NzYwODNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=cHQuYnJhemlsaWFuI2hvbGlkYXlAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%23039be5&color=%23e67c73&color=%237986cb";

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    window.open(calendarUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      } ${className}`}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Calendário Google</h3>
              <p className="text-sm text-gray-600">Visualize e gerencie seus agendamentos</p>
            </div>
          </div>
          
          {allowFullscreen && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openInNewTab}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-4 w-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600">Carregando calendário...</p>
          </div>
        </div>
      )}

      {/* Calendar Container */}
      <div className="relative">
        <iframe
          src={calendarUrl}
          style={{ 
            border: 0,
            width: '100%',
            height: isFullscreen ? 'calc(100vh - 120px)' : `${height}px`
          }}
          frameBorder="0"
          scrolling="no"
          onLoad={handleIframeLoad}
          className="transition-all duration-300"
          title="Google Calendar"
        />
        
        {/* Overlay for better mobile experience */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Gradient overlay for better visual integration */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/20 to-transparent" />
        </div>
      </div>

      {/* Mobile-friendly controls */}
      <div className="md:hidden p-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Deslize para navegar no calendário
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openInNewTab}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Abrir App
          </motion.button>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleFullscreen}
        />
      )}
    </motion.div>
  );
};