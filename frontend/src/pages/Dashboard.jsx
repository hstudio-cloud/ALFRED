import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CheckSquare,
  CreditCard,
  Layers3,
  Landmark,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  Receipt,
  X,
  Wallet
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const sectionMeta = [
  { id: 'overview', label: 'Visão geral', icon: Wallet },
  { id: 'transactions', label: 'Receitas e despesas', icon: CreditCard },
  { id: 'bills', label: 'Contas', icon: Receipt },
  { id: 'categories', label: 'Categorias', icon: Layers3 },
  { id: 'reminders', label: 'Lembretes', icon: Bell },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'ai', label: 'IA e automação', icon: Bot },
  { id: 'saas', label: 'SaaS', icon: Landmark }
];

const initialTransaction = {
  type: 'expense',
  category: 'Geral',
  amount: '',
  description: '',
  payment_method: 'pix',
  account_scope: 'business',
  date: ''
};

const initialBill = {
  title: '',
  amount: '',
  type: 'payable',
  due_date: '',
  category: 'Geral',
  payment_method: 'pix',
  account_scope: 'business',
  description: '',
  client_name: '',
  recurring: false,
  recurrence_rule: ''
};

const initialCategory = {
  name: '',
  kind: 'expense',
  color: '#06b6d4',
  account_scope: 'both'
};

