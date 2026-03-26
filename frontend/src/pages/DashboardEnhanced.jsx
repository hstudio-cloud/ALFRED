import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  DollarSign,
  Activity,
  Calendar,
  LogOut,
  Building2,
  ArrowUp,
  ArrowDown,
  Target,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

const DashboardEnhanced = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [tasksStats, setTasksStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      fetchAllStats();
    }
  }, [currentWorkspace]);

  const fetchAllStats = async () => {
    if (!currentWorkspace) return;
    
    try {
      const [dashboardRes, tasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/tasks-enhanced/stats?workspace_id=${currentWorkspace.id}`)
      ]);
      
      setStats(dashboardRes.data);
      setTasksStats(tasksRes.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Prepare data for charts
  const tasksByStageData = tasksStats ? [
    { name: 'A Fazer', value: tasksStats.stages.todo, color: '#64748b' },
    { name: 'Em Progresso', value: tasksStats.stages.in_progress, color: '#3b82f6' },
    { name: 'Revisão', value: tasksStats.stages.review, color: '#8b5cf6' },
    { name: 'Concluído', value: tasksStats.stages.done, color: '#22c55e' }
  ] : [];

  const priorityData = tasksStats ? [
    { name: 'Baixa', value: tasksStats.priorities.low },
    { name: 'Média', value: tasksStats.priorities.medium },
    { name: 'Alta', value: tasksStats.priorities.high },
    { name: 'Urgente', value: tasksStats.priorities.urgent }
  ] : [];

  // Mock productivity data for line chart
  const productivityData = [
    { day: 'Seg', tasks: 8, completed: 6 },
    { day: 'Ter', tasks: 10, completed: 8 },
    { day: 'Qua', tasks: 12, completed: 10 },
    { day: 'Qui', tasks: 9, completed: 9 },
    { day: 'Sex', tasks: 11, completed: 8 },
    { day: 'Sáb', tasks: 5, completed: 4 },
    { day: 'Dom', tasks: 3, completed: 3 }
  ];

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Alfred
            </h1>
            <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              Analytics
            </Badge>
            {currentWorkspace && (
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                <Building2 className="w-3 h-3 mr-1" />
                {currentWorkspace.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-cyan-400"
            >
              ← Voltar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-cyan-400 text-sm font-semibold">Taxa de Conclusão</div>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  {tasksStats?.completion_rate || 0}%
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <ArrowUp className="w-3 h-3" />
                  <span>+12% vs semana passada</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-purple-400 text-sm font-semibold">Total de Tarefas</div>
                  <CheckSquare className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  {tasksStats?.total || 0}
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-400">
                  <Target className="w-3 h-3" />
                  <span>{tasksStats?.completed || 0} concluídas</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-orange-400 text-sm font-semibold">Produtividade</div>
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  {stats?.productivity_score || 0}%
                </div>
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <Activity className="w-3 h-3" />
                  <span>Score atual</span>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-green-400 text-sm font-semibold">Saldo</div>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  R$ {(stats?.finances_balance || 0).toFixed(2)}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <ArrowUp className="w-3 h-3" />
                  <span>Balanço atual</span>
                </div>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tasks by Stage - Pie Chart */}
              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Tarefas por Estágio
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tasksByStageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tasksByStageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Priority Distribution - Bar Chart */}
              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Distribuição por Prioridade
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid md:grid-cols-1 gap-6">
              {/* Productivity Trend - Area Chart */}
              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Produtividade Semanal
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={productivityData}>
                    <defs>
                      <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="tasks" 
                      stroke="#06b6d4" 
                      fillOpacity={1} 
                      fill="url(#colorTasks)" 
                      name="Tarefas Criadas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#22c55e" 
                      fillOpacity={1} 
                      fill="url(#colorCompleted)" 
                      name="Concluídas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Activity Summary */}
            <Card className="bg-slate-800/30 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Resumo de Atividades
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Clientes Ativos</span>
                    <span className="text-white font-semibold">12</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Projetos em Andamento</span>
                    <span className="text-white font-semibold">5</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Hábitos Mantidos</span>
                    <span className="text-white font-semibold">{stats?.habits_active || 0}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardEnhanced;
