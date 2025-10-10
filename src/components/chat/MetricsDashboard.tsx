import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  MessageSquare, 
  Users, 
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useIntegration } from '../../hooks/useIntegration';
import { useChat } from '../../hooks/useChat';
import { AutomationMetric } from '../../types/chat';

interface MetricsData {
  totalMessages: number;
  totalConversations: number;
  activeAutomations: number;
  responseTime: number;
  successRate: number;
  messagesByDay: Array<{ date: string; count: number }>;
  automationsByType: Array<{ type: string; count: number; color: string }>;
  responseTimeHistory: Array<{ date: string; time: number }>;
  conversationsByStatus: Array<{ status: string; count: number; color: string }>;
}

const MetricsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metricsData, setMetricsData] = useState<MetricsData>({
    totalMessages: 0,
    totalConversations: 0,
    activeAutomations: 0,
    responseTime: 0,
    successRate: 0,
    messagesByDay: [],
    automationsByType: [],
    responseTimeHistory: [],
    conversationsByStatus: []
  });

  const { metrics, loading: metricsLoading } = useIntegration();
  const { conversations, messages } = useChat();

  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Processar dados das métricas
  useEffect(() => {
    const processMetrics = () => {
      // Calcular estatísticas básicas
      const totalMessages = messages.length;
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.status === 'active').length;

      // Processar métricas de automação
      const responseTimeMetrics = metrics.filter(m => m.metric_type === 'response_time');
      const successRateMetrics = metrics.filter(m => m.metric_type === 'success_rate');
      
      const avgResponseTime = responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.metric_value, 0) / responseTimeMetrics.length
        : 0;

      const avgSuccessRate = successRateMetrics.length > 0
        ? successRateMetrics.reduce((sum, m) => sum + m.metric_value, 0) / successRateMetrics.length
        : 0;

      // Mensagens por dia (últimos 7 dias)
      const messagesByDay = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayMessages = messages.filter(m => 
          m.created_at.startsWith(dateStr)
        ).length;

        return {
          date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          count: dayMessages
        };
      }).reverse();

      // Automações por tipo
      const automationsByType = [
        { type: 'Palavra-chave', count: 15, color: COLORS[0] },
        { type: 'Webhook', count: 8, color: COLORS[1] },
        { type: 'Agendada', count: 5, color: COLORS[2] }
      ];

      // Histórico de tempo de resposta
      const responseTimeHistory = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return {
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          time: Math.floor(Math.random() * 1000) + 500 // Dados simulados
        };
      }).reverse();

      // Conversas por status
      const conversationsByStatus = [
        { 
          status: 'Ativas', 
          count: conversations.filter(c => c.status === 'active').length,
          color: COLORS[0]
        },
        { 
          status: 'Pausadas', 
          count: conversations.filter(c => c.status === 'paused').length,
          color: COLORS[1]
        },
        { 
          status: 'Encerradas', 
          count: conversations.filter(c => c.status === 'closed').length,
          color: COLORS[2]
        }
      ];

      setMetricsData({
        totalMessages,
        totalConversations,
        activeAutomations: activeConversations,
        responseTime: avgResponseTime,
        successRate: avgSuccessRate,
        messagesByDay,
        automationsByType,
        responseTimeHistory,
        conversationsByStatus
      });
    };

    processMetrics();
  }, [messages, conversations, metrics, timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dashboard de Métricas</h2>
            <p className="text-gray-600">Acompanhe o desempenho das suas automações</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Mensagens</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(metricsData.totalMessages)}
                </p>
                {getChangeIndicator(metricsData.totalMessages, metricsData.totalMessages * 0.9)}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(metricsData.activeAutomations)}
                </p>
                {getChangeIndicator(metricsData.activeAutomations, metricsData.activeAutomations * 0.85)}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo de Resposta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metricsData.responseTime.toFixed(0)}ms
                </p>
                {getChangeIndicator(metricsData.responseTime, metricsData.responseTime * 1.1)}
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metricsData.successRate.toFixed(1)}%
                </p>
                {getChangeIndicator(metricsData.successRate, metricsData.successRate * 0.95)}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mensagens por Dia */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsData.messagesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tempo de Resposta */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo de Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricsData.responseTimeHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}ms`, 'Tempo de Resposta']} />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Automações por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Automações por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metricsData.automationsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metricsData.automationsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status das Conversas */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricsData.conversationsByStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{item.count}</span>
                    <Badge variant="outline">
                      {((item.count / metricsData.totalConversations) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Métrica</th>
                  <th className="text-left py-2">Valor</th>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 10).map((metric) => (
                  <tr key={metric.id} className="border-b">
                    <td className="py-2 capitalize">
                      {metric.metric_type.replace('_', ' ')}
                    </td>
                    <td className="py-2 font-medium">
                      {metric.metric_value}
                      {metric.metric_type === 'response_time' && 'ms'}
                      {metric.metric_type === 'success_rate' && '%'}
                    </td>
                    <td className="py-2 text-gray-600">
                      {new Date(metric.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline">
                        {metric.automation_id ? 'Automação' : 'Sistema'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsDashboard;