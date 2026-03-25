import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  BarChart3,
  LogOut,
  Send,
  Loader2,
  Sparkles,
  Target,
  Activity,
  DollarSign
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchChatHistory();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, insightsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/insights`)
      ]);
      
      setStats(statsRes.data);
      setInsights(insightsRes.data.insights || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history`);
      setChatHistory(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');

    // Add user message to UI immediately
    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, tempUserMsg]);

    try {
      const response = await axios.post(`${API}/chat/message`, {
        content: userMessage
      });

      // Add AI response to UI
      setChatHistory(prev => [...prev, response.data.message]);

      // Show actions detected
      if (response.data.actions && response.data.actions.length > 0) {
        toast({
          title: 'Ações detectadas!',
          description: `Identifiquei ${response.data.actions.length} ação(s) na sua mensagem`
        });
      }

      // Refresh stats
      fetchDashboardData();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
              Dashboard
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
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
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {loadingStats ? (
            <div className="col-span-4 text-center text-slate-400">Carregando estatísticas...</div>
          ) : (
            <>
              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">Tarefas Concluídas</div>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white">{stats?.tasks_completed || 0}</div>
                <div className="text-xs text-slate-500 mt-1">{stats?.tasks_pending || 0} pendentes</div>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">Produtividade</div>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold text-white">{stats?.productivity_score || 0}%</div>
                <div className="text-xs text-cyan-400 mt-1">Score atual</div>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">Hábitos Ativos</div>
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white">{stats?.habits_active || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Média: {stats?.habits_streak_avg || 0} dias</div>
              </Card>

              <Card className="bg-slate-800/30 border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">Saldo</div>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white">
                  R$ {(stats?.finances_balance || 0).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Balanço atual</div>
              </Card>
            </>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Insights
            </h2>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Card 
                  key={index} 
                  className={`p-4 ${
                    insight.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                    insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <p className={`text-sm ${
                    insight.type === 'success' ? 'text-green-400' :
                    insight.type === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {insight.message}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Chat IA */}
        <Card className="bg-slate-800/30 border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            Chat com Alfred
          </h2>

          {/* Chat History */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Converse comigo! Posso ajudar a organizar tarefas, hábitos e muito mais.</p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                        : 'bg-slate-900/50 border border-slate-700/30 text-slate-300'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-white">{user?.name?.[0]}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem... (Ex: Preciso fazer um relatório até sexta)"
              className="bg-slate-900/50 border-slate-700 text-white resize-none"
              rows={2}
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !message.trim()}
              className="bg-cyan-500 hover:bg-cyan-600 text-white self-end"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
