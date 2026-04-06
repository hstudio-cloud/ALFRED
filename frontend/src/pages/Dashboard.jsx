import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToast } from "../hooks/use-toast";
import Sidebar from "../components/Sidebar";
import NanoAssistantPage from "../components/NanoAssistantPage";
import {
  BanksSection,
  CardsSection,
  ReportsSection,
} from "../components/DashboardFinanceSections";
import financeService from "../services/financeService";
import reportService from "../services/reportService";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileBarChart2,
  FileUp,
  Landmark,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  TrendingDown,
  UserRound,
  Users2,
  Wallet,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const scopeOptions = [
  { id: "general", label: "Geral" },
  { id: "personal", label: "Pessoal" },
  { id: "business", label: "Empresa" },
];

const navigationItems = [
  {
    id: "assistant",
    label: "Nano IA",
    icon: BrainCircuit,
    description: "Chat financeiro e assistente por voz",
    group: "Negocio",
  },
  {
    id: "overview",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Visao geral do financeiro",
    group: "Negocio",
  },
  {
    id: "transactions",
    label: "Movimentacoes",
    icon: ArrowLeftRight,
    description: "Entradas, saidas e filtros",
    group: "Negocio",
  },
  {
    id: "banks",
    label: "Bancos",
    icon: Landmark,
    description: "Contas bancarias e saldo",
    group: "Negocio",
  },
  {
    id: "cards",
    label: "Cartoes",
    icon: CreditCard,
    description: "Faturas, limites e uso",
    group: "Negocio",
  },
  {
    id: "contacts",
    label: "Contatos",
    icon: Users2,
    description: "Clientes e pagadores",
    group: "Negocio",
  },
  {
    id: "reports",
    label: "Relatorios",
    icon: FileBarChart2,
    description: "Analises e demonstrativos",
    group: "Negocio",
  },
  {
    id: "company",
    label: "Empresa",
    icon: Building2,
    description: "Dados do workspace",
    group: "Configuracoes",
  },
  {
    id: "profile",
    label: "Perfil",
    icon: UserRound,
    description: "Informacoes pessoais",
    group: "Configuracoes",
  },
  {
    id: "settings",
    label: "Configuracoes",
    icon: Settings2,
    description: "Categorias, alertas e rotina",
    group: "Configuracoes",
  },
];

const initialTransaction = {
  type: "expense",
  category: "Geral",
  amount: "",
  description: "",
  payment_method: "pix",
  account_scope: "business",
  account_id: "",
  card_id: "",
  date: "",
};

const initialAccount = {
  name: "",
  institution: "",
  account_type: "checking",
  account_scope: "business",
  initial_balance: "",
  color: "#b91c1c",
};

const initialCard = {
  name: "",
  institution: "",
  brand: "",
  account_scope: "business",
  limit_amount: "",
  closing_day: 1,
  due_day: 10,
  linked_account_id: "",
  color: "#ef4444",
};

const initialBill = {
  title: "",
  amount: "",
  type: "payable",
  due_date: "",
  category: "Geral",
  payment_method: "pix",
  account_scope: "business",
  description: "",
  client_name: "",
  recurring: false,
  recurrence_rule: "",
};

const initialCategory = {
  name: "",
  kind: "expense",
  color: "#b91c1c",
  account_scope: "both",
};

const initialReminder = {
  title: "",
  remind_at: "",
  description: "",
};

const initialCompanyForm = {
  name: "",
  subdomain: "",
  description: "",
  document_type: "cnpj",
  document: "",
  business_type: "servicos",
  tax_regime: "simples",
  address: "",
  complement: "",
  city: "",
  state: "",
  phone: "",
  website: "",
};

const initialProfileForm = {
  name: "",
  email: "",
  phone: "",
  role: "Administrador",
};

const initialSettingsForm = {
  notifications: true,
  assistant_voice: true,
  whatsapp_alerts: false,
  theme_mode: "light",
};

const pageFieldClass =
  "h-12 rounded-2xl border border-red-500/12 bg-black/30 px-4 text-sm text-zinc-100 outline-none transition focus:border-red-400/35";
const textAreaClass =
  "min-h-[120px] rounded-[24px] border border-red-500/12 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-400/35";
