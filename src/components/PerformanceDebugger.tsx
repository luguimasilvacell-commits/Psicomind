import React, { useState } from 'react';
import { usePerformanceMonitor, useResourceMonitor } from '../hooks/usePerformanceMonitor';
import { Activity, Clock, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface PerformanceDebuggerProps {
  enabled?: boolean;
}

export const PerformanceDebugger: React.FC<PerformanceDebuggerProps> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'resources' | 'memory'>('vitals');
  
  const { metrics, isSupported, performanceScore, formatMetric, reportMetrics } = usePerformanceMonitor();
  const { resources, getSlowResources } = useResourceMonitor();

  if (!enabled || !isSupported) return null;

  const getScoreIcon = (score: string) => {
    switch (score) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const slowResources = getSlowResources(500);

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Performance Debugger"
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* Modal do debugger */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Performance Debugger</h2>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getScoreColor(performanceScore)}`}>
                  {getScoreIcon(performanceScore)}
                  <span className="capitalize">{performanceScore.replace('-', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reportMetrics}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Export Metrics
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {[
                { id: 'vitals', label: 'Core Web Vitals', icon: Zap },
                { id: 'resources', label: 'Resources', icon: Clock },
                { id: 'memory', label: 'Memory', icon: Activity },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {activeTab === 'vitals' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* LCP */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Largest Contentful Paint</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.lcp)}</div>
                      <div className="text-xs text-gray-500">Good: &lt; 2.5s</div>
                    </div>

                    {/* FID */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">First Input Delay</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.fid)}</div>
                      <div className="text-xs text-gray-500">Good: &lt; 100ms</div>
                    </div>

                    {/* CLS */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Cumulative Layout Shift</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.cls, '')}</div>
                      <div className="text-xs text-gray-500">Good: &lt; 0.1</div>
                    </div>

                    {/* FCP */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">First Contentful Paint</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.fcp)}</div>
                      <div className="text-xs text-gray-500">Good: &lt; 1.8s</div>
                    </div>

                    {/* TTFB */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Time to First Byte</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.ttfb)}</div>
                      <div className="text-xs text-gray-500">Good: &lt; 800ms</div>
                    </div>

                    {/* DOM Content Loaded */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">DOM Content Loaded</div>
                      <div className="text-lg font-semibold">{formatMetric(metrics.domContentLoaded)}</div>
                      <div className="text-xs text-gray-500">Time to interactive</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      Slow Resources (&gt; 500ms)
                    </h3>
                    <span className="text-sm text-gray-500">
                      {slowResources.length} of {resources.length} resources
                    </span>
                  </div>

                  {slowResources.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>All resources loaded quickly!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slowResources.slice(0, 10).map((resource, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {resource.name.split('/').pop()}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {resource.name}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-red-600">
                            {Math.round(resource.duration)}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Used JS Heap</div>
                      <div className="text-lg font-semibold">
                        {formatMetric(metrics.usedJSHeapSize, 'bytes')}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Total JS Heap</div>
                      <div className="text-lg font-semibold">
                        {formatMetric(metrics.totalJSHeapSize, 'bytes')}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">JS Heap Limit</div>
                      <div className="text-lg font-semibold">
                        {formatMetric(metrics.jsHeapSizeLimit, 'bytes')}
                      </div>
                    </div>
                  </div>

                  {metrics.usedJSHeapSize && metrics.totalJSHeapSize && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">Memory Usage</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(metrics.usedJSHeapSize / metrics.totalJSHeapSize) * 100}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((metrics.usedJSHeapSize / metrics.totalJSHeapSize) * 100).toFixed(1)}% used
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};