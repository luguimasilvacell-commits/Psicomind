import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { PageLoader } from './components/ui/LazyLoader'
import { PWANotifications } from './components/PWANotifications'
import { PerformanceDebugger } from './components/PerformanceDebugger'
import { queryClient } from './lib/queryClient'

// Lazy load authentication pages (immediate load)
import Login from './pages/Login'
import Register from './pages/Register'

// Import Dashboard directly for testing
import Dashboard from './pages/Dashboard'

// Lazy load main pages
const Pacientes = React.lazy(() => import('./pages/Pacientes'))
const Agendamentos = React.lazy(() => import('./pages/Agendamentos'))
const Prontuarios = React.lazy(() => import('./pages/Prontuarios'))
const Financeiro = React.lazy(() => import('./pages/Financeiro'))
const SystemLogs = React.lazy(() => import('./pages/SystemLogs'))
const Relatorios = React.lazy(() => import('./pages/Relatorios'))

// Chat pages
const Chat = React.lazy(() => import('./pages/Chat'))
const Automations = React.lazy(() => import('./pages/Automations'))

// WhatsApp pages
const WhatsAppConfig = React.lazy(() => import('./pages/WhatsAppConfig'))
const WhatsAppChat = React.lazy(() => import('./pages/WhatsAppChat'))
const WhatsAppTemplates = React.lazy(() => import('./pages/WhatsAppTemplates'))

// Placeholder for configurations (not implemented yet)
const Configuracoes = React.lazy(() => 
  Promise.resolve({
    default: () => (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurações</h2>
        <p className="text-gray-600">Esta página está em desenvolvimento</p>
      </div>
    )
  })
)

export default function App() {
  const { initialize } = useAuthStore()

  React.useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pacientes" element={
              <PageLoader>
                <Pacientes />
              </PageLoader>
            } />
            <Route path="agendamentos" element={
              <PageLoader>
                <Agendamentos />
              </PageLoader>
            } />
            <Route path="prontuarios" element={
              <PageLoader>
                <Prontuarios />
              </PageLoader>
            } />
            <Route path="financeiro" element={
              <PageLoader>
                <Financeiro />
              </PageLoader>
            } />
            <Route path="/system-logs" element={
              <PageLoader>
                <SystemLogs />
              </PageLoader>
            } />
            <Route path="relatorios" element={
              <PageLoader>
                <Relatorios />
              </PageLoader>
            } />
            <Route path="chat" element={
              <PageLoader>
                <Chat />
              </PageLoader>
            } />
            <Route path="automations" element={
              <PageLoader>
                <Automations />
              </PageLoader>
            } />
            <Route path="whatsapp-config" element={
              <PageLoader>
                <WhatsAppConfig />
              </PageLoader>
            } />
            <Route path="whatsapp-chat" element={
              <PageLoader>
                <WhatsAppChat />
              </PageLoader>
            } />
            <Route path="whatsapp-templates" element={
              <PageLoader>
                <WhatsAppTemplates />
              </PageLoader>
            } />
            <Route path="configuracoes" element={
              <PageLoader>
                <Configuracoes />
              </PageLoader>
            } />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
      
      {/* PWA Notifications */}
      <PWANotifications />
      
      {/* Performance Debugger - apenas em desenvolvimento */}
      <PerformanceDebugger />
      
      {/* React Query DevTools - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