const actionButtonClass =
  "rounded-2xl bg-[#7f1d1d] px-5 text-white hover:bg-[#991b1b]";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } =
    useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [financialView, setFinancialView] = useState("general");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [reportOverview, setReportOverview] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [categoryReport, setCategoryReport] = useState([]);
  const [accountReport, setAccountReport] = useState([]);
  const [cashflowReport, setCashflowReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [automationInsights, setAutomationInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [statementImports, setStatementImports] = useState([]);

  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    subdomain: "",
    description: "",
  });
  const [transactionForm, setTransactionForm] = useState(initialTransaction);
  const [billForm, setBillForm] = useState(initialBill);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [reminderForm, setReminderForm] = useState(initialReminder);
  const [accountForm, setAccountForm] = useState(initialAccount);
  const [cardForm, setCardForm] = useState(initialCard);
  const [companyForm, setCompanyForm] = useState(initialCompanyForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [settingsForm, setSettingsForm] = useState(initialSettingsForm);

  const [reportPeriod, setReportPeriod] = useState("30d");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [transactionMethodFilter, setTransactionMethodFilter] = useState("all");
  const [statementFile, setStatementFile] = useState(null);
  const [statementImportResult, setStatementImportResult] = useState(null);
  const [uploadingStatement, setUploadingStatement] = useState(false);

  const loadAll = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return;

      setLoading(true);
      try {
        const [
          statsRes,
          financeOverview,
          transactionRes,
          billRes,
          categoryRes,
          reminderRes,
          accountRes,
          cardRes,
          reportOverviewRes,
          monthlyReportRes,
          categoryReportRes,
          accountReportRes,
          cashflowRes,
          statementImportsRes,
          dashboardInsightsRes,
        ] = await Promise.all([
          axios.get(
            `${API}/dashboard/stats?workspace_id=${workspaceId}&account_scope=${financialView}`,
          ),
          financeService.getOverview(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
          financeService.getTransactions(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
          financeService.getBills(workspaceId, {
            account_scope: financialView,
          }),
          financeService.getCategories(workspaceId, {
            account_scope: financialView,
          }),
          financeService.getReminders(workspaceId),
          financeService.getAccounts(workspaceId, {
            account_scope: financialView,
          }),
          financeService.getCards(workspaceId, {
            account_scope: financialView,
          }),
          reportService.getOverview(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
          reportService.getMonthly(workspaceId, {
            account_scope: financialView,
            months: 6,
          }),
          reportService.getByCategory(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
          reportService.getByAccount(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
          reportService.getCashflow(workspaceId, {
            account_scope: financialView,
          }),
          axios.get(`${API}/finances/imports?workspace_id=${workspaceId}`),
          axios.get(
            `${API}/dashboard/insights?workspace_id=${workspaceId}&account_scope=${financialView}`,
          ),
        ]);

        setStats(statsRes.data);
        setSummary(financeOverview.summary || null);
        setReport(financeOverview.report || null);
        setForecast(financeOverview.forecast || null);
        setAutomationInsights(financeOverview.alerts?.insights || []);
        setTransactions(transactionRes || []);
        setBills(billRes || []);
        setCategories(categoryRes || []);
        setReminders(reminderRes || []);
        setAccounts(accountRes || []);
        setCards(cardRes || []);
        setReportOverview(reportOverviewRes || null);
        setMonthlyReport(monthlyReportRes?.months || []);
        setCategoryReport(categoryReportRes?.categories || []);
        setAccountReport(accountReportRes?.accounts || []);
        setCashflowReport(cashflowRes || null);
        setStatementImports(statementImportsRes.data || []);
        setInsights(dashboardInsightsRes.data.insights || []);
      } catch (error) {
        console.error(error);
        toast({
          title: "Nao consegui carregar o painel",
          description: "Tente novamente em alguns segundos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [financialView, reportPeriod, toast],
  );

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const profile = currentWorkspace.settings?.company_profile || {};
    const notifications =
      currentWorkspace.settings?.features?.notifications ?? true;
    const assistantVoice =
      currentWorkspace.settings?.features?.assistant_voice ?? true;
    const whatsappAlerts =
      currentWorkspace.settings?.features?.whatsapp_alerts ?? false;
    const themeMode = user?.settings?.theme || "light";

    setCompanyForm({
      name: currentWorkspace.name || "",
      subdomain: currentWorkspace.subdomain || "",
      description: currentWorkspace.description || "",
      document_type: profile.document_type || "cnpj",
      document: profile.document || "",
      business_type: profile.business_type || "servicos",
      tax_regime: profile.tax_regime || "simples",
      address: profile.address || "",
      complement: profile.complement || "",
      city: profile.city || "",
      state: profile.state || "",
      phone: profile.phone || "",
      website: profile.website || "",
    });

    setSettingsForm({
      notifications,
      assistant_voice: assistantVoice,
      whatsapp_alerts: whatsappAlerts,
      theme_mode: themeMode,
    });
  }, [currentWorkspace, user?.settings?.theme]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.settings?.phone || "",
      role: user?.role === "admin" ? "Administrador" : "Membro",
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleWorkspaceChange = (workspaceId) => {
    const nextWorkspace = workspaces.find(
      (workspace) => workspace.id === workspaceId,
    );
    if (nextWorkspace) {
      switchWorkspace(nextWorkspace);
    }
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    try {
      await financeService.createTransaction(currentWorkspace.id, {
        ...transactionForm,
        account_id: transactionForm.account_id || null,
        card_id: transactionForm.card_id || null,
        amount: Number(transactionForm.amount),
        date: transactionForm.date || new Date().toISOString(),
      });
      setTransactionForm(initialTransaction);
      loadAll(currentWorkspace.id);
      toast({
        title: "Movimentacao salva",
        description: "A nova entrada ja foi adicionada ao painel.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar movimentacao",
        description: "Revise os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const submitBill = async (event) => {
    event.preventDefault();
    try {
      await financeService.createBill(currentWorkspace.id, {
        ...billForm,
        amount: Number(billForm.amount),
        due_date: billForm.due_date,
      });
      setBillForm(initialBill);
      loadAll(currentWorkspace.id);
      toast({
        title: "Conta registrada",
        description: "A conta entrou no calendario financeiro.",
      });
    } catch (error) {
      toast({
        title: "Erro ao registrar conta",
        description: "Nao foi possivel salvar essa conta agora.",
        variant: "destructive",
      });
    }
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    try {
      await financeService.createCategory(currentWorkspace.id, categoryForm);
      setCategoryForm(initialCategory);
      loadAll(currentWorkspace.id);
      toast({
        title: "Categoria criada",
        description: "A classificacao ja aparece nas telas do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar categoria",
        description: "Confira o nome da categoria e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const submitReminder = async (event) => {
    event.preventDefault();
    try {
      await financeService.createReminder(currentWorkspace.id, reminderForm);
      setReminderForm(initialReminder);
      loadAll(currentWorkspace.id);
      toast({
        title: "Lembrete criado",
        description: "O Nano vai considerar esse compromisso financeiro.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar lembrete",
        description: "Nao consegui salvar o lembrete agora.",
        variant: "destructive",
      });
    }
  };

  const submitWorkspace = async (event) => {
    event.preventDefault();
    const result = await createWorkspace(
      workspaceForm.name,
      workspaceForm.subdomain,
      workspaceForm.description,
    );
    if (result.success) {
      setWorkspaceForm({ name: "", subdomain: "", description: "" });
      toast({
        title: "Workspace criado",
        description: "Sua nova empresa ja esta pronta para uso.",
      });
    } else {
      toast({
        title: "Erro ao criar workspace",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const changeBillStatus = async (billId, status) => {
    try {
      await financeService.updateBill(currentWorkspace.id, billId, { status });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Nao consegui atualizar a conta",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    }
  };

  const toggleReminder = async (reminder) => {
    try {
      await financeService.updateReminder(currentWorkspace.id, reminder.id, {
        is_active: !reminder.is_active,
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: "Nao foi possivel trocar o status desse lembrete.",
        variant: "destructive",
      });
    }
  };

  const refreshReport = async (period) => {
    setReportPeriod(period);
    try {
      const [nextFinanceOverview, nextReportOverview, nextCategoryReport, nextAccountReport] = await Promise.all([
        financeService.getOverview(currentWorkspace.id, {
          account_scope: financialView,
          period,
        }),
        reportService.getOverview(currentWorkspace.id, {
          account_scope: financialView,
          period,
        }),
        reportService.getByCategory(currentWorkspace.id, {
          account_scope: financialView,
          period,
        }),
        reportService.getByAccount(currentWorkspace.id, {
          account_scope: financialView,
          period,
        }),
      ]);
      setReport(nextFinanceOverview.report || null);
      setSummary(nextFinanceOverview.summary || summary);
      setForecast(nextFinanceOverview.forecast || forecast);
      setAutomationInsights(nextFinanceOverview.alerts?.insights || []);
      setReportOverview(nextReportOverview || null);
      setCategoryReport(nextCategoryReport?.categories || []);
      setAccountReport(nextAccountReport?.accounts || []);
    } catch (error) {
      toast({
        title: "Erro ao atualizar relatorio",
        description: "Nao consegui aplicar esse periodo agora.",
        variant: "destructive",
      });
    }
  };

  const generateRecurringBills = async () => {
    try {
      await financeService.generateRecurringBills(currentWorkspace.id);
      toast({
        title: "Recorrencias geradas",
        description:
          "O Nano criou os proximos vencimentos com base nas regras atuais.",
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao gerar recorrencias",
        description: "Nao foi possivel montar os proximos vencimentos agora.",
        variant: "destructive",
      });
    }
  };

  const uploadStatement = async () => {
    if (!statementFile || !currentWorkspace?.id) return;

    try {
      setUploadingStatement(true);
      const formData = new FormData();
      formData.append("file", statementFile);

      const response = await axios.post(
        `${API}/finances/import-statement?workspace_id=${currentWorkspace.id}&account_scope=${financialView}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setStatementImportResult(response.data);
      setStatementFile(null);
      loadAll(currentWorkspace.id);
      toast({
        title: "Extrato recebido",
        description: "O arquivo ja entrou na fila de leitura do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao importar extrato",
        description:
          error?.response?.data?.detail ||
          "Nao foi possivel processar o arquivo enviado.",
        variant: "destructive",
      });
    } finally {
      setUploadingStatement(false);
    }
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    try {
      await financeService.createAccount(currentWorkspace.id, {
        ...accountForm,
        initial_balance: Number(accountForm.initial_balance || 0),
      });
      setAccountForm(initialAccount);
      loadAll(currentWorkspace.id);
      toast({
        title: "Conta criada",
        description: "A conta ja entrou no resumo financeiro do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: "Nao consegui salvar essa conta agora.",
        variant: "destructive",
      });
    }
  };

  const submitCard = async (event) => {
    event.preventDefault();
    try {
      await financeService.createCard(currentWorkspace.id, {
        ...cardForm,
        limit_amount: Number(cardForm.limit_amount || 0),
        closing_day: Number(cardForm.closing_day || 1),
        due_day: Number(cardForm.due_day || 10),
        linked_account_id: cardForm.linked_account_id || null,
      });
      setCardForm(initialCard);
      loadAll(currentWorkspace.id);
      toast({
        title: "Cartao criado",
        description: "O cartao ja entra na leitura de faturas e limite.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar cartao",
        description: "Nao consegui salvar esse cartao agora.",
        variant: "destructive",
      });
    }
  };

  const saveCompanySettings = async (event) => {
    event.preventDefault();

    try {
      await axios.put(`${API}/workspaces/${currentWorkspace.id}`, {
        name: companyForm.name,
        subdomain: companyForm.subdomain,
        description: companyForm.description,
        settings: {
          ...(currentWorkspace.settings || {}),
          branding: {
            ...(currentWorkspace.settings?.branding || {}),
            primary_color: "#b91c1c",
            secondary_color: "#7f1d1d",
          },
          company_profile: {
            document_type: companyForm.document_type,
            document: companyForm.document,
            business_type: companyForm.business_type,
            tax_regime: companyForm.tax_regime,
            address: companyForm.address,
            complement: companyForm.complement,
            city: companyForm.city,
            state: companyForm.state,
            phone: companyForm.phone,
            website: companyForm.website,
          },
          features: {
            ...(currentWorkspace.settings?.features || {}),
            notifications: settingsForm.notifications,
            assistant_voice: settingsForm.assistant_voice,
            whatsapp_alerts: settingsForm.whatsapp_alerts,
          },
        },
      });

      toast({
        title: "Dados da empresa atualizados",
        description: "As informacoes do workspace foram salvas.",
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao salvar empresa",
        description: "Nao foi possivel atualizar esse workspace agora.",
        variant: "destructive",
      });
    }
  };

  const saveProfileSettings = (event) => {
    event.preventDefault();
    toast({
      title: "Perfil preparado",
      description:
        "A interface de perfil foi atualizada. O salvamento completo do usuario sera ligado na proxima etapa.",
    });
  };

  const savePlatformSettings = (event) => {
    event.preventDefault();
    toast({
      title: "Preferencias atualizadas",
      description:
        "As configuracoes visuais e de automacao ficaram prontas para a proxima rodada de integracao.",
    });
  };

  const refreshAfterAssistantMessage = useCallback(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  const scopeLabel =
    scopeOptions.find((scope) => scope.id === financialView)?.label || "Geral";
  const activeSectionMeta =
    navigationItems.find((section) => section.id === activeSection) ||
    navigationItems[0];

  const totalIncome = summary?.income || 0;
  const totalExpenses = summary?.expenses || 0;
  const totalBalance = summary?.balance || 0;
  const monthlyResult = totalIncome - totalExpenses;
  const forecastCards = forecast?.forecasts || [];
  const activeAccounts = accounts.filter((item) => item.active !== false);
  const activeCards = cards.filter((item) => item.active !== false);
  const topExpenses = report?.top_expenses || [];
  const receivablesOpen = report?.receivables_open || 0;
  const payablesOpen = report?.payables_open || 0;
  const cardTransactions = transactions.filter(
    (item) => item.payment_method === "card",
  );
  const bankTransactions = transactions.filter((item) =>
    ["pix", "transfer", "boleto", "cash"].includes(item.payment_method),
  );
  const totalAccountBalance = activeAccounts.reduce(
    (total, item) => total + Number(item.balance || 0),
    0,
  );
  const totalCardInvoice = activeCards.reduce(
    (total, item) => total + Number(item.invoice_amount || 0),
    0,
  );
  const totalCardLimit = activeCards.reduce(
    (total, item) => total + Number(item.limit_amount || 0),
    0,
  );
  const reportKpis = reportOverview?.kpis || {};
  const accountLookup = useMemo(
    () =>
      Object.fromEntries(
        activeAccounts.map((account) => [account.id, account]),
      ),
    [activeAccounts],
  );
  const cardLookup = useMemo(
    () =>
      Object.fromEntries(activeCards.map((card) => [card.id, card])),
    [activeCards],
  );

  const openBills = [...bills]
    .filter((bill) => bill.status !== "paid" && bill.status !== "received")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const onboardingSteps = [
    {
      label: "Cadastrar uma conta bancaria",
      done: statementImports.length > 0,
    },
    {
      label: "Registrar a primeira movimentacao",
      done: transactions.length > 0,
    },
    {
      label: "Criar categorias principais",
      done: categories.length > 0,
    },
    {
      label: "Ativar alertas e lembretes",
      done: reminders.length > 0,
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.done).length;
  const completionPercent = onboardingSteps.length
    ? Math.round((completedSteps / onboardingSteps.length) * 100)
    : 0;

  const sortedTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 200),
    [transactions],
  );

  const filteredTransactions = sortedTransactions.filter((transaction) => {
    const text = `${transaction.description || ""} ${transaction.category || ""}`.toLowerCase();
    const searchMatch = text.includes(transactionSearch.toLowerCase());
    const typeMatch =
      transactionTypeFilter === "all" ||
      transaction.type === transactionTypeFilter;
    const methodMatch =
      transactionMethodFilter === "all" ||
      transaction.payment_method === transactionMethodFilter;
    return searchMatch && typeMatch && methodMatch;
  });

  const uniqueContacts = useMemo(() => {
    const map = new Map();
    bills.forEach((bill) => {
      if (!bill.client_name) return;
      if (!map.has(bill.client_name)) {
        map.set(bill.client_name, {
          name: bill.client_name,
          scope: bill.account_scope,
          total: 0,
          items: 0,
        });
      }
      const item = map.get(bill.client_name);
      item.total += Number(bill.amount || 0);
      item.items += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [bills]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        income: 0,
        expense: 0,
      };
    });

    transactions.forEach((transaction) => {
      const itemDate = new Date(transaction.date);
      const key = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      const bucket = buckets.find((entry) => entry.key === key);
      if (!bucket) return;
      if (transaction.type === "income") bucket.income += transaction.amount;
      if (transaction.type === "expense") bucket.expense += transaction.amount;
    });

    return buckets;
  }, [transactions]);

  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const dayBills = openBills.filter(
        (bill) => new Date(bill.due_date).toISOString().slice(0, 10) === dateKey,
      );
      return {
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        dueCount: dayBills.length,
      };
    });
  }, [openBills]);

  const metrics = [
    {
      title: "Receitas do mes",
      value: currencyFormatter.format(totalIncome),
      direction: "up",
    },
    {
      title: "Despesas do mes",
      value: currencyFormatter.format(totalExpenses),
      direction: "down",
    },
    {
      title: "Resultado do mes",
      value: currencyFormatter.format(monthlyResult),
      direction: monthlyResult >= 0 ? "up" : "down",
    },
    {
      title: "Saldo em conta",
      value: currencyFormatter.format(totalBalance),
      direction: "neutral",
    },
  ];
  const reportTrendData = useMemo(
    () =>
      monthlyReport.length
        ? monthlyReport.map((item) => {
            const [year, month] = item.month.split("-");
            const labelDate = new Date(Number(year), Number(month) - 1, 1);
            return {
              key: item.month,
              label: labelDate.toLocaleDateString("pt-BR", {
                month: "short",
                year: "2-digit",
              }),
              income: item.income,
              expense: item.expenses,
            };
          })
        : monthlyTrend,
    [monthlyReport, monthlyTrend],
  );
  const cashflowItems = cashflowReport?.forecasts || forecastCards;
  const reportMessage =
    report?.savings_suggestion?.message ||
    "O Nano cruza receitas, despesas, contas e recorrencias para sugerir ajustes de rota no financeiro.";

  const renderOverview = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Dashboard"
        title="Visao geral das suas financas"
        description="Um cockpit limpo para acompanhar entradas, saidas, contas, agenda financeira e o que merece acao no Nano."
      />

      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.98fr]">
        <SurfacePanel
          title="Receitas x Despesas"
          action={<GhostChip>Ultimos 6 meses</GhostChip>}
        >
          <TrendChart data={monthlyTrend} />
        </SurfacePanel>

        <SurfacePanel
          title="Calendario Financeiro"
          action={
            <div className="flex items-center gap-2 text-sm text-[#6e6259]">
              <button
                type="button"
                className="rounded-xl border border-[#eadfd6] p-2 hover:bg-[#fbf4ef]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[108px] text-center font-medium">
                {new Date().toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                className="rounded-xl border border-[#eadfd6] p-2 hover:bg-[#fbf4ef]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <CalendarPanel days={calendarDays} />
        </SurfacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SurfacePanel title="Saldo Consolidado">
          <SummaryRow
            label="Total"
            value={currencyFormatter.format(totalBalance)}
            valueClass="text-[#14532d]"
            strong
          />
          <div className="mt-8 grid grid-cols-5 gap-2 text-center text-xs text-[#94867d]">
            {monthlyTrend.slice(-5).map((item) => (
              <div key={item.key}>
                <div className="mx-auto mb-3 h-1 rounded-full bg-gradient-to-r from-[#fca5a5] to-[#b91c1c]" />
                {item.label}
              </div>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel title="Cartoes de Credito">
          {cardTransactions.length ? (
            <div className="space-y-3">
              <SummaryRow
                label="Movimentacoes no cartao"
                value={String(cardTransactions.length)}
              />
              <SummaryRow
                label="Volume no periodo"
                value={currencyFormatter.format(
                  cardTransactions.reduce((total, item) => total + item.amount, 0),
                )}
              />
              <SummaryRow
                label="Maior fatura projetada"
                value={currencyFormatter.format(
                  Math.max(
                    ...cardTransactions.map((transaction) => transaction.amount),
                    0,
                  ),
                )}
              />
            </div>
          ) : (
            <CenteredEmptyState
              icon={CreditCard}
              title="Nenhum cartao cadastrado"
              description="Comece adicionando movimentacoes no cartao para acompanhar faturas e limites."
            />
          )}
        </SurfacePanel>

        <SurfacePanel title="Top 5 Despesas">
          {topExpenses.length ? (
            <div className="space-y-3">
              {topExpenses.slice(0, 5).map((item) => (
                <InfoRow
                  key={item.category}
                  title={item.category}
                  subtitle="Participacao nas saidas"
                  value={currencyFormatter.format(item.amount)}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={TrendingDown}
              title="Nenhuma despesa para exibir"
              description="Assim que novas saidas entrarem, o Nano mostra as categorias mais pesadas."
            />
          )}
        </SurfacePanel>
      </div>

      <SurfacePanel title="Alertas e Pendencias">
        {openBills.length || insights.length || automationInsights.length ? (
          <div className="space-y-3">
            {openBills.slice(0, 4).map((bill) => (
              <AlertRow
                key={bill.id}
                title={bill.title}
                message={`${bill.type === "receivable" ? "Receber" : "Pagar"} ${currencyFormatter.format(bill.amount)} em ${new Date(bill.due_date).toLocaleDateString("pt-BR")}`}
                tone="warning"
              />
            ))}
            {[...insights, ...automationInsights].slice(0, 3).map((item, index) => (
              <AlertRow
                key={`${item.type || "item"}-${index}`}
                title={item.label || "Leitura do Nano"}
                message={item.message}
                tone="neutral"
              />
            ))}
          </div>
        ) : (
          <AlertRow
            title="Tudo certo"
            message="Nenhuma pendencia critica foi encontrada na visao atual."
            tone="positive"
          />
        )}
      </SurfacePanel>
    </SectionLayout>
  );

  const renderTransactions = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Movimentacoes"
        title="Entradas, saidas e transferencias"
        description="Copiamos a fluidez operacional do Fingu, mas com o Nano focado na sua logica financeira e no assistente inteligente."
        action={
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveSection("reports")}
              className="h-12 rounded-2xl border-[#eadfd6] bg-white px-5 text-[#4b4039] hover:bg-[#fbf4ef]"
            >
              <FileUp className="mr-2 h-4.5 w-4.5" />
              Importar
            </Button>
            <Button type="button" className={`h-12 ${actionButtonClass}`}>
              <Plus className="mr-2 h-4.5 w-4.5" />
              Adicionar Movimentacao
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfacePanel title="Nova movimentacao">
          <form onSubmit={submitTransaction} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                className={pageFieldClass}
                value={transactionForm.type}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    type: event.target.value,
                  })
                }
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
              <select
                className={pageFieldClass}
                value={transactionForm.account_scope}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    account_scope: event.target.value,
                  })
                }
              >
                <option value="business">Empresa</option>
                <option value="personal">Pessoal</option>
              </select>
            </div>

            <Input
              placeholder="Descricao da movimentacao"
              value={transactionForm.description}
              onChange={(event) =>
                setTransactionForm({
                  ...transactionForm,
                  description: event.target.value,
                })
              }
              className={pageFieldClass}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Categoria"
                value={transactionForm.category}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    category: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={transactionForm.amount}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    amount: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                className={pageFieldClass}
                value={transactionForm.account_id}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    account_id: event.target.value,
                  })
                }
              >
                <option value="">Selecionar conta</option>
                {activeAccounts
                  .filter(
                    (account) =>
                      financialView === "general" ||
                      account.account_scope === financialView,
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
              <select
                className={pageFieldClass}
                value={transactionForm.card_id}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    card_id: event.target.value,
                  })
                }
              >
                <option value="">Sem cartao</option>
                {activeCards
                  .filter(
                    (card) =>
                      financialView === "general" ||
                      card.account_scope === financialView,
                  )
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                className={pageFieldClass}
                value={transactionForm.payment_method}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    payment_method: event.target.value,
                  })
                }
              >
                <option value="pix">Pix</option>
                <option value="card">Cartao</option>
                <option value="boleto">Boleto</option>
                <option value="transfer">Transferencia</option>
                <option value="cash">Dinheiro</option>
                <option value="other">Outro</option>
              </select>
              <Input
                type="datetime-local"
                value={transactionForm.date}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    date: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
            </div>

            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Salvar movimentacao
            </Button>
          </form>
        </SurfacePanel>

        <SurfacePanel title="Historico financeiro">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.4fr_0.4fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9f9188]" />
              <Input
                placeholder="Buscar movimentacoes..."
                value={transactionSearch}
                onChange={(event) => setTransactionSearch(event.target.value)}
                className="h-12 rounded-2xl border-[#eadfd6] bg-[#fffdf9] pl-11 text-[#2d241f]"
              />
            </div>
            <select
              value={transactionTypeFilter}
              onChange={(event) => setTransactionTypeFilter(event.target.value)}
              className={pageFieldClass}
            >
              <option value="all">Tipo</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <select
              value={transactionMethodFilter}
              onChange={(event) => setTransactionMethodFilter(event.target.value)}
              className={pageFieldClass}
            >
              <option value="all">Metodo</option>
              <option value="pix">Pix</option>
              <option value="card">Cartao</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferencia</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-[#eadfd6] bg-white">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr] gap-3 border-b border-[#f0e6de] px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8e7f76]">
              <span>Descricao</span>
              <span>Data</span>
              <span>Tipo</span>
              <span>Metodo</span>
              <span className="text-right">Valor</span>
            </div>
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr] gap-3 border-b border-[#f6eee8] px-4 py-4 text-sm text-[#3d312b] last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-[#1f1814]">
                      {transaction.description || transaction.category}
                    </div>
                    <div className="mt-1 text-xs text-[#918279]">
                      {transaction.category} • {transaction.account_scope}
                    </div>
                  </div>
                  <span>{new Date(transaction.date).toLocaleDateString("pt-BR")}</span>
                  <span className="capitalize">
                    {transaction.type === "income" ? "Receita" : "Despesa"}
                  </span>
                  <span className="capitalize">{transaction.payment_method}</span>
                  <span
                    className={`text-right font-semibold ${
                      transaction.type === "income"
                        ? "text-[#166534]"
                        : "text-[#b91c1c]"
                    }`}
                  >
                    {currencyFormatter.format(transaction.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center text-sm text-[#9e8f85]">
                Nenhuma movimentacao encontrada.
              </div>
            )}
          </div>
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const renderBanks = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Instituicoes Bancarias"
        title="Gerencie contas bancarias e visualize saldos"
        description="O Nano ainda nao faz conciliacao bancaria completa, mas ja organiza extratos, entradas e saidas para preparar essa camada."
        action={
          <Button type="button" className={`h-12 ${actionButtonClass}`}>
            <Plus className="mr-2 h-4.5 w-4.5" />
            Adicionar Conta
          </Button>
        }
      />

      <SurfacePanel>
        {statementImports.length ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatMiniCard
                label="Extratos importados"
                value={String(statementImports.length)}
              />
              <StatMiniCard
                label="Movimentacoes bancarias"
                value={String(bankTransactions.length)}
              />
              <StatMiniCard
                label="Saldo rastreado"
                value={currencyFormatter.format(totalBalance)}
              />
            </div>

            <div className="space-y-3">
              {statementImports.slice(0, 4).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.file_name}
                  subtitle={`${item.file_type} • ${item.status}`}
                  value={`${item.row_count || 0} linhas`}
                />
              ))}
            </div>
          </div>
        ) : (
          <LargeEmptyState
            icon={Landmark}
            title="Nenhum banco cadastrado"
            description="Adicione sua primeira conta bancaria para centralizar saldos e acompanhar movimentos."
            bullets={[
              "Centralize os saldos de todas as suas contas",
              "Acompanhe a evolucao do patrimonio",
              "Classifique e organize suas movimentacoes",
            ]}
            primaryActionLabel="Adicionar Banco"
          />
        )}
      </SurfacePanel>
    </SectionLayout>
  );

  const renderCards = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Cartoes de Credito"
        title="Gerencie seus cartoes, limites e faturas"
        description="A logica do Nano continua moderna: cartoes ajudam a explicar seu fluxo mensal, previsao de fatura e parcelamentos."
        action={
          <Button type="button" className={`h-12 ${actionButtonClass}`}>
            <Plus className="mr-2 h-4.5 w-4.5" />
            Adicionar Cartao
          </Button>
        }
      />

      <SurfacePanel>
        {cardTransactions.length ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              {cardTransactions.slice(0, 6).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.description || item.category}
                  subtitle={`${item.category} • ${new Date(item.date).toLocaleDateString("pt-BR")}`}
                  value={currencyFormatter.format(item.amount)}
                />
              ))}
            </div>
            <div className="rounded-[28px] border border-[#eadfd6] bg-[#fff8f4] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9c8e85]">
                leitura do cartao
              </p>
              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Total no cartao"
                  value={currencyFormatter.format(
                    cardTransactions.reduce(
                      (total, item) => total + item.amount,
                      0,
                    ),
                  )}
                />
                <SummaryRow
                  label="Lancamentos"
                  value={String(cardTransactions.length)}
                />
                <SummaryRow
                  label="Maior compra"
                  value={currencyFormatter.format(
                    Math.max(...cardTransactions.map((item) => item.amount), 0),
                  )}
                />
              </div>
            </div>
          </div>
        ) : (
          <LargeEmptyState
            icon={CreditCard}
            title="Nenhum cartao cadastrado"
            description="Comece adicionando seu primeiro cartao de credito para prever proximas faturas."
            bullets={[
              "Acompanhe o limite disponivel em tempo real",
              "Preveja o valor das proximas faturas",
              "Controle seus parcelamentos de forma inteligente",
            ]}
            primaryActionLabel="Adicionar Cartao"
          />
        )}
      </SurfacePanel>
    </SectionLayout>
  );

  const renderContacts = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Contatos"
        title="Pessoas e empresas ligadas ao financeiro"
        description="O Nano usa quem paga, quem recebe e quem aparece nas contas para formar uma visao mais operacional do seu caixa."
      />

      <SurfacePanel title="Contatos financeiros">
        {uniqueContacts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {uniqueContacts.map((contact) => (
              <div
                key={contact.name}
                className="rounded-[24px] border border-[#eadfd6] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1f1814]">{contact.name}</p>
                    <p className="text-sm text-[#8a7c73]">
                      {contact.scope === "personal" ? "Pessoal" : "Empresa"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#7f1d1d]">
                      {currencyFormatter.format(contact.total)}
                    </p>
                    <p className="text-xs text-[#9d8e85]">
                      {contact.items} registro(s)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CenteredEmptyState
            icon={Users2}
            title="Nenhum contato financeiro encontrado"
            description="Assim que contas e cobrancas tiverem origem ou cliente, essa lista aparece aqui."
          />
        )}
      </SurfacePanel>
    </SectionLayout>
  );

  const renderReports = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Relatorios"
        title="Analises detalhadas e demonstrativos financeiros"
        description="A dinamica e mais limpa, mas a leitura segue moderna: relatorios, previsoes, importacao de extrato e economia sugerida."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl border-[#eadfd6] bg-white px-5 text-[#4b4039] hover:bg-[#fbf4ef]"
          >
            Exportar PDF
          </Button>
        }
      />

      <SurfacePanel>
        <div className="grid gap-3 xl:grid-cols-5">
          {["7d", "30d", "90d", "year"].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => refreshReport(period)}
              className={`h-12 rounded-2xl border px-4 text-sm font-medium transition ${
                reportPeriod === period
                  ? "border-[#f0cfd1] bg-[#f9e8e8] text-[#991b1b]"
                  : "border-[#eadfd6] bg-white text-[#4b4039] hover:bg-[#fbf4ef]"
              }`}
            >
              {period}
            </button>
          ))}
          <label className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-[#e2d4cb] bg-[#fffaf6] px-4 text-sm text-[#85776e]">
            <input
              type="file"
              accept=".csv,.xls,.xlsx,.pdf"
              onChange={(event) =>
                setStatementFile(event.target.files?.[0] || null)
              }
              className="hidden"
            />
            Escolher extrato
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={uploadStatement}
            disabled={!statementFile || uploadingStatement}
            className={`h-12 ${actionButtonClass}`}
          >
            {uploadingStatement ? "Lendo arquivo..." : "Importar extrato"}
          </Button>
          <GhostChip>{scopeLabel}</GhostChip>
          <GhostChip>{report?.period || reportPeriod}</GhostChip>
        </div>
      </SurfacePanel>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          title="Balanco do periodo"
          value={currencyFormatter.format(report?.balance || 0)}
          direction={(report?.balance || 0) >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Contas a pagar"
          value={currencyFormatter.format(payablesOpen)}
          direction="down"
        />
        <StatCard
          title="Contas a receber"
          value={currencyFormatter.format(receivablesOpen)}
          direction="up"
        />
        <StatCard
          title="Economia sugerida"
          value={currencyFormatter.format(
            report?.savings_suggestion?.estimated_value || 0,
          )}
          direction="neutral"
        />
      </div>

      <SurfacePanel title="DRE - Demonstrativo de Resultado">
        <div className="overflow-auto rounded-[24px] border border-[#eadfd6]">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.1fr_repeat(4,0.7fr)] gap-3 border-b border-[#f0e6de] bg-[#fffaf6] px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8e7f76]">
              <span>Conta</span>
              <span>Receita</span>
              <span>Despesa</span>
              <span>Saldo</span>
              <span>Total</span>
            </div>
            <DreRow
              label="Receita bruta"
              income={totalIncome}
              expense={0}
              balance={totalIncome}
            />
            <DreRow
              label="Despesas operacionais"
              income={0}
              expense={totalExpenses}
              balance={-totalExpenses}
              negative
            />
            {topExpenses.slice(0, 4).map((item) => (
              <DreRow
                key={item.category}
                label={item.category}
                income={0}
                expense={item.amount}
                balance={-item.amount}
                negative
              />
            ))}
          </div>
        </div>
      </SurfacePanel>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfacePanel title="Leitura do Nano">
          <div className="space-y-4 text-sm leading-7 text-[#5d514a]">
            <p>
              {report?.savings_suggestion?.message ||
                "O Nano cruza receitas, despesas e contas para sugerir ajustes de rota no financeiro."}
            </p>
            <div className="rounded-[24px] border border-[#f0d7d7] bg-[#fff4f4] p-4 text-[#7f1d1d]">
              Total de transacoes no periodo: {report?.transactions_count || 0}.
              Total de contas registradas: {report?.bills_count || 0}.
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel title="Importacoes recentes">
          {statementImportResult?.preview_rows?.length ? (
            <div className="space-y-3">
              {statementImportResult.preview_rows.slice(0, 5).map((row, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-[#eadfd6] bg-[#fffdf9] p-4"
                >
                  {Object.entries(row)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <div key={key} className="text-xs text-[#6d615a]">
                        <span className="font-semibold text-[#9e8f85]">{key}:</span>{" "}
                        {String(value || "-")}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ) : statementImports.length ? (
            <div className="space-y-3">
              {statementImports.map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.file_name}
                  subtitle={`${item.file_type} • ${item.status}`}
                  value={`${item.row_count || 0} linhas`}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={FileUp}
              title="Nenhum extrato importado"
              description="CSV, XLS, XLSX e PDF aparecem aqui assim que entrarem na fila do Nano."
            />
          )}
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const renderCompany = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Configuracoes da Empresa"
        title="Gerencie as informacoes e preferencias da empresa"
        description="A tela segue a organizacao do Fingu, mas mantendo a estrutura moderna do Nano e a futura expansao para automacoes."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SurfacePanel title="Informacoes da empresa">
          <form onSubmit={saveCompanySettings} className="grid gap-4">
            <Input
              placeholder="Nome da empresa"
              value={companyForm.name}
              onChange={(event) =>
                setCompanyForm({ ...companyForm, name: event.target.value })
              }
              className={pageFieldClass}
            />
            <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr]">
              <Input
                placeholder="Subdominio"
                value={companyForm.subdomain}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    subdomain: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <select
                className={pageFieldClass}
                value={companyForm.document_type}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    document_type: event.target.value,
                  })
                }
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
              </select>
              <Input
                placeholder="Documento"
                value={companyForm.document}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    document: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className={pageFieldClass}
                value={companyForm.business_type}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    business_type: event.target.value,
                  })
                }
              >
                <option value="servicos">Servicos</option>
                <option value="comercio">Comercio</option>
                <option value="industria">Industria</option>
                <option value="digital">Digital</option>
              </select>
              <select
                className={pageFieldClass}
                value={companyForm.tax_regime}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    tax_regime: event.target.value,
                  })
                }
              >
                <option value="simples">Simples Nacional</option>
                <option value="presumido">Lucro Presumido</option>
                <option value="real">Lucro Real</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Endereco"
                value={companyForm.address}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    address: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Input
                placeholder="Complemento"
                value={companyForm.complement}
                onChange={(event) =>
                  setCompanyForm({
                    ...companyForm,
                    complement: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Cidade"
                value={companyForm.city}
                onChange={(event) =>
                  setCompanyForm({ ...companyForm, city: event.target.value })
                }
                className={pageFieldClass}
              />
              <Input
                placeholder="Estado"
                value={companyForm.state}
                onChange={(event) =>
                  setCompanyForm({ ...companyForm, state: event.target.value })
                }
                className={pageFieldClass}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Telefone comercial"
                value={companyForm.phone}
                onChange={(event) =>
                  setCompanyForm({ ...companyForm, phone: event.target.value })
                }
                className={pageFieldClass}
              />
              <Input
                placeholder="Website"
                value={companyForm.website}
                onChange={(event) =>
                  setCompanyForm({ ...companyForm, website: event.target.value })
                }
                className={pageFieldClass}
              />
            </div>
            <Textarea
              placeholder="Descricao da empresa"
              value={companyForm.description}
              onChange={(event) =>
                setCompanyForm({
                  ...companyForm,
                  description: event.target.value,
                })
              }
              className={textAreaClass}
            />
            <div className="flex justify-end">
              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Salvar alteracoes
              </Button>
            </div>
          </form>
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel title="Equipe">
            <div className="rounded-[24px] border border-[#eadfd6] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8e7e7] font-semibold text-[#7f1d1d]">
                  {(user?.name || "N").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#1f1814]">
                    {user?.name || "Administrador"}
                  </p>
                  <p className="text-sm text-[#877971]">{user?.email}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff8f4] px-3 py-3 text-sm text-[#5e5149]">
                <span>Membros com acesso</span>
                <span className="font-semibold text-[#7f1d1d]">
                  {currentWorkspace?.members?.length || 1}
                </span>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel title="Registros de acoes">
            <div className="space-y-3">
              <InfoRow
                title="Ultima atualizacao do workspace"
                subtitle="Salve os dados acima para manter a empresa alinhada"
                value={new Date(
                  currentWorkspace?.created_at || new Date(),
                ).toLocaleDateString("pt-BR")}
              />
              <InfoRow
                title="Cor principal"
                subtitle="Tema vermelho definido para o Nano"
                value="Vermelho"
              />
            </div>
          </SurfacePanel>
        </div>
      </div>
    </SectionLayout>
  );

  const renderProfile = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Perfil do Usuario"
        title="Gerencie suas informacoes pessoais e seguranca"
        description="A tela fica mais limpa e clara, no mesmo ritmo do Fingu, mas pronta para evoluir junto com as automacoes do Nano."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SurfacePanel title="Dados do perfil">
          <form onSubmit={saveProfileSettings} className="space-y-5">
            <div className="flex items-center gap-4 rounded-[24px] border border-[#eadfd6] bg-[#fff8f4] p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7f1d1d] text-lg font-semibold text-white">
                {(profileForm.name || "N").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1f1814]">Foto de perfil</p>
                <p className="text-sm text-[#84776f]">
                  PNG ou JPG. Recomendado 256x256.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-[#eadfd6] bg-white px-4 text-[#4b4039] hover:bg-[#fbf4ef]"
              >
                Alterar
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Nome de exibicao"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, name: event.target.value })
                }
                className={pageFieldClass}
              />
              <Input
                placeholder="Telefone"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, phone: event.target.value })
                }
                className={pageFieldClass}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, email: event.target.value })
                }
                className={pageFieldClass}
                disabled
              />
              <Input
                placeholder="Cargo"
                value={profileForm.role}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, role: event.target.value })
                }
                className={pageFieldClass}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Salvar alteracoes
              </Button>
            </div>
          </form>
        </SurfacePanel>

        <SurfacePanel title="Seguranca">
          <div className="space-y-4">
            <SecurityCard
              title="Autenticacao em dois fatores"
              description="Proteja sua conta com uma segunda camada de seguranca."
              actionLabel="Ativar"
            />
            <SecurityCard
              title="Alterar senha"
              description="Mantenha sua senha segura e atualizada."
              actionLabel="Alterar"
            />
          </div>
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const renderSettings = () => (
    <SectionLayout
      rail={
        <OnboardingRail
          steps={onboardingSteps}
          percent={completionPercent}
          completedSteps={completedSteps}
        />
      }
    >
      <PageHeader
        eyebrow="Configuracoes"
        title="Rotina, categorias e automacoes do Nano"
        description="Aqui entra a parte mais moderna da nossa logica: classificacao, alertas, lembretes e preparacao do assistente."
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <SurfacePanel title="Preferencias da plataforma">
          <form onSubmit={savePlatformSettings} className="space-y-5">
            <ToggleRow
              label="Notificacoes do sistema"
              helper="Avisos de vencimento, extratos e movimentacoes importantes."
              checked={settingsForm.notifications}
              onChange={() =>
                setSettingsForm((current) => ({
                  ...current,
                  notifications: !current.notifications,
                }))
              }
            />
            <ToggleRow
              label="Voz do assistente"
              helper="Deixa o Nano pronto para retomarmos a camada premium depois."
              checked={settingsForm.assistant_voice}
              onChange={() =>
                setSettingsForm((current) => ({
                  ...current,
                  assistant_voice: !current.assistant_voice,
                }))
              }
            />
            <ToggleRow
              label="Alertas por WhatsApp"
              helper="Prepara a esteira de cobranca e lembrete automatizado."
              checked={settingsForm.whatsapp_alerts}
              onChange={() =>
                setSettingsForm((current) => ({
                  ...current,
                  whatsapp_alerts: !current.whatsapp_alerts,
                }))
              }
            />

            <div className="rounded-[24px] border border-[#eadfd6] bg-[#fff8f4] p-4">
              <p className="text-sm font-semibold text-[#1f1814]">Tema visual</p>
              <p className="mt-1 text-sm text-[#857870]">
                O painel agora usa o tema claro com acento vermelho, inspirado no ritmo do Fingu.
              </p>
            </div>

            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Salvar preferencias
            </Button>
          </form>
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel title="Categorias">
            <form onSubmit={submitCategory} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Nome da categoria"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      name: event.target.value,
                    })
                  }
                  className={pageFieldClass}
                />
                <Input
                  type="color"
                  value={categoryForm.color}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      color: event.target.value,
                    })
                  }
                  className="h-12 rounded-2xl border border-[#eadfd6] bg-white px-2"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className={pageFieldClass}
                  value={categoryForm.kind}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      kind: event.target.value,
                    })
                  }
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="both">Ambos</option>
                </select>
                <select
                  className={pageFieldClass}
                  value={categoryForm.account_scope}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      account_scope: event.target.value,
                    })
                  }
                >
                  <option value="both">Ambos</option>
                  <option value="business">Empresa</option>
                  <option value="personal">Pessoal</option>
                </select>
              </div>
              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Criar categoria
              </Button>
            </form>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {categories.length ? (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-[22px] border border-[#eadfd6] bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#1f1814]">
                        {category.name}
                      </p>
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#8e8077]">
                      {category.kind} • {category.account_scope}
                    </p>
                  </div>
                ))
              ) : (
                <CenteredEmptyState
                  icon={Target}
                  title="Nenhuma categoria criada"
                  description="As categorias ajudam o Nano a destacar onde a margem esta sendo pressionada."
                />
              )}
            </div>
          </SurfacePanel>

          <SurfacePanel
            title="Lembretes e automacoes"
            action={
              <Button
                type="button"
                variant="outline"
                onClick={generateRecurringBills}
                className="h-11 rounded-2xl border-[#eadfd6] bg-white px-4 text-[#4b4039] hover:bg-[#fbf4ef]"
              >
                Gerar recorrencias
              </Button>
            }
          >
            <form onSubmit={submitReminder} className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
              <Input
                placeholder="Titulo do lembrete"
                value={reminderForm.title}
                onChange={(event) =>
                  setReminderForm({
                    ...reminderForm,
                    title: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Input
                type="datetime-local"
                value={reminderForm.remind_at}
                onChange={(event) =>
                  setReminderForm({
                    ...reminderForm,
                    remind_at: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Salvar
              </Button>
            </form>

            <div className="mt-5 space-y-3">
              {reminders.length ? (
                reminders.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between gap-4 rounded-[22px] border border-[#eadfd6] bg-white p-4"
                  >
                    <div>
                      <p className="font-semibold text-[#1f1814]">
                        {reminder.title}
                      </p>
                      <p className="text-sm text-[#8a7c73]">
                        {new Date(reminder.remind_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleReminder(reminder)}
                      className="h-10 rounded-2xl border-[#eadfd6] bg-[#fffaf6] px-4 text-[#4b4039] hover:bg-[#fbf4ef]"
                    >
                      {reminder.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                ))
              ) : (
                <CenteredEmptyState
                  icon={Bell}
                  title="Nenhum lembrete criado"
                  description="Use esta area para estruturar a agenda financeira do Nano."
                />
              )}

              {[...automationInsights].slice(0, 2).map((item, index) => (
                <AlertRow
                  key={`${item.type || "auto"}-${index}`}
                  title={item.label || "Automacao sugerida"}
                  message={item.message}
                  tone="neutral"
                />
              ))}
            </div>
          </SurfacePanel>
        </div>
      </div>
    </SectionLayout>
  );

  const renderAssistant = () => (
    <div className="h-full overflow-hidden">
      <NanoAssistantPage
        financialView={financialView}
        onAfterMessage={refreshAfterAssistantMessage}
        userName={user?.name}
        transactions={transactions}
        reminders={reminders}
        bills={bills}
      />
    </div>
  );

  const sectionContent = {
    overview: renderOverview(),
    transactions: renderTransactions(),
    banks: (
      <BanksSection
        currencyFormatter={currencyFormatter}
        scopeLabel={scopeLabel}
        activeAccounts={activeAccounts}
        statementImports={statementImports}
        totalAccountBalance={totalAccountBalance}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        submitAccount={submitAccount}
      />
    ),
    cards: (
      <CardsSection
        currencyFormatter={currencyFormatter}
        scopeLabel={scopeLabel}
        activeAccounts={activeAccounts}
        activeCards={activeCards}
        totalCardLimit={totalCardLimit}
        totalCardInvoice={totalCardInvoice}
        cardTransactions={cardTransactions}
        cardLookup={cardLookup}
        cardForm={cardForm}
        setCardForm={setCardForm}
        submitCard={submitCard}
      />
    ),
    contacts: renderContacts(),
    reports: (
      <ReportsSection
        currencyFormatter={currencyFormatter}
        scopeLabel={scopeLabel}
        reportPeriod={reportPeriod}
        refreshReport={refreshReport}
        statementFile={statementFile}
        setStatementFile={setStatementFile}
        uploadStatement={uploadStatement}
        uploadingStatement={uploadingStatement}
        reportKpis={reportKpis}
        trendData={reportTrendData}
        cashflowItems={cashflowItems}
        categoryReport={categoryReport}
        accountReport={accountReport}
        statementImportResult={statementImportResult}
        statementImports={statementImports}
        reportMessage={reportMessage}
        openBills={openBills}
      />
    ),
    company: renderCompany(),
    profile: renderProfile(),
    settings: renderSettings(),
    assistant: renderAssistant(),
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.22),_transparent_30%),linear-gradient(180deg,_#050101_0%,_#0b0204_42%,_#120406_100%)] px-6 py-10 text-zinc-100">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Workspace
            </p>
            <h1 className="text-4xl font-semibold text-white">
              Crie ou selecione uma empresa para comecar
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400">
              O novo layout do Nano fica muito melhor quando o workspace ja esta
              criado, porque ai o painel monta dashboard, movimentacoes e relatorios
              com base no seu contexto.
            </p>
          </div>

          <Card className="rounded-[32px] border border-red-500/12 bg-black/30 p-6 shadow-[0_18px_60px_rgba(20,2,6,0.45)]">
            <form onSubmit={submitWorkspace} className="space-y-4">
              <Input
                placeholder="Nome da empresa"
                value={workspaceForm.name}
                onChange={(event) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    name: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Input
                placeholder="Subdominio"
                value={workspaceForm.subdomain}
                onChange={(event) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    subdomain: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <Textarea
                placeholder="Descricao"
                value={workspaceForm.description}
                onChange={(event) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    description: event.target.value,
                  })
                }
                className={textAreaClass}
              />
              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Criar workspace
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[radial-gradient(circle_at_16%_18%,_rgba(127,29,29,0.20),_transparent_24%),radial-gradient(circle_at_72%_78%,_rgba(69,10,10,0.18),_transparent_28%),linear-gradient(180deg,_#070102_0%,_#0b0204_42%,_#140406_100%)] text-zinc-100 ${
        activeSection === "assistant" ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <Sidebar
        items={navigationItems}
        activeItem={activeSection}
        onSelectItem={setActiveSection}
        workspaceName={currentWorkspace.name}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspace.id}
        onWorkspaceChange={handleWorkspaceChange}
        user={user}
        onClients={() => navigate("/clients")}
        onTasks={() => navigate("/tasks")}
        onLogout={handleLogout}
      />

      <main className={`lg:pl-[108px] ${activeSection === "assistant" ? "h-full overflow-hidden" : ""}`}>
        <div
          className={`mx-auto max-w-[1720px] px-4 py-4 sm:px-6 lg:px-8 ${
            activeSection === "assistant"
              ? "h-full max-w-none overflow-hidden"
              : ""
          }`}
        >
          {activeSection !== "assistant" && (
            <div className="mb-6 flex flex-col gap-4 rounded-[30px] border border-red-500/12 bg-black/30 px-5 py-4 shadow-[0_14px_50px_rgba(20,2,6,0.4)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                  {activeSectionMeta.label}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {activeSectionMeta.description}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ScopeSwitcher
                  options={scopeOptions}
                  value={financialView}
                  onChange={setFinancialView}
                />
                <TopIconButton icon={Search} />
                <TopIconButton icon={Bell} />
                <TopIconButton icon={Moon} />
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-[32px] border border-red-500/12 bg-black/30 px-6 py-16 text-center text-zinc-400 shadow-[0_18px_60px_rgba(20,2,6,0.45)]">
              Carregando o novo cockpit financeiro do Nano...
            </div>
          ) : activeSection === "assistant" ? (
            <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-[28px]">
              {sectionContent[activeSection]}
            </div>
          ) : (
            sectionContent[activeSection]
          )}
        </div>
      </main>
    </div>
  );
};

const SectionLayout = ({ children, rail }) => (
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="space-y-6">{children}</div>
    <div className="space-y-6">{rail}</div>
  </div>
);

const PageHeader = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
        {eyebrow}
      </p>
      <div>
        <h1 className="text-4xl font-semibold leading-tight text-white">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          {description}
        </p>
      </div>
    </div>
    {action}
  </div>
);

const SurfacePanel = ({ title, action, children }) => (
  <Card className="rounded-[32px] border border-red-500/12 bg-black/30 p-6 shadow-[0_18px_60px_rgba(20,2,6,0.45)]">
    {(title || action) && (
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          {title && (
            <h3 className="text-[18px] font-semibold text-white">{title}</h3>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </Card>
);

const TopIconButton = ({ icon: Icon }) => (
  <button
    type="button"
    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/12 bg-black/30 text-zinc-400 transition hover:bg-white/[0.05] hover:text-red-200"
  >
    <Icon className="h-4.5 w-4.5" />
  </button>
);

const ScopeSwitcher = ({ options, value, onChange }) => (
  <div className="flex items-center rounded-2xl border border-red-500/12 bg-black/30 p-1">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={`rounded-[14px] px-4 py-2 text-sm font-medium transition ${
          value === option.id
            ? "bg-red-500/14 text-red-100"
            : "text-zinc-400 hover:bg-white/[0.05]"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const StatCard = ({ title, value, direction }) => {
  const icon =
    direction === "up" ? (
      <ArrowUpRight className="h-4.5 w-4.5 text-[#166534]" />
    ) : direction === "down" ? (
      <ArrowDownRight className="h-4.5 w-4.5 text-[#b91c1c]" />
    ) : (
      <Wallet className="h-4.5 w-4.5 text-[#7f1d1d]" />
    );

  return (
    <Card className="rounded-[28px] border border-red-500/12 bg-black/30 p-5 shadow-[0_18px_60px_rgba(20,2,6,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
          {icon}
        </span>
      </div>
    </Card>
  );
};

const StatMiniCard = ({ label, value }) => (
  <div className="rounded-[24px] border border-red-500/12 bg-black/25 p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const GhostChip = ({ children }) => (
  <span className="inline-flex h-11 items-center rounded-2xl border border-red-500/12 bg-black/25 px-4 text-sm font-medium text-zinc-300">
    {children}
  </span>
);

const TrendChart = ({ data }) => {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1,
  );

  const buildPath = (key) =>
    data
      .map((item, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * 100;
        const y = 100 - (item[key] / maxValue) * 85;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="space-y-5">
      <div className="h-[280px] rounded-[24px] border border-red-500/10 bg-black/20 p-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          {Array.from({ length: 5 }).map((_, index) => (
            <line
              key={index}
              x1="0"
              y1={index * 25}
              x2="100"
              y2={index * 25}
              stroke="#2a1014"
              strokeDasharray="1.5 2"
              strokeWidth="0.4"
            />
          ))}
          <polyline
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.2"
            points={buildPath("income")}
          />
          <polyline
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.2"
            points={buildPath("expense")}
          />
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 text-sm">
          <span className="flex items-center gap-2 text-[#166534]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
            Receitas
          </span>
          <span className="flex items-center gap-2 text-[#b91c1c]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
            Despesas
          </span>
        </div>
        <div className="flex gap-4 text-xs text-zinc-500">
          {data.map((item) => (
            <span key={item.key}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const CalendarPanel = ({ days }) => (
  <div>
    <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-[#9b8d84]">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
        <span key={day}>{day}</span>
      ))}
    </div>
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, index) => (
        <div
          key={index}
          className={`min-h-[68px] rounded-[18px] border p-2 text-sm ${
            day.isCurrentMonth
              ? "border-red-500/10 bg-black/20 text-zinc-200"
              : "border-white/5 bg-black/10 text-zinc-600"
          } ${day.isToday ? "shadow-[inset_0_0_0_1px_rgba(185,28,28,0.2)]" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className={day.isToday ? "font-semibold text-[#7f1d1d]" : ""}>
              {day.label}
            </span>
            {day.dueCount > 0 && (
              <span className="rounded-full bg-red-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                {day.dueCount}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SummaryRow = ({ label, value, valueClass = "text-white", strong = false }) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/6 py-4 last:border-b-0">
    <span className="text-sm font-medium text-zinc-300">{label}</span>
    <span className={`${strong ? "text-3xl" : "text-lg"} font-semibold ${valueClass}`}>
      {value}
    </span>
  </div>
);

const InfoRow = ({ title, subtitle, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-[24px] border border-red-500/10 bg-black/20 px-4 py-4">
    <div>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
    <span className="text-right text-sm font-semibold text-white">
      {value}
    </span>
  </div>
);

const AlertRow = ({ title, message, tone }) => {
  const toneClass =
    tone === "positive"
      ? "border-[#d4f0db] bg-[#f4fff6] text-[#166534]"
      : tone === "warning"
        ? "border-[#f6d4d4] bg-[#fff4f4] text-[#9f1239]"
        : "border-red-500/10 bg-black/20 text-zinc-200";

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-7">{message}</p>
    </div>
  );
};

const CenteredEmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-red-500/12 bg-black/20 px-6 py-10 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-200">
      <Icon className="h-7 w-7" />
    </div>
    <h4 className="mt-5 text-[28px] font-semibold text-white">{title}</h4>
    <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
      {description}
    </p>
  </div>
);

const LargeEmptyState = ({
  icon: Icon,
  title,
  description,
  bullets,
  primaryActionLabel,
}) => (
  <div className="rounded-[28px] border border-dashed border-red-500/12 bg-black/20 px-6 py-14 text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-200">
      <Icon className="h-7 w-7" />
    </div>
    <h4 className="mt-6 text-[34px] font-semibold text-white">{title}</h4>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
      {description}
    </p>
    <div className="mx-auto mt-6 max-w-lg rounded-[24px] border border-white/6 bg-black/20 p-5">
      {bullets.map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 py-2 text-left text-sm text-zinc-300"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-200">
            •
          </span>
          {item}
        </div>
      ))}
    </div>
    <Button type="button" className={`mt-8 h-12 ${actionButtonClass}`}>
      {primaryActionLabel}
    </Button>
  </div>
);

const OnboardingRail = ({ steps, percent, completedSteps }) => (
  <Card className="sticky top-4 rounded-[28px] border border-red-500/12 bg-black/30 p-5 shadow-[0_18px_60px_rgba(20,2,6,0.45)]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-200">
          <Target className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="font-semibold text-white">Primeiros passos</p>
          <p className="text-sm text-zinc-500">
            O que falta para o Nano ler seu financeiro melhor.
          </p>
        </div>
      </div>
      <button type="button" className="text-zinc-500">
        -
      </button>
    </div>

    <div className="mt-5 space-y-3">
      {steps.map((step) => (
        <div
          key={step.label}
          className="rounded-[22px] border border-white/6 bg-black/20 p-4"
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                step.done
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-black/10 text-zinc-600"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            <div>
              <p className="font-medium text-white">{step.label}</p>
              {!step.done && (
                <p className="mt-1 text-sm text-zinc-500">
                  Esse ponto ainda esta pendente.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <span>Navegue entre as etapas</span>
        <span>
          {completedSteps} de {steps.length}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#f59e9e] to-[#b91c1c]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 text-right text-sm font-medium text-red-200">
        {percent}%
      </div>
    </div>
  </Card>
);

const DreRow = ({ label, income, expense, balance, negative = false }) => (
  <div className="grid grid-cols-[1.1fr_repeat(4,0.7fr)] gap-3 border-b border-white/6 px-4 py-4 text-sm last:border-b-0">
    <span className="font-medium text-white">{label}</span>
    <span className="text-[#166534]">{currencyFormatter.format(income || 0)}</span>
    <span className="text-[#b91c1c]">{currencyFormatter.format(expense || 0)}</span>
    <span className={negative ? "text-[#b91c1c]" : "text-[#166534]"}>
      {currencyFormatter.format(balance || 0)}
    </span>
    <span className={negative ? "text-[#b91c1c]" : "text-white"}>
      {currencyFormatter.format(Math.abs(balance || income || expense || 0))}
    </span>
  </div>
);

const SecurityCard = ({ title, description, actionLabel }) => (
  <div className="rounded-[24px] border border-red-500/12 bg-black/20 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-7 text-zinc-500">{description}</p>
      </div>
      <Button type="button" className={`h-10 ${actionButtonClass}`}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  </div>
);

const ToggleRow = ({ label, helper, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-[24px] border border-red-500/12 bg-black/20 p-4">
    <div>
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-zinc-500">{helper}</p>
    </div>
    <button
      type="button"
      onClick={onChange}
      className={`relative h-8 w-14 rounded-full transition ${
        checked ? "bg-[#b91c1c]" : "bg-white/12"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  </div>
);

export default Dashboard;
