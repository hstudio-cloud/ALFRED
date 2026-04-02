import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CreditCard,
  Landmark,
  LogOut,
  MessageCircle,
  PiggyBank,
  Receipt,
  Send,
  Sparkles,
  Users,
  Wallet,
  Loader2,
  CheckSquare
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const paymentMethodLabels = {
  pix: 'Pix',
  card: 'Cartão',
  boleto: 'Boleto',
  transfer: 'Transferência',
  cash: 'Dinheiro',
  other: 'Outros'
};

const scopeLabels = {
  personal: 'Pessoal',
  business: 'Empresa'
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
      const [statsRes, insightsRes, summaryRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/insights`),
        axios.get(`${API}/finances/summary`),
        axios.get(`${API}/finances/transactions`)
      ]);

      setStats(statsRes.data);
      setInsights(insightsRes.data.insights || []);
      setFinanceSummary(summaryRes.data);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Erro ao carregar painel',
        description: 'Não consegui atualizar os dados financeiros agora.',
        variant: 'destructive'
      });
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

    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setChatHistory((prev) => [...prev, tempUserMsg]);

    try {
      const response = await axios.post(`${API}/chat/message`, {
        content: userMessage
      });

      setChatHistory((prev) => [...prev, response.data.message]);

      if (response.data.actions && response.data.actions.length > 0) {
        toast({
          title: 'Sugestões detectadas',
          description: `O Alfred identificou ${response.data.actions.length} ação(ões) na sua mensagem.`
        });
      }

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

  const recentTransactions = transactions.slice(0, 6);
  const accountScopes = financeSummary?.account_scopes || {};
  const paymentMethods = financeSummary?.payment_methods || {};
  const topCategories = financeSummary?.top_expense_categories || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)]">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">Alfred Finance OS</p>
              <h1 className="text-2xl font-semibold text-white">Central Financeira</h1>
            </div>
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              Pagamentos e gestão
            </Badge>
            {currentWorkspace && (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <Building2 className="mr-1 h-3 w-3" />
                {currentWorkspace.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/tasks')} className="text-slate-300 hover:text-white">
              <CheckSquare className="mr-2 h-4 w-4" />
              Tarefas
            </Button>
            <Button variant="ghost" onClick={() => navigate('/clients')} className="text-slate-300 hover:text-white">
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </Button>
            <Button variant="ghost" onClick={() => navigate('/analytics')} className="text-slate-300 hover:text-white">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loadingStats ? (
          <div className="py-16 text-center text-slate-400">Carregando sua central financeira...</div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/12 via-slate-900/80 to-slate-950 p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-4">
                    <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                      Visão consolidada
                    </Badge>
                    <div>
                      <p className="text-sm text-slate-300">Saldo disponível</p>
                      <h2 className="mt-2 text-4xl font-semibold text-white">
                        {currencyFormatter.format(financeSummary?.balance || 0)}
                      </h2>
                    </div>
                    <p className="max-w-xl text-sm leading-6 text-slate-300">
                      Acompanhe receitas, despesas e o que está acontecendo entre operação pessoal e empresa sem precisar sair do painel.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="mb-2 flex items-center gap-2 text-emerald-300">
                        <ArrowUpRight className="h-4 w-4" />
                        Receitas
                      </div>
                      <div className="text-2xl font-semibold text-white">
                        {currencyFormatter.format(financeSummary?.income || 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                      <div className="mb-2 flex items-center gap-2 text-rose-300">
                        <ArrowDownRight className="h-4 w-4" />
                        Despesas
                      </div>
                      <div className="text-2xl font-semibold text-white">
                        {currencyFormatter.format(financeSummary?.expenses || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  <h3 className="text-lg font-semibold text-white">Ações rápidas</h3>
                </div>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                    Registre gastos por mensagem: "paguei R$ 120 no cartão para marketing da empresa".
                  </div>
                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                    Crie lembretes financeiros: "me lembre do aluguel no dia 5".
                  </div>
                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                    Organize categorias vivas com base no seu uso diário, como Pix, cartão, assinaturas e equipe.
                  </div>
                </div>
              </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-slate-700/60 bg-slate-900/75 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Transações</span>
                  <Receipt className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="text-3xl font-semibold text-white">{financeSummary?.transactions_count || 0}</div>
                <p className="mt-2 text-xs text-slate-500">Movimentações registradas no painel</p>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Conta pessoal</span>
                  <Wallet className="h-5 w-5 text-blue-300" />
                </div>
                <div className="text-3xl font-semibold text-white">
                  {currencyFormatter.format(accountScopes.personal?.balance || 0)}
                </div>
                <p className="mt-2 text-xs text-slate-500">Entradas e saídas do dia a dia</p>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Conta empresa</span>
                  <Landmark className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="text-3xl font-semibold text-white">
                  {currencyFormatter.format(accountScopes.business?.balance || 0)}
                </div>
                <p className="mt-2 text-xs text-slate-500">Movimentações operacionais do negócio</p>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Produtividade</span>
                  <PiggyBank className="h-5 w-5 text-amber-300" />
                </div>
                <div className="text-3xl font-semibold text-white">{stats?.productivity_score || 0}%</div>
                <p className="mt-2 text-xs text-slate-500">Acompanhamento do ritmo operacional</p>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-slate-700/60 bg-slate-900/75 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Métodos de pagamento</h3>
                    <p className="text-sm text-slate-400">Como o dinheiro está entrando e saindo</p>
                  </div>
                  <CreditCard className="h-5 w-5 text-cyan-300" />
                </div>

                <div className="space-y-3">
                  {Object.keys(paymentMethods).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                      Ainda não há movimentações suficientes para mostrar métodos de pagamento.
                    </div>
                  ) : (
                    Object.entries(paymentMethods).map(([method, totals]) => (
                      <div key={method} className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-medium text-white">{paymentMethodLabels[method] || method}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {currencyFormatter.format((totals.income || 0) + (totals.expense || 0))}
                          </Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Entradas</p>
                            <p className="mt-1 text-lg font-semibold text-emerald-300">
                              {currencyFormatter.format(totals.income || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Saídas</p>
                            <p className="mt-1 text-lg font-semibold text-rose-300">
                              {currencyFormatter.format(totals.expense || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-6">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-white">Principais categorias de gasto</h3>
                  <p className="text-sm text-slate-400">Onde o dinheiro está saindo mais rápido</p>
                </div>

                <div className="space-y-3">
                  {topCategories.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                      Cadastre despesas para o Alfred sugerir categorias e padrões.
                    </div>
                  ) : (
                    topCategories.map((item, index) => (
                      <div key={`${item.category}-${index}`} className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-white">{item.category}</span>
                          <span className="text-sm font-semibold text-rose-300">
                            {currencyFormatter.format(item.amount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{
                              width: `${Math.max(
                                8,
                                Math.round((item.amount / Math.max(topCategories[0]?.amount || 1, 1)) * 100)
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-slate-700/60 bg-slate-900/75 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Movimentações recentes</h3>
                    <p className="text-sm text-slate-400">Últimos lançamentos com categoria e contexto</p>
                  </div>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {recentTransactions.length} itens
                  </Badge>
                </div>

                <div className="space-y-3">
                  {recentTransactions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                      Nenhuma transação cadastrada ainda.
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{transaction.description || transaction.category}</span>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {transaction.category}
                            </Badge>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {scopeLabels[transaction.account_scope] || transaction.account_scope}
                            </Badge>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {paymentMethodLabels[transaction.payment_method] || transaction.payment_method}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {transaction.type === 'income' ? '+' : '-'} {currencyFormatter.format(transaction.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="border-slate-700/60 bg-slate-900/75 p-6">
                <h3 className="mb-5 text-lg font-semibold text-white">Insights do Alfred</h3>
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                      Conforme você usar o sistema, o Alfred vai apontar riscos e oportunidades.
                    </div>
                  ) : (
                    insights.map((insight, index) => (
                      <div
                        key={index}
                        className={`rounded-2xl border p-4 text-sm ${
                          insight.type === 'warning'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                            : insight.type === 'success'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                        }`}
                      >
                        {insight.message}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </section>

            <Card className="border-slate-700/60 bg-slate-900/75 p-6">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">Chat com Alfred</h2>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  'Registre um Pix de R$ 480 da empresa para fornecedor',
                  'Separe meus gastos pessoais de mercado neste mês',
                  'Crie um lembrete para pagar o aluguel dia 5',
                  'Classifique os gastos recorrentes por assinatura'
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mb-6 space-y-4 max-h-96 overflow-y-auto pr-1">
                {chatHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <MessageCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p>Use linguagem natural para registrar gastos, receitas, lembretes e classificações financeiras.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-500">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'border border-cyan-500/30 bg-cyan-500/20 text-white'
                            : 'border border-slate-700/40 bg-slate-950/70 text-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder='Ex.: paguei R$ 320 no Pix para fornecedor da empresa e quero lembrar da próxima cobrança'
                  className="resize-none border-slate-700 bg-slate-950/70 text-white"
                  rows={2}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="self-end bg-cyan-500 text-white hover:bg-cyan-600"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