const initialReminder = {
  title: '',
  remind_at: '',
  description: ''
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [automationInsights, setAutomationInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', subdomain: '', description: '' });
  const [transactionForm, setTransactionForm] = useState(initialTransaction);
  const [billForm, setBillForm] = useState(initialBill);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [reminderForm, setReminderForm] = useState(initialReminder);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan_name: 'Starter',
    status: 'trial',
    billing_cycle: 'monthly',
    price: 0
  });
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceAwaitingCommand, setVoiceAwaitingCommand] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Ative a escuta para chamar Alfred por voz.');
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const voiceAwaitingCommandRef = useRef(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    voiceAwaitingCommandRef.current = voiceAwaitingCommand;
  }, [voiceAwaitingCommand]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = Boolean(SpeechRecognition);
    setVoiceSupported(supported);

    if (!supported) {
      setVoiceStatus('Seu navegador não oferece suporte ao reconhecimento de voz.');
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      if (!transcript) return;

      const normalized = transcript.toLowerCase();
      const wakeMatch = normalized.match(/\balfred\b[\s,:-]*(.*)/);

      if (voiceAwaitingCommandRef.current) {
        const spokenCommand = transcript.trim();
        setVoiceAwaitingCommand(false);
        setVoiceStatus(`Comando recebido: "${spokenCommand}"`);
        await sendChatMessage(spokenCommand, { source: 'voice' });
        return;
      }

      if (!wakeMatch) {
        setVoiceStatus('Escutando a palavra Alfred...');
        return;
      }

      const inlineCommand = (wakeMatch[1] || '').trim();
      if (inlineCommand) {
        setVoiceStatus(`Comando recebido: "${inlineCommand}"`);
        await sendChatMessage(inlineCommand, { source: 'voice' });
        return;
      }

      setVoiceAwaitingCommand(true);
      setVoiceStatus('Alfred acordou e está aguardando seu pedido.');
      speakText('Em que posso ajudar, senhor?');
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setVoiceStatus('Nenhuma fala detectada. Continuo ouvindo.');
        return;
      }

      if (event.error === 'not-allowed') {
        shouldKeepListeningRef.current = false;
        setVoiceEnabled(false);
        setVoiceAwaitingCommand(false);
        setVoiceStatus('Permissão do microfone negada. Libere o acesso para usar a voz.');
        return;
      }

      setVoiceStatus('A escuta por voz encontrou uma instabilidade. Vou tentar continuar.');
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch (error) {
          setVoiceStatus('O microfone ainda está iniciando. Tente novamente em alguns segundos.');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const loadAll = async (workspaceId) => {
    setLoading(true);
    try {
      const query = `workspace_id=${workspaceId}`;
      const [
        statsRes,
        summaryRes,
        transactionRes,
        billRes,
        categoryRes,
        reminderRes,
        reportRes,
        dashboardInsightsRes,
        automationRes,
        subscriptionRes,
        chatRes
      ] = await Promise.all([
        axios.get(`${API}/dashboard/stats?${query}`),
        axios.get(`${API}/finances/summary?${query}`),
        axios.get(`${API}/finances/transactions?${query}`),
        axios.get(`${API}/finances/bills?${query}`),
        axios.get(`${API}/finances/categories?${query}`),
        axios.get(`${API}/finances/reminders?${query}`),
        axios.get(`${API}/finances/reports/summary?${query}&period=${reportPeriod}`),
        axios.get(`${API}/dashboard/insights?${query}`),
        axios.get(`${API}/finances/automation/insights?${query}`),
        axios.get(`${API}/finances/saas/subscription?${query}`),
        axios.get(`${API}/chat/history`)
      ]);

      setStats(statsRes.data);
      setSummary(summaryRes.data);
      setTransactions(transactionRes.data);
      setBills(billRes.data);
      setCategories(categoryRes.data);
      setReminders(reminderRes.data);
      setReport(reportRes.data);
      setInsights(dashboardInsightsRes.data.insights || []);
      setAutomationInsights(automationRes.data.insights || []);
      setSubscription(subscriptionRes.data);
      setSubscriptionForm({
        plan_name: subscriptionRes.data.plan_name,
        status: subscriptionRes.data.status,
        billing_cycle: subscriptionRes.data.billing_cycle,
        price: subscriptionRes.data.price
      });
      setChatHistory(chatRes.data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao carregar módulo',
        description: 'Não consegui montar o painel completo agora.',
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

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setMobileNavOpen(false);
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/finances/transactions?workspace_id=${currentWorkspace.id}`,
        {
          ...transactionForm,
          amount: Number(transactionForm.amount),
          date: transactionForm.date || new Date().toISOString()
        }
      );
      setTransactionForm(initialTransaction);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao salvar transação', description: 'Revise os dados do lançamento.', variant: 'destructive' });
    }
  };

  const submitBill = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/finances/bills?workspace_id=${currentWorkspace.id}`,
        {
          ...billForm,
          amount: Number(billForm.amount),
          due_date: billForm.due_date
        }
      );
      setBillForm(initialBill);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao salvar conta', description: 'Não foi possível registrar a conta.', variant: 'destructive' });
    }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/finances/categories?workspace_id=${currentWorkspace.id}`, categoryForm);
      setCategoryForm(initialCategory);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao criar categoria', description: 'Confira o nome e tente novamente.', variant: 'destructive' });
    }
  };

  const submitReminder = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/finances/reminders?workspace_id=${currentWorkspace.id}`, reminderForm);
      setReminderForm(initialReminder);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao criar lembrete', description: 'Não consegui salvar o lembrete.', variant: 'destructive' });
    }
  };

  const submitWorkspace = async (e) => {
    e.preventDefault();
    const result = await createWorkspace(workspaceForm.name, workspaceForm.subdomain, workspaceForm.description);
    if (result.success) {
      setWorkspaceForm({ name: '', subdomain: '', description: '' });
    } else {
      toast({ title: 'Erro ao criar empresa', description: result.error, variant: 'destructive' });
    }
  };

  const saveSubscription = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/finances/saas/subscription?workspace_id=${currentWorkspace.id}`, {
        ...subscriptionForm,
        price: Number(subscriptionForm.price)
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao atualizar assinatura', description: 'Não foi possível salvar o plano.', variant: 'destructive' });
    }
  };

  const changeBillStatus = async (billId, status) => {
    await axios.put(`${API}/finances/bills/${billId}?workspace_id=${currentWorkspace.id}`, { status });
    loadAll(currentWorkspace.id);
  };

  const toggleReminder = async (reminder) => {
    await axios.put(`${API}/finances/reminders/${reminder.id}?workspace_id=${currentWorkspace.id}`, {
      is_active: !reminder.is_active
    });
    loadAll(currentWorkspace.id);
  };

  const refreshReport = async (period) => {
    setReportPeriod(period);
    const response = await axios.get(`${API}/finances/reports/summary?workspace_id=${currentWorkspace.id}&period=${period}`);
    setReport(response.data);
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

    const shouldResumeListening = shouldKeepListeningRef.current && recognitionRef.current;
    if (shouldResumeListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Nao consegui pausar o reconhecimento antes da fala.', error);
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (!shouldResumeListening) return;
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.warn('Nao consegui retomar o reconhecimento apos a fala.', error);
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const sendChatMessage = async (content, options = {}) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSendingMessage(true);

    const tempMessage = {
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    };
    setChatHistory((prev) => [...prev, tempMessage]);

    try {
      const response = await axios.post(`${API}/chat/message`, { content: trimmed });
      setChatHistory((prev) => [...prev, response.data.message]);
      if (options.source === 'voice') {
        speakText(response.data.message?.content);
        setVoiceStatus('Pedido concluído. Diga Alfred novamente para um novo comando.');
      }
      loadAll(currentWorkspace.id);
    } catch (error) {
      if (options.source === 'voice') {
        speakText('Nao consegui concluir o pedido agora.');
        setVoiceStatus('Não consegui processar o comando por voz.');
      }
      toast({ title: 'Erro no chat', description: 'NÃ£o consegui enviar a mensagem ao Alfred.', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleVoiceAssistant = () => {
    if (!voiceSupported || !recognitionRef.current) return;

    if (voiceEnabled) {
      shouldKeepListeningRef.current = false;
      setVoiceEnabled(false);
      setVoiceAwaitingCommand(false);
      setVoiceStatus('Escuta por voz desativada.');
      recognitionRef.current.stop();
      return;
    }

    shouldKeepListeningRef.current = true;
    setVoiceEnabled(true);
    setVoiceAwaitingCommand(false);
    setVoiceStatus('Escutando a palavra Alfred...');

    try {
      recognitionRef.current.start();
    } catch (error) {
      shouldKeepListeningRef.current = false;
      setVoiceEnabled(false);
      setVoiceStatus('Não consegui iniciar o microfone agora. Tente novamente.');
    }
  };

  const handleSendMessageLegacy = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSendingMessage(true);

    const tempMessage = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    setChatHistory((prev) => [...prev, tempMessage]);

    try {
      const response = await axios.post(`${API}/chat/message`, { content: message });
      setChatHistory((prev) => [...prev, response.data.message]);
      setMessage('');
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro no chat', description: 'Não consegui enviar a mensagem ao Alfred.', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const currentMessage = message;
    setMessage('');
    await sendChatMessage(currentMessage);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Saldo" value={currencyFormatter.format(summary?.balance || 0)} subtitle="Visão consolidada" />
        <MetricCard title="Receitas" value={currencyFormatter.format(summary?.income || 0)} subtitle="Entradas registradas" />
        <MetricCard title="Despesas" value={currencyFormatter.format(summary?.expenses || 0)} subtitle="Saídas registradas" />
        <MetricCard title="Produtividade" value={`${stats?.productivity_score || 0}%`} subtitle="Andamento operacional" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Contas e rotina financeira">
          <div className="grid gap-4 md:grid-cols-3">
            <MiniInfo label="Contas a vencer" value={summary?.upcoming_bills || 0} />
            <MiniInfo label="Lembretes ativos" value={summary?.active_reminders || 0} />
            <MiniInfo label="Transações" value={summary?.transactions_count || 0} />
          </div>
        </Panel>
        <Panel title="Empresas">
          <form onSubmit={submitWorkspace} className="space-y-3">
            <Input placeholder="Nome da empresa" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} />
            <Input placeholder="Subdomínio" value={workspaceForm.subdomain} onChange={(e) => setWorkspaceForm({ ...workspaceForm, subdomain: e.target.value })} />
            <Textarea placeholder="Descrição" value={workspaceForm.description} onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })} rows={3} />
            <Button type="submit" className="w-full">Criar workspace</Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Insights do dashboard">
          <InsightList items={insights} emptyText="Sem alertas principais no momento." />
        </Panel>
        <Panel title="Automação e economia">
          <InsightList items={automationInsights} emptyText="Sem automações sugeridas ainda." />
        </Panel>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Novo lançamento">
        <form onSubmit={submitTransaction} className="grid gap-3">
          <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <Input placeholder="Categoria" value={transactionForm.category} onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Valor" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} />
          <Input placeholder="Descrição" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={transactionForm.payment_method} onChange={(e) => setTransactionForm({ ...transactionForm, payment_method: e.target.value })}>
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
              <option value="cash">Dinheiro</option>
              <option value="other">Outros</option>
            </select>
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={transactionForm.account_scope} onChange={(e) => setTransactionForm({ ...transactionForm, account_scope: e.target.value })}>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input type="datetime-local" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} />
          <Button type="submit">Salvar transação</Button>
        </form>
      </Panel>
      <Panel title="Histórico financeiro">
        <div className="space-y-3">
          {transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-950/50 p-3">
              <div>
                <div className="font-medium text-white">{item.description || item.category}</div>
                <div className="text-xs text-slate-400">{item.category} • {item.account_scope} • {item.payment_method}</div>
              </div>
              <div className={item.type === 'income' ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                {item.type === 'income' ? '+' : '-'} {currencyFormatter.format(item.amount)}
              </div>
            </div>
          ))}
          {transactions.length === 0 && <EmptyState text="Nenhuma transação registrada ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderBills = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Nova conta">
        <form onSubmit={submitBill} className="grid gap-3">
          <Input placeholder="Título" value={billForm.title} onChange={(e) => setBillForm({ ...billForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.01" placeholder="Valor" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} />
            <Input type="datetime-local" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={billForm.type} onChange={(e) => setBillForm({ ...billForm, type: e.target.value })}>
              <option value="payable">Conta a pagar</option>
              <option value="receivable">Conta a receber</option>
            </select>
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={billForm.account_scope} onChange={(e) => setBillForm({ ...billForm, account_scope: e.target.value })}>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input placeholder="Categoria" value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} />
          <Input placeholder="Cliente / origem" value={billForm.client_name} onChange={(e) => setBillForm({ ...billForm, client_name: e.target.value })} />
          <Textarea placeholder="Descrição" value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} rows={3} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={billForm.recurring} onChange={(e) => setBillForm({ ...billForm, recurring: e.target.checked })} />
            Conta recorrente
          </label>
          {billForm.recurring && (
            <Input placeholder="Regra de recorrência" value={billForm.recurrence_rule} onChange={(e) => setBillForm({ ...billForm, recurrence_rule: e.target.value })} />
          )}
          <Button type="submit">Salvar conta</Button>
        </form>
      </Panel>
      <Panel title="Contas a pagar e receber">
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-white">{bill.title}</div>
                  <div className="text-xs text-slate-400">{bill.type} • {bill.category} • vence em {new Date(bill.due_date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-600 text-slate-300">{bill.status}</Badge>
                  <span className="font-semibold text-white">{currencyFormatter.format(bill.amount)}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => changeBillStatus(bill.id, bill.type === 'payable' ? 'paid' : 'received')}>Marcar concluída</Button>
                <Button size="sm" variant="ghost" onClick={() => changeBillStatus(bill.id, 'cancelled')}>Cancelar</Button>
              </div>
            </div>
          ))}
          {bills.length === 0 && <EmptyState text="Nenhuma conta cadastrada ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderCategories = () => (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Nova categoria">
        <form onSubmit={submitCategory} className="grid gap-3">
          <Input placeholder="Nome da categoria" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={categoryForm.kind} onChange={(e) => setCategoryForm({ ...categoryForm, kind: e.target.value })}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="both">Ambos</option>
            </select>
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={categoryForm.account_scope} onChange={(e) => setCategoryForm({ ...categoryForm, account_scope: e.target.value })}>
              <option value="both">Ambos</option>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} />
          <Button type="submit">Criar categoria</Button>
        </form>
      </Panel>
      <Panel title="Mapa de categorias">
        <div className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{category.name}</span>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
              </div>
              <div className="mt-2 text-xs text-slate-400">{category.kind} • {category.account_scope}</div>
            </div>
          ))}
          {categories.length === 0 && <EmptyState text="Nenhuma categoria criada ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderReminders = () => (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Novo lembrete">
        <form onSubmit={submitReminder} className="grid gap-3">
          <Input placeholder="Título do lembrete" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} />
          <Input type="datetime-local" value={reminderForm.remind_at} onChange={(e) => setReminderForm({ ...reminderForm, remind_at: e.target.value })} />
          <Textarea placeholder="Descrição" value={reminderForm.description} onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })} rows={3} />
          <Button type="submit">Salvar lembrete</Button>
        </form>
      </Panel>
      <Panel title="Agenda financeira">
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
              <div>
                <div className="font-medium text-white">{reminder.title}</div>
                <div className="text-xs text-slate-400">{new Date(reminder.remind_at).toLocaleString('pt-BR')}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleReminder(reminder)}>
                {reminder.is_active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          ))}
          {reminders.length === 0 && <EmptyState text="Nenhum lembrete financeiro criado ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {['7d', '30d', '90d', 'year'].map((period) => (
          <Button key={period} variant={reportPeriod === period ? 'default' : 'outline'} onClick={() => refreshReport(period)}>
            {period}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Balance do período" value={currencyFormatter.format(report?.balance || 0)} subtitle={`Período ${report?.period || reportPeriod}`} />
        <MetricCard title="Contas a pagar" value={currencyFormatter.format(report?.payables_open || 0)} subtitle="Pendências abertas" />
        <MetricCard title="Contas a receber" value={currencyFormatter.format(report?.receivables_open || 0)} subtitle="Recebimentos em aberto" />
        <MetricCard title="Economia sugerida" value={currencyFormatter.format(report?.savings_suggestion?.estimated_value || 0)} subtitle="Ajuste potencial" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Despesas por categoria">
          <div className="space-y-3">
            {(report?.top_expenses || []).map((item) => (
              <div key={item.category} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-950/50 p-3">
                <span className="text-white">{item.category}</span>
                <span className="font-semibold text-rose-300">{currencyFormatter.format(item.amount)}</span>
              </div>
            ))}
            {!(report?.top_expenses || []).length && <EmptyState text="Sem despesas suficientes para relatório." />}
          </div>
        </Panel>
        <Panel title="Leitura do Alfred">
          <p className="text-sm text-slate-300">{report?.savings_suggestion?.message}</p>
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            Total de transações no período: {report?.transactions_count || 0}. Total de contas registradas: {report?.bills_count || 0}.
          </div>
        </Panel>
      </div>
    </div>
  );

  const renderAi = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Chat com Alfred">
        <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Assistente por voz</p>
              <p className="text-xs text-cyan-100/80">
                Fale <span className="font-semibold text-cyan-200">Alfred</span>, espere a resposta
                <span className="font-semibold text-cyan-200"> Em que posso ajudar, senhor?</span> e depois diga seu pedido.
              </p>
            </div>
            <Button
              type="button"
              variant={voiceEnabled ? 'destructive' : 'default'}
              onClick={toggleVoiceAssistant}
              disabled={!voiceSupported}
              className="gap-2"
            >
              {voiceEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {voiceEnabled ? 'Parar escuta' : 'Ativar voz'}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-cyan-400/40 text-cyan-100">
              {voiceAwaitingCommand ? 'Aguardando comando' : voiceEnabled ? 'Escutando wake word' : 'Voz inativa'}
            </Badge>
            <span className="text-cyan-50/80">{voiceStatus}</span>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            'Registre uma despesa de R$ 450 no Pix para fornecedor',
            'Crie um lembrete de aluguel no dia 5',
            'Quero ver onde posso economizar neste mês',
            'Separe meus gastos pessoais dos da empresa'
          ].map((prompt) => (
            <button key={prompt} type="button" onClick={() => setMessage(prompt)} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              {prompt}
            </button>
          ))}
        </div>
        <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-cyan-500/15 text-white' : 'bg-slate-950/60 text-slate-200'}`}>
              {msg.content}
            </div>
          ))}
          {chatHistory.length === 0 && <EmptyState text="Converse com o Alfred para iniciar automações." />}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="border-slate-700 bg-slate-950/70 text-white" placeholder="Escreva o que aconteceu financeiramente..." />
          <Button type="submit" disabled={sendingMessage}>{sendingMessage ? 'Enviando...' : 'Enviar'}</Button>
        </form>
      </Panel>
      <Panel title="Sugestões automáticas">
        <InsightList items={automationInsights} emptyText="As automações vão aparecer conforme você usar o sistema." />
      </Panel>
    </div>
  );

  const renderSaas = () => (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Plano e cobrança">
        <form onSubmit={saveSubscription} className="grid gap-3">
          <Input placeholder="Plano" value={subscriptionForm.plan_name} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, plan_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={subscriptionForm.status} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, status: e.target.value })}>
              <option value="trial">Trial</option>
              <option value="active">Ativo</option>
              <option value="past_due">Em atraso</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <select className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-white" value={subscriptionForm.billing_cycle} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, billing_cycle: e.target.value })}>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <Input type="number" step="0.01" placeholder="Preço" value={subscriptionForm.price} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, price: e.target.value })} />
          <Button type="submit">Salvar assinatura</Button>
        </form>
      </Panel>
      <Panel title="Resumo SaaS do workspace">
        <div className="space-y-3">
          <MiniInfo label="Plano atual" value={subscription?.plan_name || '-'} />
          <MiniInfo label="Status" value={subscription?.status || '-'} />
          <MiniInfo label="Cobrança" value={subscription?.billing_cycle || '-'} />
          <MiniInfo label="Preço" value={currencyFormatter.format(subscription?.price || 0)} />
        </div>
      </Panel>
    </div>
  );

  const sectionContent = {
    overview: renderOverview(),
    transactions: renderTransactions(),
    bills: renderBills(),
    categories: renderCategories(),
    reminders: renderReminders(),
    reports: renderReports(),
    ai: renderAi(),
    saas: renderSaas()
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-3xl font-semibold">Crie ou selecione uma empresa para começar</h1>
          <form onSubmit={submitWorkspace} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
            <Input placeholder="Nome da empresa" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} />
            <Input placeholder="Subdomínio" value={workspaceForm.subdomain} onChange={(e) => setWorkspaceForm({ ...workspaceForm, subdomain: e.target.value })} />
            <Textarea placeholder="Descrição" value={workspaceForm.description} onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })} rows={3} />
            <Button type="submit">Criar empresa</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] text-white">
      <div className="lg:hidden fixed left-4 top-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          className="border border-slate-700 bg-slate-950/90 text-white backdrop-blur"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-[286px] border-r border-slate-800/80 bg-slate-950/92 backdrop-blur-xl
          transition-transform duration-300 lg:translate-x-0
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800/80 px-6 pb-5 pt-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">Alfred Finance OS</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-white">Central do Alfred</h1>
                <p className="mt-1 text-sm text-slate-400">Navegação principal</p>
              </div>
            </div>
            <Badge variant="outline" className="mt-4 w-full justify-center border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <Building2 className="mr-1 h-3 w-3" />
              {currentWorkspace.name}
            </Badge>
          </div>

          <div className="px-4 py-4">
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-white"
              value={currentWorkspace.id}
              onChange={(e) => {
                const next = workspaces.find((item) => item.id === e.target.value);
                if (next) switchWorkspace(next);
              }}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="space-y-1">
              {sectionMeta.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSectionChange(section.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      active
                        ? 'bg-cyan-500/15 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                        : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{section.label}</span>
                      <span className="block text-xs text-slate-500">
                        {section.id === 'overview' && 'Resumo do sistema'}
                        {section.id === 'transactions' && 'Lançamentos financeiros'}
                        {section.id === 'bills' && 'Contas e recorrência'}
                        {section.id === 'categories' && 'Organização financeira'}
                        {section.id === 'reminders' && 'Alertas e agenda'}
                        {section.id === 'reports' && 'Leituras e relatórios'}
                        {section.id === 'ai' && 'Chat e automações'}
                        {section.id === 'saas' && 'Plano e cobrança'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800/80 p-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-sm font-medium text-white">{user?.name}</div>
              <div className="mt-1 text-xs text-slate-400">{user?.email}</div>
              <div className="mt-4 grid gap-2">
                <Button variant="ghost" className="justify-start text-slate-300 hover:text-white" onClick={() => navigate('/clients')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Clientes
                </Button>
                <Button variant="ghost" className="justify-start text-slate-300 hover:text-white" onClick={() => navigate('/tasks')}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tarefas
                </Button>
                <Button variant="ghost" className="justify-start text-rose-300 hover:bg-rose-500/10 hover:text-rose-200" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-[286px]">
        <div className="mx-auto max-w-7xl px-6 py-8 pt-20 lg:pt-8">
          <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/55 p-6 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Workspace ativo</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{currentWorkspace.name}</h2>
              <p className="mt-2 text-sm text-slate-400">
                Navegação lateral inspirada em apps SaaS modernos, deixando a operação mais clara e contínua.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-cyan-200">
              Aba atual: {sectionMeta.find((item) => item.id === activeSection)?.label}
            </Badge>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">
              Carregando módulos do Alfred...
            </div>
          ) : (
            sectionContent[activeSection]
          )}
        </div>
      </main>
    </div>
  );
};

const Panel = ({ title, children }) => (
  <Card className="border-slate-700/60 bg-slate-900/75 p-6">
    <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
    {children}
  </Card>
);

const MetricCard = ({ title, value, subtitle }) => (
  <Card className="border-slate-700/60 bg-slate-900/75 p-5">
    <div className="text-sm text-slate-400">{title}</div>
    <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
  </Card>
);

const MiniInfo = ({ label, value }) => (
  <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">{text}</div>
);

const InsightList = ({ items, emptyText }) => {
  if (!items.length) return <EmptyState text={emptyText} />;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
          <div className="font-medium text-white">{item.label || item.type || 'Insight'}</div>
          <div className="mt-1 text-sm text-slate-300">{item.message}</div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
