import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    // Plugin para análise de bundle
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  // Otimizações de build
  build: {
    // Aumentar limite de chunk warning
    chunkSizeWarningLimit: 1000,
    
    // Configurações de rollup para otimização
    rollupOptions: {
      output: {
        // Code splitting manual para bibliotecas grandes
        manualChunks: {
          // Vendor chunk para React e bibliotecas relacionadas
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries chunk
          'ui-vendor': [
            'lucide-react',
            'sonner',
            '@headlessui/react',
            'date-fns'
          ],
          
          // Query e state management
          'state-vendor': [
            '@tanstack/react-query',
            'zustand'
          ],
          
          // Utilities chunk
          'utils-vendor': [
            'clsx',
            'tailwind-merge'
          ]
        },
        
        // Nomeação consistente dos chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const fileName = facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            return `chunks/${fileName}-[hash].js`
          }
          return 'chunks/[name]-[hash].js'
        },
        
        // Nomeação dos assets
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`
          }
          
          if (/css/i.test(ext || '')) {
            return `assets/css/[name]-[hash][extname]`
          }
          
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    
    // Configurações de minificação
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
    
    // Source maps apenas em desenvolvimento
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Target para melhor compatibilidade
    target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'lucide-react',
      'sonner',
      'date-fns',
      'clsx'
    ],
    exclude: [
      // Excluir dependências que devem ser carregadas dinamicamente
    ]
  },
  
  // Configurações de performance
  esbuild: {
    // Remover console.log em produção
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  }
})
