import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useIntegration } from '../hooks/useIntegration';

interface ConnectionTestProps {
  service: 'n8n' | 'evolution' | 'both';
  config?: any;
  onConfigChange?: (config: any) => void;
  showConfig?: boolean;
}

interface TestResult {
  success: boolean;
  timestamp: string;
  results?: {
    n8n?: {
      success: boolean;
      status: string;
      responseTime?: string;
      message: string;
      details?: any;
      error?: string;
    };
    evolution?: {
      success: boolean;
      status: string;
      responseTime?: string;
      message: string;
      details?: any;
      error?: string;
    };
  };
  error?: string;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({
  service,
  config,
  onConfigChange,
  showConfig = false
}) => {
  const { testConnection, loading } = useIntegration();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestingN8n, setIsTestingN8n] = useState(false);
  const [isTestingEvolution, setIsTestingEvolution] = useState(false);

  const handleTest = async (testService: 'n8n' | 'evolution' | 'both') => {
    try {
      if (testService === 'n8n' || testService === 'both') {
        setIsTestingN8n(true);
      }
      if (testService === 'evolution' || testService === 'both') {
        setIsTestingEvolution(true);
      }

      const result = await testConnection(testService, config);
      setTestResult(result);
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setTestResult({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingN8n(false);
      setIsTestingEvolution(false);
    }
  };

  const getStatusIcon = (success: boolean, isLoading: boolean) => {
    if (isLoading) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const renderServiceResult = (serviceName: 'n8n' | 'evolution', result: any) => {
    if (!result) return null;

    const isLoading = serviceName === 'n8n' ? isTestingN8n : isTestingEvolution;

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(result.success, isLoading)}
            <h4 className="font-medium">
              {serviceName === 'n8n' ? 'n8n' : 'Evolution API'}
            </h4>
          </div>
          <span className={`text-sm font-medium ${getStatusColor(result.success)}`}>
            {result.status || (result.success ? 'Conectado' : 'Erro')}
          </span>
        </div>

        <div className="text-sm text-gray-600">
          <p>{result.message}</p>
          {result.responseTime && (
            <p className="text-xs text-gray-500 mt-1">
              Tempo de resposta: {result.responseTime}
            </p>
          )}
        </div>

        {result.details && (
          <div className="bg-gray-50 rounded p-3 text-xs">
            <h5 className="font-medium mb-2">Detalhes:</h5>
            {serviceName === 'n8n' && result.details.health && (
              <div className="space-y-1">
                <p>Status: {result.details.health.status}</p>
                <p>URL Base: {result.details.baseUrl}</p>
                <p>API Key: {result.details.hasApiKey ? 'Configurada' : 'Não configurada'}</p>
                {result.details.authentication && (
                  <p>
                    Autenticação: {result.details.authentication.success ? 'OK' : 'Falhou'}
                    {result.details.authentication.workflowCount !== undefined && 
                      ` (${result.details.authentication.workflowCount} workflows)`
                    }
                  </p>
                )}
              </div>
            )}
            {serviceName === 'evolution' && result.details.instance && (
              <div className="space-y-1">
                <p>Instância: {result.details.instance.name}</p>
                <p>Existe: {result.details.instance.exists ? 'Sim' : 'Não'}</p>
                <p>Total de instâncias: {result.details.instance.totalInstances}</p>
                {result.details.instance.status && (
                  <p>Status da instância: {JSON.stringify(result.details.instance.status)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {result.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Erro:</p>
                <p>{result.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Botões de teste */}
      <div className="flex flex-wrap gap-2">
        {(service === 'n8n' || service === 'both') && (
          <button
            onClick={() => handleTest('n8n')}
            disabled={loading || isTestingN8n}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingN8n ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>Testar n8n</span>
          </button>
        )}

        {(service === 'evolution' || service === 'both') && (
          <button
            onClick={() => handleTest('evolution')}
            disabled={loading || isTestingEvolution}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingEvolution ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>Testar Evolution API</span>
          </button>
        )}

        {service === 'both' && (
          <button
            onClick={() => handleTest('both')}
            disabled={loading || isTestingN8n || isTestingEvolution}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isTestingN8n || isTestingEvolution) ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>Testar Ambos</span>
          </button>
        )}
      </div>

      {/* Resultados dos testes */}
      {testResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Resultados do Teste</h3>
            <span className="text-sm text-gray-500">
              {new Date(testResult.timestamp).toLocaleString()}
            </span>
          </div>

          {testResult.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800">Erro Geral</h4>
                  <p className="text-red-700">{testResult.error}</p>
                </div>
              </div>
            </div>
          )}

          {testResult.results && (
            <div className="space-y-4">
              {testResult.results.n8n && renderServiceResult('n8n', testResult.results.n8n)}
              {testResult.results.evolution && renderServiceResult('evolution', testResult.results.evolution)}
            </div>
          )}

          {/* Status geral */}
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.success 
                  ? 'Todas as conexões estão funcionando' 
                  : 'Algumas conexões falharam'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;