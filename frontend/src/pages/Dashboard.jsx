import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import Sidebar from '../components/Sidebar';
import AlfredAssistantPage from '../components/AlfredAssistantPage';
import { useToast } from '../hooks/use-toast';
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Layers3,
  MessageCircle,
  Receipt,
  Wallet
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const scopeOptions = [
  { id: 'general', label: 'Geral' },
  { id: 'personal', label: 'Pessoal' },
  { id: 'business', label: 'Empresa' }
];

const sectionMeta = [
  { id: 'overview', label: 'Visão geral', icon: Wallet, description: 'Resumo consolidado do financeiro' },
  { id: 'transactions', label: 'Receitas e despesas', icon: CreditCard, description: 'Lançamentos financeiros' },
  { id: 'bills', label: 'Contas', icon: Receipt, description: 'Pagar, receber e recorrência' },
  { id: 'categories', label: 'Categorias', icon: Layers3, description: 'Organização por contexto' },
  { id: 'reminders', label: 'Lembretes', icon: Bell, description: 'Alertas e agenda financeira' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, description: 'Leituras, projeções e importações' },
  { id: 'ai', label: 'Assistente Alfred', icon: MessageCircle, description: 'Voz ativa, chat e execução' }
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

const selectClassName =
  'h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/25';
const inputClassName = 'border-white/10 bg-slate-950/60 text-white';
const softCardClassName = 'rounded-[24px] border border-white/10 bg-slate-950/45 p-4';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState('ai');
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [automationInsights, setAutomationInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', subdomain: '', description: '' });
  const [transactionForm, setTransactionForm] = useState(initialTransaction);
  const [billForm, setBillForm] = useState(initialBill);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [reminderForm, setReminderForm] = useState(initialReminder);
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [financialView, setFinancialView] = useState('general');
  const [forecast, setForecast] = useState(null);
  const [statementImports, setStatementImports] = useState([]);
  const [statementFile, setStatementFile] = useState(null);
  const [statementImportResult, setStatementImportResult] = useState(null);
  const [uploadingStatement, setUploadingStatement] = useState(false);

  const loadAll = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return;

      setLoading(true);
      try {
        const query = `workspace_id=${workspaceId}&account_scope=${financialView}`;
        const [
          statsRes,
          summaryRes,
          transactionRes,
          billRes,
          categoryRes,
          reminderRes,
          reportRes,
          forecastRes,
          statementImportsRes,
          dashboardInsightsRes,
          automationRes
        ] = await Promise.all([
          axios.get(`${API}/dashboard/stats?${query}`),
          axios.get(`${API}/finances/summary?${query}`),
          axios.get(`${API}/finances/transactions?${query}`),
          axios.get(`${API}/finances/bills?${query}`),
          axios.get(`${API}/finances/categories?${query}`),
          axios.get(`${API}/finances/reminders?${query}`),
          axios.get(`${API}/finances/reports/summary?${query}&period=${reportPeriod}`),
          axios.get(`${API}/finances/forecast?${query}`),
          axios.get(`${API}/finances/imports?workspace_id=${workspaceId}`),
          axios.get(`${API}/dashboard/insights?${query}`),
          axios.get(`${API}/finances/automation/insights?${query}`)
        ]);

        setStats(statsRes.data);
        setSummary(summaryRes.data);
        setTransactions(transactionRes.data);
        setBills(billRes.data);
        setCategories(categoryRes.data);
        setReminders(reminderRes.data);
        setReport(reportRes.data);
        setForecast(forecastRes.data);
        setStatementImports(statementImportsRes.data || []);
        setInsights(dashboardInsightsRes.data.insights || []);
        setAutomationInsights(automationRes.data.insights || []);
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
    },
    [financialView, reportPeriod, toast]
  );

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWorkspaceChange = (workspaceId) => {
    const nextWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
    if (nextWorkspace) {
      switchWorkspace(nextWorkspace);
    }
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API}/finances/transactions?workspace_id=${currentWorkspace.id}`, {
        ...transactionForm,
        amount: Number(transactionForm.amount),
        date: transactionForm.date || new Date().toISOString()
      });
      setTransactionForm(initialTransaction);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao salvar transação', description: 'Revise os dados do lançamento.', variant: 'destructive' });
    }
  };

  const submitBill = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API}/finances/bills?workspace_id=${currentWorkspace.id}`, {
        ...billForm,
        amount: Number(billForm.amount),
        due_date: billForm.due_date
      });
      setBillForm(initialBill);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao salvar conta', description: 'Não foi possível registrar a conta.', variant: 'destructive' });
    }
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API}/finances/categories?workspace_id=${currentWorkspace.id}`, categoryForm);
      setCategoryForm(initialCategory);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao criar categoria', description: 'Confira o nome e tente novamente.', variant: 'destructive' });
    }
  };

  const submitReminder = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API}/finances/reminders?workspace_id=${currentWorkspace.id}`, reminderForm);
      setReminderForm(initialReminder);
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Erro ao criar lembrete', description: 'Não consegui salvar o lembrete.', variant: 'destructive' });
    }
  };

  const submitWorkspace = async (event) => {
    event.preventDefault();
    const result = await createWorkspace(workspaceForm.name, workspaceForm.subdomain, workspaceForm.description);
    if (result.success) {
      setWorkspaceForm({ name: '', subdomain: '', description: '' });
    } else {
      toast({ title: 'Erro ao criar empresa', description: result.error, variant: 'destructive' });
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
    const response = await axios.get(`${API}/finances/reports/summary?workspace_id=${currentWorkspace.id}&account_scope=${financialView}&period=${period}`);
    setReport(response.data);
  };

  const generateRecurringBills = async () => {
    try {
      await axios.post(`${API}/finances/bills/generate-recurring?workspace_id=${currentWorkspace.id}`);
      toast({
        title: 'Recorrências processadas',
        description: 'O Alfred gerou as próximas contas recorrentes dentro da janela prevista.'
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: 'Erro nas recorrências',
        description: 'Não consegui gerar as próximas contas recorrentes agora.',
        variant: 'destructive'
      });
    }
  };

  const uploadStatement = async () => {
    if (!statementFile || !currentWorkspace?.id) return;

    setUploadingStatement(true);
    try {
      const formData = new FormData();
      formData.append('file', statementFile);

      const response = await axios.post(
        `${API}/finances/import-statement?workspace_id=${currentWorkspace.id}&account_scope=${financialView}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setStatementImportResult(response.data);
      setStatementFile(null);
      toast({
        title: 'Extrato analisado',
        description: 'O Alfred preparou um preview inicial do arquivo enviado.'
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: 'Não consegui ler esse extrato agora. Tente CSV, XLSX, XLS ou PDF.',
        variant: 'destructive'
      });
    } finally {
      setUploadingStatement(false);
    }
  };

  const refreshAfterAssistantMessage = useCallback(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  const scopeLabel = scopeOptions.find((scope) => scope.id === financialView)?.label || 'Geral';
  const activeSectionMeta = sectionMeta.find((section) => section.id === activeSection) || sectionMeta[0];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Saldo" value={currencyFormatter.format(summary?.balance || 0)} subtitle={`Visão ${financialView === 'general' ? 'geral' : financialView === 'personal' ? 'pessoal' : 'empresa'}`} />
        <MetricCard title="Receitas" value={currencyFormatter.format(summary?.income || 0)} subtitle="Entradas registradas" />
        <MetricCard title="Despesas" value={currencyFormatter.format(summary?.expenses || 0)} subtitle="Saídas registradas" />
        <MetricCard title="Produtividade" value={`${stats?.productivity_score || 0}%`} subtitle="Andamento operacional" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(forecast?.forecasts || []).map((item) => (
          <MetricCard
            key={item.days}
            title={`Saldo em ${item.days} dias`}
            value={currencyFormatter.format(item.projected_balance || 0)}
            subtitle={`Entradas ${currencyFormatter.format(item.projected_income || 0)} • Saídas ${currencyFormatter.format(item.projected_expenses || 0)}`}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Contas e rotina financeira">
          <div className="grid gap-4 md:grid-cols-3">
            <MiniInfo label="Contas a vencer" value={summary?.upcoming_bills || 0} />
            <MiniInfo label="Lembretes ativos" value={summary?.active_reminders || 0} />
            <MiniInfo label="Transações" value={summary?.transactions_count || 0} />
          </div>
        </Panel>

        <Panel title="Criar nova empresa">
          <form onSubmit={submitWorkspace} className="space-y-3">
            <Input placeholder="Nome da empresa" value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} className={inputClassName} />
            <Input placeholder="Subdomínio" value={workspaceForm.subdomain} onChange={(event) => setWorkspaceForm({ ...workspaceForm, subdomain: event.target.value })} className={inputClassName} />
            <Textarea placeholder="Descrição" value={workspaceForm.description} onChange={(event) => setWorkspaceForm({ ...workspaceForm, description: event.target.value })} rows={3} className={inputClassName} />
            <Button type="submit" className="w-full rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Criar workspace</Button>
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
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <Panel title="Novo lançamento">
        <form onSubmit={submitTransaction} className="grid gap-3">
          <select className={selectClassName} value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <Input placeholder="Categoria" value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value })} className={inputClassName} />
          <Input type="number" step="0.01" placeholder="Valor" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className={inputClassName} />
          <Input placeholder="Descrição" value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} className={inputClassName} />
          <div className="grid grid-cols-2 gap-3">
            <select className={selectClassName} value={transactionForm.payment_method} onChange={(event) => setTransactionForm({ ...transactionForm, payment_method: event.target.value })}>
              <option value="pix">Pix</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
              <option value="cash">Dinheiro</option>
              <option value="other">Outros</option>
            </select>
            <select className={selectClassName} value={transactionForm.account_scope} onChange={(event) => setTransactionForm({ ...transactionForm, account_scope: event.target.value })}>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input type="datetime-local" value={transactionForm.date} onChange={(event) => setTransactionForm({ ...transactionForm, date: event.target.value })} className={inputClassName} />
          <Button type="submit" className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Salvar transação</Button>
        </form>
      </Panel>

      <Panel title="Histórico financeiro">
        <div className="space-y-3">
          {transactions.map((item) => (
            <RecordRow
              key={item.id}
              title={item.description || item.category}
              meta={`${item.category} • ${item.account_scope} • ${item.payment_method}`}
              amount={`${item.type === 'income' ? '+' : '-'} ${currencyFormatter.format(item.amount)}`}
              amountTone={item.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}
            />
          ))}
          {transactions.length === 0 && <EmptyState text="Nenhuma transação registrada ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderBills = () => (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <Panel title="Nova conta" action={<Button size="sm" variant="outline" onClick={generateRecurringBills} className="rounded-full border-white/10 bg-white/[0.03]">Gerar recorrências</Button>}>
        <form onSubmit={submitBill} className="grid gap-3">
          <Input placeholder="Título" value={billForm.title} onChange={(event) => setBillForm({ ...billForm, title: event.target.value })} className={inputClassName} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.01" placeholder="Valor" value={billForm.amount} onChange={(event) => setBillForm({ ...billForm, amount: event.target.value })} className={inputClassName} />
            <Input type="datetime-local" value={billForm.due_date} onChange={(event) => setBillForm({ ...billForm, due_date: event.target.value })} className={inputClassName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className={selectClassName} value={billForm.type} onChange={(event) => setBillForm({ ...billForm, type: event.target.value })}>
              <option value="payable">Conta a pagar</option>
              <option value="receivable">Conta a receber</option>
            </select>
            <select className={selectClassName} value={billForm.account_scope} onChange={(event) => setBillForm({ ...billForm, account_scope: event.target.value })}>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input placeholder="Categoria" value={billForm.category} onChange={(event) => setBillForm({ ...billForm, category: event.target.value })} className={inputClassName} />
          <Input placeholder="Cliente / origem" value={billForm.client_name} onChange={(event) => setBillForm({ ...billForm, client_name: event.target.value })} className={inputClassName} />
          <Textarea placeholder="Descrição" value={billForm.description} onChange={(event) => setBillForm({ ...billForm, description: event.target.value })} rows={3} className={inputClassName} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={billForm.recurring} onChange={(event) => setBillForm({ ...billForm, recurring: event.target.checked })} />
            Conta recorrente
          </label>
          {billForm.recurring && <Input placeholder="Regra de recorrência" value={billForm.recurrence_rule} onChange={(event) => setBillForm({ ...billForm, recurrence_rule: event.target.value })} className={inputClassName} />}
          <Button type="submit" className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Salvar conta</Button>
        </form>
      </Panel>

      <Panel title="Contas a pagar e receber">
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className={softCardClassName}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-white">{bill.title}</div>
                  <div className="text-xs text-slate-400">{bill.type} • {bill.category} • vence em {new Date(bill.due_date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/10 text-slate-300">{bill.status}</Badge>
                  <span className="font-semibold text-white">{currencyFormatter.format(bill.amount)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => changeBillStatus(bill.id, bill.type === 'payable' ? 'paid' : 'received')} className="rounded-full border-white/10 bg-white/[0.03]">Marcar concluída</Button>
                <Button size="sm" variant="ghost" onClick={() => changeBillStatus(bill.id, 'cancelled')} className="rounded-full">Cancelar</Button>
              </div>
            </div>
          ))}
          {bills.length === 0 && <EmptyState text="Nenhuma conta cadastrada ainda." />}
        </div>
      </Panel>
    </div>
  );

  const renderCategories = () => (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <Panel title="Nova categoria">
        <form onSubmit={submitCategory} className="grid gap-3">
          <Input placeholder="Nome da categoria" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} className={inputClassName} />
          <div className="grid grid-cols-2 gap-3">
            <select className={selectClassName} value={categoryForm.kind} onChange={(event) => setCategoryForm({ ...categoryForm, kind: event.target.value })}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
              <option value="both">Ambos</option>
            </select>
            <select className={selectClassName} value={categoryForm.account_scope} onChange={(event) => setCategoryForm({ ...categoryForm, account_scope: event.target.value })}>
              <option value="both">Ambos</option>
              <option value="business">Empresa</option>
              <option value="personal">Pessoal</option>
            </select>
          </div>
          <Input type="color" value={categoryForm.color} onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })} className="h-11 border-white/10 bg-slate-950/60" />
          <Button type="submit" className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Criar categoria</Button>
        </form>
      </Panel>

      <Panel title="Mapa de categorias">
        <div className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <div key={category.id} className={softCardClassName}>
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
    <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <Panel title="Novo lembrete">
        <form onSubmit={submitReminder} className="grid gap-3">
          <Input placeholder="Título do lembrete" value={reminderForm.title} onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })} className={inputClassName} />
          <Input type="datetime-local" value={reminderForm.remind_at} onChange={(event) => setReminderForm({ ...reminderForm, remind_at: event.target.value })} className={inputClassName} />
          <Textarea placeholder="Descrição" value={reminderForm.description} onChange={(event) => setReminderForm({ ...reminderForm, description: event.target.value })} rows={3} className={inputClassName} />
          <Button type="submit" className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Salvar lembrete</Button>
        </form>
      </Panel>

      <Panel title="Agenda financeira">
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className={softCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{reminder.title}</div>
                  <div className="text-xs text-slate-400">{new Date(reminder.remind_at).toLocaleString('pt-BR')}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleReminder(reminder)} className="rounded-full border-white/10 bg-white/[0.03]">
                  {reminder.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
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
          <Button key={period} variant="outline" onClick={() => refreshReport(period)} className={`rounded-full ${reportPeriod === period ? 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]'}`}>
            {period}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Balanço do período" value={currencyFormatter.format(report?.balance || 0)} subtitle={`Período ${report?.period || reportPeriod}`} />
        <MetricCard title="Contas a pagar" value={currencyFormatter.format(report?.payables_open || 0)} subtitle="Pendências abertas" />
        <MetricCard title="Contas a receber" value={currencyFormatter.format(report?.receivables_open || 0)} subtitle="Recebimentos em aberto" />
        <MetricCard title="Economia sugerida" value={currencyFormatter.format(report?.savings_suggestion?.estimated_value || 0)} subtitle="Ajuste potencial" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Despesas por categoria">
          <div className="space-y-3">
            {(report?.top_expenses || []).map((item) => (
              <RecordRow key={item.category} title={item.category} meta="Maior pressão de gasto" amount={currencyFormatter.format(item.amount)} amountTone="text-rose-300" />
            ))}
            {!(report?.top_expenses || []).length && <EmptyState text="Sem despesas suficientes para relatório." />}
          </div>
        </Panel>

        <Panel title="Leitura do Alfred">
          <p className="text-sm leading-7 text-slate-300">{report?.savings_suggestion?.message}</p>
          <div className="mt-4 rounded-[24px] border border-cyan-400/18 bg-cyan-400/10 p-4 text-sm text-cyan-50">
            Total de transações no período: {report?.transactions_count || 0}. Total de contas registradas: {report?.bills_count || 0}.
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel title="Importação de extrato">
          <div className="space-y-4">
            <p className="text-sm leading-7 text-slate-300">Envie CSV, XLS, XLSX ou PDF para o Alfred montar a leitura inicial do extrato na visão {scopeLabel.toLowerCase()}.</p>
            <Input type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event) => setStatementFile(event.target.files?.[0] || null)} />
            <Button type="button" onClick={uploadStatement} disabled={!statementFile || uploadingStatement} className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              {uploadingStatement ? 'Lendo arquivo...' : 'Enviar extrato'}
            </Button>
            {statementImportResult && (
              <div className={softCardClassName}>
                <div className="font-medium text-white">{statementImportResult.file_name}</div>
                <div className="mt-1 text-sm text-slate-300">Status: {statementImportResult.status}</div>
                <div className="text-sm text-slate-400">Linhas detectadas: {statementImportResult.row_count || 0}</div>
                {statementImportResult.notes && <div className="mt-2 text-sm text-slate-400">{statementImportResult.notes}</div>}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Preview das importações">
          <div className="space-y-3">
            {statementImportResult?.preview_rows?.length ? (
              <div className="space-y-2">
                {statementImportResult.preview_rows.slice(0, 5).map((row, index) => (
                  <div key={index} className={softCardClassName}>
                    {Object.entries(row).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="text-xs text-slate-300">
                        <span className="text-slate-500">{key}:</span> {String(value || '-')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : statementImports.length ? (
              statementImports.map((item) => (
                <div key={item.id} className={softCardClassName}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{item.file_name}</div>
                      <div className="text-xs text-slate-400">{item.file_type} • {item.status} • {item.account_scope}</div>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-slate-300">{item.row_count || 0} linhas</Badge>
                  </div>
                  {item.notes && <div className="mt-2 text-sm text-slate-400">{item.notes}</div>}
                </div>
              ))
            ) : (
              <EmptyState text="Nenhum extrato importado ainda." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );

  const sectionContent = {
    overview: renderOverview(),
    transactions: renderTransactions(),
    bills: renderBills(),
    categories: renderCategories(),
    reminders: renderReminders(),
    reports: renderReports(),
    ai: <AlfredAssistantPage financialView={financialView} onAfterMessage={refreshAfterAssistantMessage} />
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_25%),linear-gradient(180deg,_#04111d_0%,_#071321_48%,_#020817_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-3xl font-semibold">Crie ou selecione uma empresa para começar</h1>
          <form onSubmit={submitWorkspace} className="space-y-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <Input placeholder="Nome da empresa" value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} className={inputClassName} />
            <Input placeholder="Subdomínio" value={workspaceForm.subdomain} onChange={(event) => setWorkspaceForm({ ...workspaceForm, subdomain: event.target.value })} className={inputClassName} />
            <Textarea placeholder="Descrição" value={workspaceForm.description} onChange={(event) => setWorkspaceForm({ ...workspaceForm, description: event.target.value })} rows={3} className={inputClassName} />
            <Button type="submit" className="rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">Criar empresa</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_25%),linear-gradient(180deg,_#04111d_0%,_#071321_48%,_#020817_100%)] text-white">
      <Sidebar
        items={sectionMeta}
        activeItem={activeSection}
        onSelectItem={setActiveSection}
        workspaceName={currentWorkspace.name}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspace.id}
        onWorkspaceChange={handleWorkspaceChange}
        user={user}
        onClients={() => navigate('/clients')}
        onTasks={() => navigate('/tasks')}
        onLogout={handleLogout}
      />

      <main className="lg:pl-24">
        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-8">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] px-5 py-5 shadow-[0_30px_80px_rgba(2,8,23,0.38)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="rounded-full border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
                  Workspace ativo
                </Badge>
                <div>
                  <h2 className="text-3xl font-semibold text-white">{activeSectionMeta.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                    {activeSection === 'ai'
                      ? 'Uma experiência conversacional premium para registrar despesas, organizar pagamentos, criar lembretes e analisar o financeiro com voz ativa.'
                      : 'O painel acompanha a visão pessoal, empresa e geral sem quebrar sua rotina financeira.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 xl:text-right">
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {scopeOptions.map((scope) => (
                    <Button
                      key={scope.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFinancialView(scope.id)}
                      className={`rounded-full px-4 ${financialView === scope.id ? 'border-cyan-400/20 bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]'}`}
                    >
                      {scope.label}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Badge variant="outline" className="rounded-full border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                    <Building2 className="mr-2 h-3.5 w-3.5" />
                    {currentWorkspace.name}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-slate-300">
                    Visão ativa: {scopeLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/8 pt-5">
              {loading ? (
                <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-8 text-center text-slate-300">
                  Carregando módulos do Alfred...
                </div>
              ) : (
                sectionContent[activeSection]
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Panel = ({ title, action, children }) => (
  <Card className="rounded-[30px] border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(2,8,23,0.28)] backdrop-blur-xl">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {action}
    </div>
    {children}
  </Card>
);

const MetricCard = ({ title, value, subtitle }) => (
  <Card className="rounded-[28px] border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(2,8,23,0.24)] backdrop-blur-xl">
    <div className="text-sm text-slate-400">{title}</div>
    <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
  </Card>
);

const MiniInfo = ({ label, value }) => (
  <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
  </div>
);

const RecordRow = ({ title, meta, amount, amountTone = 'text-white' }) => (
  <div className="rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-4">
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="text-xs text-slate-400">{meta}</div>
      </div>
      <div className={`font-semibold ${amountTone}`}>{amount}</div>
    </div>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-[24px] border border-dashed border-white/12 bg-slate-950/35 p-6 text-sm text-slate-400">{text}</div>
);

const InsightList = ({ items, emptyText }) => {
  if (!items.length) return <EmptyState text={emptyText} />;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
          <div className="font-medium text-white">{item.label || item.type || 'Insight'}</div>
          <div className="mt-2 text-sm leading-7 text-slate-300">{item.message}</div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
