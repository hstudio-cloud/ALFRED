import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../hooks/use-toast";
import useBillingStatus from "../../hooks/dashboard/useBillingStatus";
import useDashboardData from "../../hooks/dashboard/useDashboardData";
import useNanoOps from "../../hooks/dashboard/useNanoOps";
import useOpenFinanceData from "../../hooks/dashboard/useOpenFinanceData";
import usePayrollData from "../../hooks/dashboard/usePayrollData";
import Sidebar from "../../components/Sidebar";
import PluggyConnectDialog from "../../components/PluggyConnectDialog";
import {
  BanksSection,
  CardsSection,
  ReportsSection,
} from "../../components/DashboardFinanceSections";
import activityService from "../../services/activityService";
import financeService from "../../services/financeService";
import nanoOpsService from "../../services/nanoOpsService";
import openFinanceService from "../../services/openFinanceService";
import payrollService from "../../services/payrollService";
import reportService from "../../services/reportService";
import workspaceService from "../../services/workspaceService";
import { API_BASE_URL, OPEN_FINANCE_ENABLED } from "../../config/env";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Textarea } from "../../components/ui/textarea";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ptBR } from "date-fns/locale";
import {
  dashboardClass,
  dashboardTheme,
  resolveDashboardThemeMode,
} from "../../lib/dashboardTheme";
import DashboardAssistant from "./DashboardAssistant";
import DashboardAutomations from "./DashboardAutomations";
import DashboardHeader from "./DashboardHeader";
import DashboardOverview from "./DashboardOverview";
import DashboardReports from "./DashboardReports";
import DashboardSettings from "./DashboardSettings";
import DashboardTransactions from "./DashboardTransactions";
import DashboardWhatsapp from "./DashboardWhatsapp";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Building2,
  CalendarDays,
  Clock3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileBarChart2,
  FileUp,
  Loader2,
  Landmark,
  LayoutDashboard,
  Moon,
  MousePointer2,
  Sparkles,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  UserRound,
  Users2,
  Wallet,
} from "lucide-react";

const API = API_BASE_URL;

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
    group: "Negócio",
  },
  {
    id: "overview",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Visão geral do financeiro",
    group: "Negócio",
  },
  {
    id: "transactions",
    label: "Movimentações",
    icon: ArrowLeftRight,
    description: "Entradas, saídas e filtros",
    group: "Negócio",
  },
  {
    id: "banks",
    label: "Bancos",
    icon: Landmark,
    description: "Contas bancárias e saldo",
    group: "Negócio",
  },
  {
    id: "cards",
    label: "Cartões",
    icon: CreditCard,
    description: "Faturas, limites e uso",
    group: "Negócio",
  },
  {
    id: "contacts",
    label: "Contatos",
    icon: Users2,
    description: "Clientes e pagadores",
    group: "Negócio",
  },
  {
    id: "employees",
    label: "Funcionários",
    icon: CalendarDays,
    description: "Ponto, presença, faltas e folha",
    group: "Negócio",
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: FileBarChart2,
    description: "Análises e demonstrativos",
    group: "Negócio",
  },
  {
    id: "activities",
    label: "Atividades",
    icon: Target,
    description: "Rotinas pessoais e da empresa com avisos do Nano",
    group: "NegÃ³cio",
  },
  {
    id: "automations",
    label: "Automações",
    icon: BrainCircuit,
    description: "Rotinas, histórico e tarefas do Nano",
    group: "Negócio",
  },
  {
    id: "nano_whatsapp",
    label: "WhatsApp do Nano",
    icon: ShieldCheck,
    description: "Número conectado e confirmações pendentes",
    group: "Negócio",
  },
  {
    id: "company",
    label: "Empresa",
    icon: Building2,
    description: "Dados do workspace",
    group: "Configurações",
  },
  {
    id: "profile",
    label: "Perfil",
    icon: UserRound,
    description: "Informações pessoais",
    group: "Configurações",
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings2,
    description: "Categorias, alertas e rotina",
    group: "Configurações",
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

const initialActivityForm = {
  title: "",
  description: "",
  account_scope: "personal",
  start_at: "",
  recurrence: "once",
  reminder_minutes_before: 60,
  notify_web: true,
  notify_whatsapp: true,
};

const initialEmployeeForm = {
  name: "",
  cpf: "",
  role: "",
  salary: "",
  employee_type: "clt",
  payment_cycle: "monthly",
  inss_percent: "",
  dependents_count: "",
  salary_family_amount: "",
  notes: "",
};

const initialAttendanceForm = {
  employee_id: "",
  date: "",
  status: "absent",
  notes: "",
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
  theme_mode: "dark",
  cursor_mode: "custom",
};

const pageFieldClass = dashboardClass.input;
const textAreaClass =
  "min-h-[120px] rounded-[24px] border border-red-500/12 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-400/35";
const actionButtonClass = dashboardClass.buttonPrimary;
const THEME_STORAGE_KEY = "nano_theme_mode";
const CURSOR_MODE_STORAGE_KEY = "nano_cursor_mode";
const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
const resolveCursorMode = (value) =>
  value === "default" ? "default" : "custom";
const getBrazilDateParts = () => {
  const now = new Date();
  const dateValue = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const monthValue = dateValue.slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(now);
  return { dateValue, monthValue, monthLabel };
};
const dateValueToCalendarDate = (value) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 12, 0, 0);
};
const calendarDateToDateValue = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatBrazilDateLabel = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
};
const dateValueToBrazilIso = (value) => {
  if (!value) return "";
  return `${value}T12:00:00-03:00`;
};
const billingStatusLabels = {
  active: "acesso ativo",
  trialing: "periodo de teste",
  checkout_pending: "pagamento iniciado",
  checkout_completed: "aguardando confirmacao do pagamento",
  past_due: "pagamento pendente",
  unpaid: "pagamento nao compensado",
  canceled: "assinatura cancelada",
  inactive: "sem assinatura ativa",
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const {
    currentWorkspace,
    workspaces,
    switchWorkspace,
    createWorkspace,
    refreshWorkspaces,
  } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [financialView, setFinancialView] = useState("general");
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return resolveDashboardThemeMode(
      window.localStorage.getItem(THEME_STORAGE_KEY) || "dark",
    );
  });
  const activeSectionRef = useRef(activeSection);

  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    subdomain: "",
    description: "",
  });
  const [transactionForm, setTransactionForm] = useState(initialTransaction);
  const [billForm, setBillForm] = useState(initialBill);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [reminderForm, setReminderForm] = useState(initialReminder);
  const [activityForm, setActivityForm] = useState(initialActivityForm);
  const [accountForm, setAccountForm] = useState(initialAccount);
  const [cardForm, setCardForm] = useState(initialCard);
  const [companyForm, setCompanyForm] = useState(initialCompanyForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [settingsForm, setSettingsForm] = useState(initialSettingsForm);
  const [employeeForm, setEmployeeForm] = useState(initialEmployeeForm);
  const [attendanceForm, setAttendanceForm] = useState(() => ({
    ...initialAttendanceForm,
    date: getBrazilDateParts().dateValue,
  }));

  const [reportPeriod, setReportPeriod] = useState("30d");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [transactionMethodFilter, setTransactionMethodFilter] = useState("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [statementFile, setStatementFile] = useState(null);
  const [statementImportResult, setStatementImportResult] = useState(null);
  const [uploadingStatement, setUploadingStatement] = useState(false);
  const [brazilClock, setBrazilClock] = useState(() => getBrazilDateParts());
  const [payrollMonth, setPayrollMonth] = useState(() =>
    getBrazilDateParts().monthValue,
  );
  const [payrollEmployeeTypeFilter, setPayrollEmployeeTypeFilter] =
    useState("all");
  const [payrollPaymentCycleFilter, setPayrollPaymentCycleFilter] =
    useState("all");
  const [uploadingCnpjCard, setUploadingCnpjCard] = useState(false);
  const [uploadingPayrollSheet, setUploadingPayrollSheet] = useState(false);
  const [payrollImportResult, setPayrollImportResult] = useState(null);
  const [whatsappLinkCountdown, setWhatsappLinkCountdown] = useState("");
  const [attendanceCalendarOpen, setAttendanceCalendarOpen] = useState(false);
  const cnpjCardInputRef = useRef(null);
  const payrollSheetInputRef = useRef(null);
  const {
    openFinanceAccounts,
    openFinanceConnections,
    openFinanceSyncingId,
    pluggyWidgetSession,
    setOpenFinanceAccounts,
    setOpenFinanceConnections,
    setOpenFinanceSyncingId,
    setPluggyWidgetSession,
  } = useOpenFinanceData();
  const {
    accounts,
    activities,
    automationInsights,
    bills,
    cards,
    cashflowReport,
    categories,
    forecast,
    insights,
    loadAll,
    loading,
    monthlyReport,
    reminders,
    report,
    reportOverview,
    setAccounts,
    setActivities,
    setAutomationInsights,
    setBills,
    setCards,
    setCashflowReport,
    setCategories,
    setForecast,
    setInsights,
    setMonthlyReport,
    setReminders,
    setReport,
    setReportOverview,
    setStatementImports,
    setStats,
    setSummary,
    setTransactions,
    statementImports,
    stats,
    summary,
    transactions,
    categoryReport,
    setCategoryReport,
    accountReport,
    setAccountReport,
  } = useDashboardData({
    activeSectionRef,
    apiBaseUrl: API,
    financialView,
    logout,
    openFinanceEnabled: OPEN_FINANCE_ENABLED,
    navigate,
    reportPeriod,
    toast,
    setOpenFinanceAccounts,
    setOpenFinanceConnections,
  });
  const {
    attendanceRecords,
    employees,
    loadPayrollData,
    payrollLoading,
    payrollReport,
    setAttendanceRecords,
    setEmployees,
  } = usePayrollData({
    payrollEmployeeTypeFilter,
    payrollMonth,
    payrollPaymentCycleFilter,
    toast,
  });
  const {
    billingLoading,
    billingStatus,
    loadBillingStatus,
  } = useBillingStatus();
  const {
    loadNanoOpsData,
    nanoOpsAudits,
    nanoOpsAutomations,
    nanoOpsConfirmations,
    nanoOpsLoading,
    nanoOpsStatus,
    nanoOpsTasks,
    setWhatsappLinkCode,
    setWhatsappLinkPhone,
    whatsappLinkCode,
    whatsappLinkPhone,
  } = useNanoOps({ toast });
  const visibleNavigationItems = useMemo(() => {
    if (financialView !== "personal") {
      return navigationItems;
    }
    const personalHidden = new Set(["contacts", "employees", "company"]);
    return navigationItems.filter((item) => !personalHidden.has(item.id));
  }, [financialView]);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    if (!visibleNavigationItems.some((item) => item.id === activeSection)) {
      setActiveSection(visibleNavigationItems[0]?.id || "overview");
    }
  }, [activeSection, visibleNavigationItems]);

  useEffect(() => {
    setActivityForm((current) => {
      if (current.title || current.description || current.start_at) {
        return current;
      }
      return {
        ...current,
        account_scope: financialView === "business" ? "business" : "personal",
      };
    });
  }, [financialView]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncBrazilClock = () => {
      setBrazilClock(getBrazilDateParts());
    };

    syncBrazilClock();
    const interval = window.setInterval(syncBrazilClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalizedMode = resolveDashboardThemeMode(themeMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedMode);
    document.documentElement.dataset.nanoTheme = normalizedMode;
    document.body.dataset.nanoTheme = normalizedMode;
  }, [themeMode]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadBillingStatus(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadBillingStatus]);

  useEffect(() => {
    if (activeSection === "employees" && currentWorkspace?.id) {
      loadPayrollData(currentWorkspace.id);
    }
  }, [activeSection, currentWorkspace?.id, loadPayrollData]);

  useEffect(() => {
    if (
      (activeSection === "automations" || activeSection === "nano_whatsapp") &&
      currentWorkspace?.id
    ) {
      loadNanoOpsData(currentWorkspace.id);
    }
  }, [activeSection, currentWorkspace?.id, loadNanoOpsData]);

  useEffect(() => {
    if (!whatsappLinkCode?.expires_at) {
      setWhatsappLinkCountdown("");
      return undefined;
    }

    const tick = () => {
      const remainingMs =
        new Date(whatsappLinkCode.expires_at).getTime() - Date.now();
      if (remainingMs <= 0) {
        setWhatsappLinkCountdown("expirado");
        if (currentWorkspace?.id && activeSection === "nano_whatsapp") {
          loadNanoOpsData(currentWorkspace.id);
        }
        return false;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      setWhatsappLinkCountdown(`${minutes}:${seconds}`);
      return true;
    };

    tick();
    const interval = window.setInterval(() => {
      const keepRunning = tick();
      if (!keepRunning) {
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [whatsappLinkCode?.expires_at, currentWorkspace?.id, activeSection, loadNanoOpsData]);

  useEffect(() => {
    if (!currentWorkspace) return;
    const profile = currentWorkspace.settings?.company_profile || {};
    const notifications =
      currentWorkspace.settings?.features?.notifications ?? true;
    const assistantVoice =
      currentWorkspace.settings?.features?.assistant_voice ?? true;
    const whatsappAlerts =
      currentWorkspace.settings?.features?.whatsapp_alerts ?? false;
    const storedCursorMode =
      typeof window !== "undefined"
        ? window.localStorage.getItem(CURSOR_MODE_STORAGE_KEY)
        : null;
    const cursorMode = resolveCursorMode(
      currentWorkspace.settings?.features?.cursor_mode || storedCursorMode,
    );
    const storedThemeMode =
      typeof window !== "undefined"
        ? window.localStorage.getItem(THEME_STORAGE_KEY)
        : null;
    const resolvedThemeMode = resolveDashboardThemeMode(
      storedThemeMode || user?.settings?.theme || "dark",
    );
    setThemeMode(resolvedThemeMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CURSOR_MODE_STORAGE_KEY, cursorMode);
    }

    setCompanyForm({
      name: currentWorkspace.name || "",
      subdomain: currentWorkspace.subdomain || "",
      description: currentWorkspace.description || "",
      document_type: profile.document_type || "cnpj",
      document: profile.document || "",
      business_type: profile.business_type || "serviços",
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
      theme_mode: resolvedThemeMode,
      cursor_mode: cursorMode,
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
        title: "Movimentação salva",
        description: "A nova entrada já foi adicionada ao painel.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar movimentação",
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
        description: "A conta entrou no calendário financeiro.",
      });
    } catch (error) {
      toast({
        title: "Erro ao registrar conta",
        description: "Não foi possível salvar essa conta agora.",
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
        description: "A classificação já aparece nas telas do Nano.",
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
        description: "Não consegui salvar o lembrete agora.",
        variant: "destructive",
      });
    }
  };

  const submitActivity = async (event) => {
    event.preventDefault();
    try {
      await activityService.createActivity(currentWorkspace.id, activityForm);
      setActivityForm({
        ...initialActivityForm,
        account_scope: financialView === "business" ? "business" : "personal",
      });
      loadAll(currentWorkspace.id);
      toast({
        title: "Atividade criada",
        description: "O Nano vai acompanhar essa rotina e avisar no horario configurado.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar atividade",
        description: "Nao consegui salvar essa atividade agora.",
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
        description: "Sua nova empresa já está pronta para uso.",
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
        title: "Não consegui atualizar a conta",
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
        description: "Não foi possível trocar o status desse lembrete.",
        variant: "destructive",
      });
    }
  };

  const toggleActivity = async (activity) => {
    try {
      await activityService.updateActivity(currentWorkspace.id, activity.id, {
        is_active: !activity.is_active,
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao atualizar atividade",
        description: "Nao foi possivel trocar o status dessa atividade.",
        variant: "destructive",
      });
    }
  };

  const removeActivity = async (activityId) => {
    try {
      await activityService.deleteActivity(currentWorkspace.id, activityId);
      loadAll(currentWorkspace.id);
      toast({
        title: "Atividade removida",
        description: "A rotina deixou de ser monitorada pelo Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover atividade",
        description: "Nao consegui excluir essa atividade agora.",
        variant: "destructive",
      });
    }
  };

  const refreshReport = async (period) => {
    setReportPeriod(period);
    try {
      const [
        nextFinanceOverview,
        nextReportOverview,
        nextCategoryReport,
        nextAccountReport,
      ] = await Promise.all([
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
        title: "Erro ao atualizar relatório",
        description: "Não consegui aplicar esse período agora.",
        variant: "destructive",
      });
    }
  };

  const generateRecurringBills = async () => {
    try {
      await financeService.generateRecurringBills(currentWorkspace.id);
      toast({
        title: "Recorrências geradas",
        description:
          "O Nano criou os próximos vencimentos com base nas regras atuais.",
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao gerar recorrências",
        description: "Não foi possível montar os próximos vencimentos agora.",
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
        description: "O arquivo já entrou na fila de leitura do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao importar extrato",
        description:
          error?.response?.data?.detail ||
          "Não foi possível processar o arquivo enviado.",
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
        description: "A conta já entrou no resumo financeiro do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: "Não consegui salvar essa conta agora.",
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
        title: "Cartão criado",
        description: "O cartão já entra na leitura de faturas e limite.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar cartão",
        description: "Não consegui salvar esse cartão agora.",
        variant: "destructive",
      });
    }
  };

  const closePluggyWidget = useCallback(() => {
    setOpenFinanceSyncingId(null);
    setPluggyWidgetSession(null);
  }, [setOpenFinanceSyncingId, setPluggyWidgetSession]);

  const handlePluggySuccess = useCallback(
    async ({ item }) => {
      if (!currentWorkspace?.id || !item?.id) {
        closePluggyWidget();
        return;
      }

      try {
        const result = await openFinanceService.connectCallback(
          currentWorkspace.id,
          {
            provider: "pluggy",
            item_id: item.id,
            consent_id: item.consentId || item.consent?.id || null,
            institution_name:
              item.connector?.name ||
              item.connector?.institutionName ||
              item.connector?.displayName ||
              "Instituição conectada",
            status:
              item.status?.toLowerCase?.() === "updated"
                ? "connected"
                : (item.status || "connected").toLowerCase(),
            metadata: { item },
          },
        );
        if (result?.sync?.ok === false) {
          throw new Error(
            result?.sync?.details ||
              result?.sync?.error ||
              "Não foi possível sincronizar a conexão da Pluggy.",
          );
        }
        closePluggyWidget();
        await loadAll(currentWorkspace.id);
        toast({
          title: "Conexão concluída",
          description:
            "A conta foi vinculada e os dados do Open Finance foram sincronizados.",
        });
      } catch (error) {
        closePluggyWidget();
        toast({
          title: "Erro ao salvar conexão Pluggy",
          description:
            error?.response?.data?.detail ||
            "O widget concluiu, mas não consegui persistir a conexão no backend.",
          variant: "destructive",
        });
      }
    },
    [closePluggyWidget, currentWorkspace?.id, loadAll, toast],
  );

  const handlePluggyError = useCallback(
    (error) => {
      const executionStatus = error?.data?.item?.executionStatus;
      toast({
        title: "Falha no widget da Pluggy",
        description:
          executionStatus ||
          error?.message ||
          "A Pluggy não concluiu a autenticação dessa conta.",
        variant: "destructive",
      });
    },
    [toast],
  );

  const handleOpenFinanceConnect = async () => {
    if (!currentWorkspace?.id) return;
    if (!OPEN_FINANCE_ENABLED) {
      toast({
        title: "Open Finance indisponivel",
        description:
          "Essa integracao foi desabilitada temporariamente e nao esta disponivel neste momento.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = await openFinanceService.createConnectToken(
        currentWorkspace.id,
      );
      if (payload?.configured === false) {
        toast({
          title: "Provider ainda não configurado",
          description:
            payload?.message ||
            "Configure as credenciais do Open Finance no backend antes de abrir o widget.",
          variant: "destructive",
        });
        return;
      }
      const connectUrl =
        payload?.connect_url || payload?.connectUrl || payload?.url || null;
      const linkToken =
        payload?.connect_token ||
        payload?.connectToken ||
        payload?.link_token ||
        payload?.linkToken ||
        payload?.token ||
        null;

      if (connectUrl) {
        window.open(connectUrl, "_blank", "noopener,noreferrer");
        toast({
          title: "Conexão iniciada",
          description:
            "A janela do agregador foi aberta. Depois de concluir, clique em sincronizar.",
        });
      } else if (
        (payload?.provider || "").toLowerCase() === "pluggy" &&
        linkToken
      ) {
        setPluggyWidgetSession({
          connectToken: linkToken,
          updateItem: payload?.item_id || null,
          includeSandbox: Boolean(payload?.sandbox),
        });
      } else {
        throw new Error(
          payload?.message ||
            "O provider respondeu sem URL ou token de conexão.",
        );
      }
    } catch (error) {
      toast({
        title: "Erro ao conectar Open Finance",
        description:
          error?.response?.data?.detail ||
          error?.message ||
          "Não consegui iniciar a conexão bancária agora.",
        variant: "destructive",
      });
    }
  };

  const toggleThemeMode = useCallback(() => {
    setThemeMode((current) => {
      const next = current === "light" ? "dark" : "light";
      setSettingsForm((form) => ({ ...form, theme_mode: next }));
      return next;
    });
  }, []);

  const handleOpenFinanceSync = async (connection) => {
    if (!currentWorkspace?.id || !connection?.id) return;
    if (!OPEN_FINANCE_ENABLED) {
      toast({
        title: "Open Finance indisponivel",
        description:
          "A sincronizacao bancaria foi desabilitada temporariamente.",
        variant: "destructive",
      });
      return;
    }

    if (
      (connection.provider || "").toLowerCase() === "pluggy" &&
      connection.item_id
    ) {
      setOpenFinanceSyncingId(connection.id);
      try {
        const payload = await openFinanceService.createConnectToken(
          currentWorkspace.id,
          { item_id: connection.item_id },
        );
        if (payload?.configured === false) {
          throw new Error(
            payload?.message ||
              "Provider de Open Finance ainda não configurado no backend.",
          );
        }
        const linkToken =
          payload?.connect_token ||
          payload?.connectToken ||
          payload?.link_token ||
          payload?.linkToken ||
          payload?.token ||
          null;

        if (!linkToken) {
          throw new Error("Pluggy não retornou token para atualizar o item.");
        }

        setPluggyWidgetSession({
          connectToken: linkToken,
          updateItem: connection.item_id,
          includeSandbox: Boolean(payload?.sandbox),
        });
      } catch (error) {
        toast({
          title: "Erro ao abrir atualização da Pluggy",
          description:
            error?.response?.data?.detail ||
            error?.message ||
            "Não consegui iniciar a atualização dessa conexão agora.",
          variant: "destructive",
        });
        setOpenFinanceSyncingId(null);
      }
      return;
    }

    setOpenFinanceSyncingId(connection.id);
    try {
      await openFinanceService.syncConnection(
        currentWorkspace.id,
        connection.id,
      );
      await loadAll(currentWorkspace.id);
      toast({
        title: "Sincronização concluída",
        description: "Contas e transações da conexão foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao sincronizar Open Finance",
        description:
          error?.response?.data?.detail ||
          "Não consegui sincronizar essa conexão agora.",
        variant: "destructive",
      });
    } finally {
      setOpenFinanceSyncingId(null);
    }
  };

  const submitEmployee = async (event) => {
    event.preventDefault();
    if (!currentWorkspace?.id) return;
    try {
      await payrollService.createEmployee(currentWorkspace.id, {
        ...employeeForm,
        salary: Number(employeeForm.salary || 0),
        inss_percent:
          employeeForm.employee_type === "clt"
            ? Number(employeeForm.inss_percent || 0)
            : 0,
        dependents_count:
          employeeForm.employee_type === "clt"
            ? Number(employeeForm.dependents_count || 0)
            : 0,
        salary_family_amount:
          employeeForm.employee_type === "clt"
            ? Number(employeeForm.salary_family_amount || 0)
            : 0,
      });
      setEmployeeForm(initialEmployeeForm);
      await loadPayrollData(currentWorkspace.id);
      toast({
        title: "Funcionário cadastrado",
        description: "O cadastro foi salvo e já entrou no modulo de folha.",
      });
    } catch (error) {
      toast({
        title: "Erro ao cadastrar funcionário",
        description:
          error?.response?.data?.detail ||
          "Não consegui salvar esse funcionário agora.",
        variant: "destructive",
      });
    }
  };

  const submitAttendance = async (event) => {
    event.preventDefault();
    if (!currentWorkspace?.id) return;
    if (!attendanceForm.employee_id || !attendanceForm.date) {
      toast({
        title: "Dados incompletos",
        description: "Selecione funcionário e data para registrar o ponto.",
        variant: "destructive",
      });
      return;
    }
    try {
      await payrollService.registerAttendance(currentWorkspace.id, {
        employee_id: attendanceForm.employee_id,
        date: dateValueToBrazilIso(attendanceForm.date),
        status: attendanceForm.status,
        notes: attendanceForm.notes,
      });
      setAttendanceForm((prev) => ({ ...prev, notes: "" }));
      await loadPayrollData(currentWorkspace.id);
      toast({
        title: "Ponto registrado",
        description: "Presença/falta registrada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao registrar ponto",
        description:
          error?.response?.data?.detail ||
          "Não consegui registrar este ponto agora.",
        variant: "destructive",
      });
    }
  };

  const triggerPayrollSheetUpload = () => {
    payrollSheetInputRef.current?.click();
  };

  const handlePayrollSheetUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !currentWorkspace?.id) return;

    setUploadingPayrollSheet(true);
    try {
      const response = await payrollService.importPayrollSheet(
        currentWorkspace.id,
        file,
      );
      setPayrollImportResult(response);
      await loadPayrollData(currentWorkspace.id);
      toast({
        title: "Folha importada",
        description: `${response?.employees_count || 0} funcionario(s) atualizados a partir do PDF.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao importar folha",
        description:
          error?.response?.data?.detail ||
          "Nao consegui ler a folha enviada agora.",
        variant: "destructive",
      });
    } finally {
      setUploadingPayrollSheet(false);
    }
  };

  const exportPayrollAttendance = async () => {
    if (!payrollReport) {
      toast({
        title: "Nada para exportar",
        description: "Carregue a folha do mes antes de baixar o arquivo.",
        variant: "destructive",
      });
      return;
    }

    const rows = [
      ...(payrollReport?.groups?.clt || []),
      ...(payrollReport?.groups?.contract || []),
    ];

    if (!rows.length) {
      toast({
        title: "Nada para exportar",
        description: "Nao ha funcionarios no filtro atual para gerar a planilha.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { buildPayrollWorkbook } = await import(
        "../../lib/payrollWorkbook"
      );
      const buffer = await buildPayrollWorkbook({
        workspaceName: currentWorkspace?.name || "Workspace",
        month: payrollMonth,
        payrollReport,
        attendanceRecords,
        employeeTypeFilter: payrollEmployeeTypeFilter,
        paymentCycleFilter: payrollPaymentCycleFilter,
      });

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `folha-presenca-${payrollReport.month || payrollMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Planilha exportada",
        description: "O arquivo .xlsx com folha e ponto foi baixado.",
      });
    } catch (error) {
      console.error("Error exporting payroll workbook:", error);
      toast({
        title: "Erro ao exportar",
        description: "Nao consegui montar a planilha .xlsx agora.",
        variant: "destructive",
      });
    }
  };

  const deactivateEmployee = async (employeeId) => {
    if (!currentWorkspace?.id) return;
    try {
      await payrollService.deleteEmployee(
        currentWorkspace.id,
        employeeId,
        false,
      );
      await loadPayrollData(currentWorkspace.id);
      toast({
        title: "Funcionário desativado",
        description: "Ele não entra mais nos próximos fechamentos.",
      });
    } catch (error) {
      toast({
        title: "Erro ao desativar funcionário",
        description:
          error?.response?.data?.detail ||
          "Não foi possível desativar o funcionário.",
        variant: "destructive",
      });
    }
  };

  const submitWhatsappLink = async (event) => {
    event.preventDefault();
    if (!currentWorkspace?.id || !whatsappLinkPhone.trim()) return;
    try {
      await nanoOpsService.linkWhatsapp(currentWorkspace.id, {
        phone_number: whatsappLinkPhone,
      });
      await loadNanoOpsData(currentWorkspace.id);
      toast({
        title: "WhatsApp vinculado",
        description: "O número foi salvo para uso operacional do Nano.",
      });
    } catch (error) {
      toast({
        title: "Erro ao vincular WhatsApp",
        description:
          error?.response?.data?.detail ||
          "Não consegui salvar esse número agora.",
        variant: "destructive",
      });
    }
  };

  const generateWhatsappLinkCode = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const response = await nanoOpsService.createWhatsappLinkCode(currentWorkspace.id);
      setWhatsappLinkCode(response);
      toast({
        title: "Código gerado",
        description: "Envie esse código para o WhatsApp do Nano para concluir a conexão.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar código",
        description: "Não consegui gerar o código de conexão agora.",
        variant: "destructive",
      });
    }
  };

  const toggleNanoAutomation = async (automationId, enabled) => {
    if (!currentWorkspace?.id) return;
    try {
      await nanoOpsService.updateAutomation(currentWorkspace.id, automationId, {
        enabled,
      });
      await loadNanoOpsData(currentWorkspace.id);
      toast({
        title: enabled ? "Automacao ativada" : "Automacao desativada",
        description: "A agenda operacional do Nano foi atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar automacao",
        description:
          error?.response?.data?.detail ||
          "Nao consegui salvar essa configuracao agora.",
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
            cursor_mode: resolveCursorMode(settingsForm.cursor_mode),
          },
        },
      });

      toast({
        title: "Dados da empresa atualizados",
        description: "As informações do workspace foram salvas.",
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao salvar empresa",
        description: "Não foi possível atualizar esse workspace agora.",
        variant: "destructive",
      });
    }
  };

  const applyExtractedCompanyData = useCallback((extracted = {}, workspace) => {
    const profile = workspace?.settings?.company_profile || {};
    setCompanyForm((prev) => ({
      ...prev,
      name:
        workspace?.name || extracted.trade_name || extracted.legal_name || prev.name,
      subdomain: workspace?.subdomain || prev.subdomain,
      description:
        workspace?.description || extracted.main_activity || prev.description,
      document_type: "cnpj",
      document: profile.document || extracted.cnpj || prev.document,
      business_type: profile.business_type || prev.business_type,
      tax_regime: profile.tax_regime || prev.tax_regime,
      address: profile.address || prev.address,
      complement:
        profile.complement || extracted.address_complement || prev.complement,
      city: profile.city || extracted.city || prev.city,
      state: profile.state || extracted.state || prev.state,
      phone: profile.phone || prev.phone,
      website: profile.website || prev.website,
    }));
  }, []);

  const triggerCnpjCardUpload = () => {
    cnpjCardInputRef.current?.click();
  };

  const handleCnpjCardUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !currentWorkspace?.id) return;

    setUploadingCnpjCard(true);
    try {
      const payload = await workspaceService.extractCnpjCard(
        currentWorkspace.id,
        file,
      );
      applyExtractedCompanyData(payload?.extracted, payload?.workspace);
      if (payload?.workspace) {
        switchWorkspace(payload.workspace);
      }
      await refreshWorkspaces();
      toast({
        title: "Cartao CNPJ lido com sucesso",
        description:
          "Os dados da empresa foram vinculados automaticamente ao workspace atual.",
      });
    } catch (error) {
      toast({
        title: "Erro ao ler cartao CNPJ",
        description:
          error?.response?.data?.detail ||
          "Nao consegui extrair os dados desse cartao agora.",
        variant: "destructive",
      });
    } finally {
      setUploadingCnpjCard(false);
    }
  };

  const saveProfileSettings = (event) => {
    event.preventDefault();
    toast({
      title: "Perfil preparado",
      description:
        "A interface de perfil foi atualizada. O salvamento completo do usuário será ligado na próxima etapa.",
    });
  };

  const savePlatformSettings = (event) => {
    event.preventDefault();
    if (typeof window !== "undefined") {
      const resolvedMode = resolveDashboardThemeMode(settingsForm.theme_mode);
      window.localStorage.setItem(THEME_STORAGE_KEY, resolvedMode);
      setThemeMode(resolvedMode);
    }
    toast({
      title: "Preferências atualizadas",
      description:
        "As configurações visuais e de automação ficaram prontas para a próxima rodada de integração.",
    });
  };

  const persistPlatformSettings = async (event) => {
    event.preventDefault();
    const resolvedMode = resolveDashboardThemeMode(settingsForm.theme_mode);
    const resolvedCursorMode = resolveCursorMode(settingsForm.cursor_mode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, resolvedMode);
      window.localStorage.setItem(CURSOR_MODE_STORAGE_KEY, resolvedCursorMode);
      window.dispatchEvent(
        new CustomEvent("nano-cursor-mode-change", {
          detail: { mode: resolvedCursorMode },
        }),
      );
      setThemeMode(resolvedMode);
    }

    if (!currentWorkspace?.id) {
      toast({
        title: "Preferencias atualizadas",
        description: "O tema e o cursor deste navegador foram ajustados.",
      });
      return;
    }

    try {
      await axios.put(`${API}/workspaces/${currentWorkspace.id}`, {
        name: currentWorkspace.name,
        subdomain: currentWorkspace.subdomain,
        description: currentWorkspace.description,
        settings: {
          ...(currentWorkspace.settings || {}),
          features: {
            ...(currentWorkspace.settings?.features || {}),
            notifications: settingsForm.notifications,
            assistant_voice: settingsForm.assistant_voice,
            whatsapp_alerts: settingsForm.whatsapp_alerts,
            cursor_mode: resolvedCursorMode,
          },
        },
      });

      toast({
        title: "Preferencias atualizadas",
        description: "As automacoes e a personalizacao visual foram salvas.",
      });
      loadAll(currentWorkspace.id);
    } catch (error) {
      toast({
        title: "Erro ao salvar preferencias",
        description:
          "Nao foi possivel atualizar as preferencias da plataforma agora.",
        variant: "destructive",
      });
    }
  };

  const refreshAfterAssistantMessage = useCallback(() => {
    if (currentWorkspace?.id) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadAll]);

  const scopeLabel =
    scopeOptions.find((scope) => scope.id === financialView)?.label || "Geral";
  const activeSectionMeta =
    visibleNavigationItems.find((section) => section.id === activeSection) ||
    visibleNavigationItems[0];
  const whatsappSetupChecklist = useMemo(() => {
    const setup = nanoOpsStatus?.whatsapp_setup || {};
    return [
      {
        label: "Salvar numero no painel",
        done: Boolean(setup.linked_phone_saved),
      },
      {
        label: "Gerar e enviar codigo de conexao",
        done: Boolean(nanoOpsStatus?.whatsapp_connected),
      },
      {
        label: "Configurar token de verificacao do webhook",
        done: Boolean(setup.webhook_verify_ready),
      },
      {
        label: "Configurar assinatura segura do webhook",
        done: Boolean(setup.signature_ready),
      },
      {
        label: "Habilitar envio de mensagens do provider",
        done: Boolean(setup.outbound_ready),
      },
      {
        label: "Completar variaveis do provider no backend",
        done: Boolean(setup.ready),
      },
    ];
  }, [nanoOpsStatus]);

  const totalIncome = summary?.income || 0;
  const totalExpenses = summary?.expenses || 0;
  const totalBalance = summary?.balance || 0;
  const monthlyResult = totalIncome - totalExpenses;
  const forecastCards = forecast?.forecasts || [];
  const activeAccounts = accounts.filter((item) => item.active !== false);
  const activeCards = cards.filter((item) => item.active !== false);
  const topExpenses = useMemo(() => report?.top_expenses || [], [report]);
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
    () => Object.fromEntries(activeCards.map((card) => [card.id, card])),
    [activeCards],
  );

  const openBills = useMemo(
    () =>
      [...bills]
        .filter((bill) => bill.status !== "paid" && bill.status !== "received")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    [bills],
  );

  const onboardingSteps = [
    {
      label: "Cadastrar uma conta bancária",
      done: statementImports.length > 0,
    },
    {
      label: "Registrar a primeira movimentação",
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
    const text =
      `${transaction.description || ""} ${transaction.category || ""}`.toLowerCase();
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
      const dayTransactions = transactions.filter(
        (transaction) =>
          new Date(transaction.date).toISOString().slice(0, 10) === dateKey,
      );
      const dayBills = openBills.filter(
        (bill) =>
          new Date(bill.due_date).toISOString().slice(0, 10) === dateKey,
      );
      const dayReminders = reminders.filter(
        (reminder) =>
          new Date(reminder.remind_at).toISOString().slice(0, 10) === dateKey,
      );
      const income = dayTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const expense = dayTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      return {
        date: dateKey,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        dueCount: dayBills.length,
        hasReminder: dayReminders.length > 0,
        hasActivity: dayTransactions.length > 0,
        hasDue: dayBills.length > 0,
        income,
        expense,
        net: income - expense,
        reminders: dayReminders,
        transactions: dayTransactions,
        bills: dayBills,
      };
    });
  }, [openBills, reminders, transactions]);

  const metrics = [
    {
      title: "Receitas do mês",
      value: currencyFormatter.format(totalIncome),
      direction: "up",
    },
    {
      title: "Despesas do mês",
      value: currencyFormatter.format(totalExpenses),
      direction: "down",
    },
    {
      title: "Resultado do mês",
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
  const categoryChartData = useMemo(
    () =>
      topExpenses.slice(0, 6).map((item) => ({
        category: item.category,
        amount: item.amount,
      })),
    [topExpenses],
  );
  const cashflowChartData = useMemo(
    () =>
      (cashflowReport?.forecasts || []).slice(0, 6).map((item) => ({
        label: item.month || item.period || "-",
        projected: Number(item.projected_balance || 0),
        income: Number(item.income || 0),
        expense: Number(item.expenses || 0),
      })),
    [cashflowReport],
  );
  const activeCalendarDay = useMemo(() => {
    const fallbackDay =
      calendarDays.find((day) => day.isToday) ||
      calendarDays.find((day) => day.isCurrentMonth) ||
      calendarDays[0];
    const selected = calendarDays.find(
      (day) => day.date === selectedCalendarDate,
    );
    return selected || fallbackDay || null;
  }, [calendarDays, selectedCalendarDate]);
  const topNanoInsights = useMemo(() => {
    const insightsSource = [...insights, ...automationInsights]
      .filter((item) => item?.message)
      .slice(0, 3);
    if (insightsSource.length) return insightsSource;
    return [
      {
        label: "Visão inteligente",
        message:
          "O Nano cruza contas, fluxo e agenda para mostrar o que merece ação hoje.",
      },
    ];
  }, [automationInsights, insights]);
  const cashflowItems = cashflowReport?.forecasts || forecastCards;
  const reportMessage =
    report?.savings_suggestion?.message ||
    "O Nano cruza receitas, despesas, contas e recorrências para sugerir ajustes de rota no financeiro.";
  const payrollSummary = payrollReport?.summary || {};
  const payrollGroups = payrollReport?.groups || { clt: [], contract: [] };
  const todayDateValue = brazilClock.dateValue;
  const overviewHighlights = [
    {
      label: "Posição do mês",
      title:
        monthlyResult >= 0
          ? `Resultado positivo de ${currencyFormatter.format(monthlyResult)}`
          : `Resultado negativo de ${currencyFormatter.format(Math.abs(monthlyResult))}`,
      description:
        monthlyResult >= 0
          ? "O caixa fechou acima das saídas até agora e há espaço para organizar os próximos passos."
          : "As saídas estão acima das entradas no período e o foco precisa ser proteger o caixa.",
    },
    {
      label: "Prioridade do Nano",
      title: "Leitura operacional do momento",
      description: reportMessage,
    },
    {
      label: "Setup do workspace",
      title: `${completionPercent}% da leitura pronta`,
      description:
        "Quanto mais contas, categorias, alertas e rotinas você conclui, mais precisa fica a visão do Nano.",
    },
  ];

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
        eyebrow="Resumo executivo"
        title="O que está acontecendo no seu financeiro agora"
        description="Aqui o Nano resume a posição do mês, destaca a principal prioridade e abre o cockpit completo logo abaixo."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        {overviewHighlights.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className={`${dashboardTheme.panelSecondary} px-4 py-3`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-red-200/70">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold leading-7 text-white">
              {item.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map((item) => (
          <StatCard key={item.title} trendData={monthlyTrend} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.98fr]">
        <SurfacePanel
          title="Receitas x Despesas"
          action={<GhostChip>Últimos 6 meses</GhostChip>}
        >
          <TrendChart data={reportTrendData} />
        </SurfacePanel>

        <SurfacePanel
          title="Calendário Financeiro"
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
          <CalendarPanel
            days={calendarDays}
            selectedDate={activeCalendarDay?.date || null}
            onDaySelect={setSelectedCalendarDate}
            formatter={currencyFormatter}
          />
        </SurfacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.98fr]">
        <SurfacePanel title="Despesas por categoria">
          <CategoryChart data={categoryChartData} />
        </SurfacePanel>
        <SurfacePanel title="Fluxo de caixa projetado">
          <CashflowChart data={cashflowChartData} />
        </SurfacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.98fr]">
        <SurfacePanel
          title={`Resumo do dia ${activeCalendarDay ? new Date(activeCalendarDay.date).toLocaleDateString("pt-BR") : ""}`}
          action={
            <GhostChip>
              {activeCalendarDay?.isToday ? "Hoje" : "Detalhes do dia"}
            </GhostChip>
          }
        >
          <CalendarDaySummary
            day={activeCalendarDay}
            formatter={currencyFormatter}
          />
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

        <SurfacePanel title="Cartões de Crédito">
          {cardTransactions.length ? (
            <div className="space-y-3">
              <SummaryRow
                label="Movimentações no cartão"
                value={String(cardTransactions.length)}
              />
              <SummaryRow
                label="Volume no período"
                value={currencyFormatter.format(
                  cardTransactions.reduce(
                    (total, item) => total + item.amount,
                    0,
                  ),
                )}
              />
              <SummaryRow
                label="Maior fatura projetada"
                value={currencyFormatter.format(
                  Math.max(
                    ...cardTransactions.map(
                      (transaction) => transaction.amount,
                    ),
                    0,
                  ),
                )}
              />
            </div>
          ) : (
            <CenteredEmptyState
              icon={CreditCard}
              title="Nenhum cartão cadastrado"
              description="Comece adicionando movimentações no cartão para acompanhar faturas e limites."
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
                  subtitle="Participação nas saídas"
                  value={currencyFormatter.format(item.amount)}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={TrendingDown}
              title="Nenhuma despesa para exibir"
              description="Assim que novas saídas entrarem, o Nano mostra as categorias mais pesadas."
            />
          )}
        </SurfacePanel>
      </div>

      <SurfacePanel title="Alertas e Pendências">
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
            {[...insights, ...automationInsights]
              .slice(0, 3)
              .map((item, index) => (
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
            message="Nenhuma pendência crítica foi encontrada na visão atual."
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
        eyebrow="Movimentações"
        title="Entradas, saídas e transferências"
        description="Copiamos a fluidez operacional do Fingu, mas com o Nano focado na sua lógica financeira e no assistente inteligente."
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
        <SurfacePanel title="Nova movimentação">
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
              placeholder="Descrição da movimentação"
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
                <option value="">Sem cartão</option>
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
                <option value="card">cartão</option>
                <option value="boleto">Boleto</option>
                <option value="transfer">Transferência</option>
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
              Salvar movimentação
            </Button>
          </form>
        </SurfacePanel>

        <SurfacePanel title="Histórico financeiro">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.4fr_0.4fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9f9188]" />
              <Input
                placeholder="Buscar movimentações..."
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
              onChange={(event) =>
                setTransactionMethodFilter(event.target.value)
              }
              className={pageFieldClass}
            >
              <option value="all">Método</option>
              <option value="pix">Pix</option>
              <option value="card">cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-[#eadfd6] bg-white">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr_0.7fr] gap-3 border-b border-[#f0e6de] px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8e7f76]">
              <span>Descrição</span>
              <span>Data</span>
              <span>Tipo</span>
              <span>Método</span>
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
                  <span>
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="capitalize">
                    {transaction.type === "income" ? "Receita" : "Despesa"}
                  </span>
                  <span className="capitalize">
                    {transaction.payment_method}
                  </span>
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
                Nenhuma movimentação encontrada.
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
        eyebrow="Instituições Bancárias"
        title="Gerencie contas bancárias e visualize saldos"
        description="O Nano ainda não faz conciliação bancária completa, mas já organiza extratos, entradas e saídas para preparar essa camada."
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
                label="Movimentações bancárias"
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
            description="Adicione sua primeira conta bancária para centralizar saldos e acompanhar movimentos."
            bullets={[
              "Centralize os saldos de todas as suas contas",
              "Acompanhe a evolução do patrimônio",
              "Classifique e organize suas movimentações",
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
        eyebrow="Cartões de Crédito"
        title="Gerencie seus cartões, limites e faturas"
        description="A lógica do Nano continua moderna: cartões ajudam a explicar seu fluxo mensal, previsão de fatura e parcelamentos."
        action={
          <Button type="button" className={`h-12 ${actionButtonClass}`}>
            <Plus className="mr-2 h-4.5 w-4.5" />
            Adicionar cartão
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
                leitura do cartão
              </p>
              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Total no cartão"
                  value={currencyFormatter.format(
                    cardTransactions.reduce(
                      (total, item) => total + item.amount,
                      0,
                    ),
                  )}
                />
                <SummaryRow
                  label="Lançamentos"
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
            title="Nenhum cartão cadastrado"
            description="Comece adicionando seu primeiro cartão de crédito para prever próximas faturas."
            bullets={[
              "Acompanhe o limite disponível em tempo real",
              "Preveja o valor das próximas faturas",
              "Controle seus parcelamentos de forma inteligente",
            ]}
            primaryActionLabel="Adicionar cartão"
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
        description="O Nano usa quem paga, quem recebe e quem aparece nas contas para formar uma visão mais operacional do seu caixa."
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
                    <p className="font-semibold text-[#1f1814]">
                      {contact.name}
                    </p>
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
            description="Assim que contas e cobranças tiverem origem ou cliente, essa lista aparece aqui."
          />
        )}
      </SurfacePanel>
    </SectionLayout>
  );

  const renderEmployees = () => (
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
        eyebrow="Funcionários e Folha"
        title="Ponto, presença, faltas e pagamento"
        description="Cadastre equipe CLT e contrato, registre presença/falta por dia e feche a estimativa do mês com desconto de faltas e INSS."
        action={
          <div className="flex flex-wrap gap-3">
            <input
              ref={payrollSheetInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePayrollSheetUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={triggerPayrollSheetUpload}
              disabled={uploadingPayrollSheet}
              className="h-12 rounded-2xl border border-red-500/18 bg-black/20 px-4 text-zinc-100 hover:bg-red-500/10"
            >
              {uploadingPayrollSheet ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lendo folha
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Importar folha
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportPayrollAttendance}
              className="h-12 rounded-2xl border border-white/12 bg-black/20 px-4 text-zinc-100 hover:bg-white/5"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar XLSX
            </Button>
            <Button
              type="button"
              onClick={() => loadPayrollData(currentWorkspace.id)}
              className={`h-12 ${actionButtonClass}`}
            >
              Atualizar folha
            </Button>
          </div>
        }
      />

      <SurfacePanel title="Cadastro de funcionário">
        {payrollImportResult?.employees_count ? (
          <div className="mb-5 space-y-4 rounded-[24px] border border-red-500/12 bg-black/20 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <StatMiniCard
                label="Funcionarios lidos"
                value={String(payrollImportResult.employees_count || 0)}
              />
              <StatMiniCard
                label="Novos"
                value={String(payrollImportResult.created || 0)}
              />
              <StatMiniCard
                label="Atualizados"
                value={String(payrollImportResult.updated || 0)}
              />
              <StatMiniCard
                label="Competencia"
                value={payrollImportResult.competence || "-"}
              />
            </div>
            <div className="space-y-2">
              {(payrollImportResult.items || []).slice(0, 5).map((item) => (
                <InfoRow
                  key={`${item.id}-${item.cpf}`}
                  title={`${item.name} - ${item.role}`}
                  subtitle={`CPF ${item.cpf} • INSS ${item.inss_percent || 0}% • Salario-familia ${currencyFormatter.format(item.salary_family_amount || 0)}`}
                  value={`${item.status === "created" ? "Novo" : "Atualizado"} • ${currencyFormatter.format(item.salary || 0)}`}
                />
              ))}
            </div>
          </div>
        ) : null}
        <form onSubmit={submitEmployee} className="grid gap-3 xl:grid-cols-6">
          <Input
            placeholder="Nome completo"
            value={employeeForm.name}
            onChange={(event) =>
              setEmployeeForm({ ...employeeForm, name: event.target.value })
            }
            className={`${pageFieldClass} xl:col-span-2`}
          />
          <Input
            placeholder="CPF"
            value={employeeForm.cpf}
            onChange={(event) =>
              setEmployeeForm({ ...employeeForm, cpf: event.target.value })
            }
            className={pageFieldClass}
          />
          <Input
            placeholder="Função"
            value={employeeForm.role}
            onChange={(event) =>
              setEmployeeForm({ ...employeeForm, role: event.target.value })
            }
            className={pageFieldClass}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Salário"
            value={employeeForm.salary}
            onChange={(event) =>
              setEmployeeForm({ ...employeeForm, salary: event.target.value })
            }
            className={pageFieldClass}
          />
          <select
            className={pageFieldClass}
            value={employeeForm.employee_type}
            onChange={(event) =>
              setEmployeeForm({
                ...employeeForm,
                employee_type: event.target.value,
              })
            }
          >
            <option value="clt">Carteira (CLT)</option>
            <option value="contract">Contrato/Terceirizado</option>
          </select>
          <select
            className={pageFieldClass}
            value={employeeForm.payment_cycle}
            onChange={(event) =>
              setEmployeeForm({
                ...employeeForm,
                payment_cycle: event.target.value,
              })
            }
          >
            <option value="monthly">Mensal</option>
            <option value="biweekly">Quinzenal</option>
          </select>
          <Input
            type="number"
            min="0"
            step="0.01"
            disabled={employeeForm.employee_type !== "clt"}
            placeholder="% INSS (CLT)"
            value={employeeForm.inss_percent}
            onChange={(event) =>
              setEmployeeForm({
                ...employeeForm,
                inss_percent: event.target.value,
              })
            }
            className={pageFieldClass}
          />
          <Input
            placeholder="Observações (opcional)"
            value={employeeForm.notes}
            onChange={(event) =>
              setEmployeeForm({ ...employeeForm, notes: event.target.value })
            }
            className={`${pageFieldClass} xl:col-span-2`}
          />
          <Input
            type="number"
            min="0"
            step="1"
            disabled={employeeForm.employee_type !== "clt"}
            placeholder="Dependentes"
            value={employeeForm.dependents_count}
            onChange={(event) =>
              setEmployeeForm({
                ...employeeForm,
                dependents_count: event.target.value,
              })
            }
            className={pageFieldClass}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            disabled={employeeForm.employee_type !== "clt"}
            placeholder="Salario-familia"
            value={employeeForm.salary_family_amount}
            onChange={(event) =>
              setEmployeeForm({
                ...employeeForm,
                salary_family_amount: event.target.value,
              })
            }
            className={pageFieldClass}
          />
          <Button
            type="submit"
            className={`h-12 xl:col-span-1 ${actionButtonClass}`}
          >
            Cadastrar
          </Button>
        </form>
      </SurfacePanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SurfacePanel title="Registro de presença/falta">
          <div className="mb-4 rounded-[24px] border border-[#eadfd6] bg-[#fff8f4] px-4 py-3">
            <p className="text-sm font-semibold text-[#1f1814]">
              Mes de referencia: {brazilClock.monthLabel}
            </p>
            <p className="mt-1 text-sm text-[#857870]">
              As datas usam o horario oficial de Brasilia.
            </p>
            <p className="mt-1 text-sm text-[#857870]">
              Presenca nao precisa ser lancada. Se nao houver registro no dia,
              o sistema considera presenca automaticamente.
            </p>
          </div>
          <form
            onSubmit={submitAttendance}
            className="grid gap-3 md:grid-cols-4"
          >
            <select
              className={pageFieldClass}
              value={attendanceForm.employee_id}
              onChange={(event) =>
                setAttendanceForm({
                  ...attendanceForm,
                  employee_id: event.target.value,
                })
              }
            >
              <option value="">Selecione funcionário</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.role}
                </option>
              ))}
            </select>
            <Popover
              open={attendanceCalendarOpen}
              onOpenChange={setAttendanceCalendarOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 justify-between rounded-2xl border border-[#eadfd6] bg-white px-4 text-left font-normal text-[#1f1814] hover:bg-[#fff8f4]"
                >
                  <span>
                    {attendanceForm.date
                      ? formatBrazilDateLabel(attendanceForm.date)
                      : "Selecione a data"}
                  </span>
                  <CalendarDays className="h-4 w-4 text-[#7f1d1d]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto rounded-[24px] border border-[#eadfd6] bg-white p-0 shadow-[0_24px_60px_rgba(31,24,20,0.16)]"
              >
                <Calendar
                  mode="single"
                  selected={dateValueToCalendarDate(attendanceForm.date)}
                  defaultMonth={dateValueToCalendarDate(attendanceForm.date)}
                  onSelect={(value) => {
                    if (!value) return;
                    setAttendanceForm((current) => ({
                      ...current,
                      date: calendarDateToDateValue(value),
                    }));
                    setAttendanceCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    calendarDateToDateValue(date) > todayDateValue
                  }
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <select
              className={pageFieldClass}
              value={attendanceForm.status}
              onChange={(event) =>
                setAttendanceForm({
                  ...attendanceForm,
                  status: event.target.value,
                })
              }
            >
              <option value="absent">Falta</option>
              <option value="medical_leave">Atestado (CLT)</option>
            </select>
            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Registrar
            </Button>
          </form>
          <div className="mt-4">
            <Input
              placeholder="Observação do ponto (opcional)"
              value={attendanceForm.notes}
              onChange={(event) =>
                setAttendanceForm({
                  ...attendanceForm,
                  notes: event.target.value,
                })
              }
              className={pageFieldClass}
            />
          </div>
          <div className="mt-5 space-y-2">
            {attendanceRecords.slice(0, 5).map((record) => (
              <InfoRow
                key={record.id}
                title={`${record.employee_name || "Funcionario"} - ${
                  record.status === "absent"
                    ? "Falta"
                    : record.status === "medical_leave"
                      ? "Atestado"
                      : "Presenca"
                }`}
                subtitle={new Date(record.date).toLocaleDateString("pt-BR")}
                value={record.employee_type === "clt" ? "CLT" : "Contrato"}
              />
            ))}
            {!attendanceRecords.length && (
              <CenteredEmptyState
                icon={CalendarDays}
                title="Sem registros no periodo"
                description="Registre apenas faltas ou atestados para alimentar o calculo da folha."
              />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel
          title={`Resumo da folha - ${payrollReport?.month || payrollMonth}`}
        >
          {payrollLoading ? (
            <p className="text-sm text-zinc-400">Calculando folha...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <StatMiniCard
                label="Funcionários"
                value={String(payrollSummary.employees || 0)}
              />
              <StatMiniCard
                label="Faltas no mês"
                value={String(payrollSummary.absent_days || 0)}
              />
              <StatMiniCard
                label="Atestados"
                value={String(payrollSummary.medical_leave_days || 0)}
              />
              <StatMiniCard
                label="Bruto"
                value={currencyFormatter.format(
                  payrollSummary.gross_salary || 0,
                )}
              />
              <StatMiniCard
                label="Líquido estimado"
                value={currencyFormatter.format(
                  payrollSummary.net_payable || 0,
                )}
              />
              <StatMiniCard
                label="Desconto faltas"
                value={currencyFormatter.format(
                  payrollSummary.absence_discount || 0,
                )}
              />
              <StatMiniCard
                label="Desconto INSS"
                value={currencyFormatter.format(
                  payrollSummary.inss_discount || 0,
                )}
              />
              <StatMiniCard
                label="Salario-familia"
                value={currencyFormatter.format(
                  payrollSummary.salary_family_amount || 0,
                )}
              />
            </div>
          )}
        </SurfacePanel>
      </div>

      <SurfacePanel
        title="Equipe cadastrada"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={exportPayrollAttendance}
              className="h-11 rounded-2xl border border-white/12 bg-black/20 px-4 text-sm text-zinc-100 hover:bg-white/5"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar presenca e folha
            </Button>
            <Input
              type="month"
              value={payrollMonth}
              onChange={(event) => setPayrollMonth(event.target.value)}
              className="h-11 w-[160px] rounded-2xl border border-red-500/12 bg-black/20 px-3 text-sm text-zinc-100"
            />
            <select
              className="h-11 rounded-2xl border border-red-500/12 bg-black/20 px-3 text-sm text-zinc-100"
              value={payrollEmployeeTypeFilter}
              onChange={(event) =>
                setPayrollEmployeeTypeFilter(event.target.value)
              }
            >
              <option value="all">Todos</option>
              <option value="clt">CLT</option>
              <option value="contract">Contrato</option>
            </select>
            <select
              className="h-11 rounded-2xl border border-red-500/12 bg-black/20 px-3 text-sm text-zinc-100"
              value={payrollPaymentCycleFilter}
              onChange={(event) =>
                setPayrollPaymentCycleFilter(event.target.value)
              }
            >
              <option value="all">Ciclo: padrão</option>
              <option value="monthly">Mensal</option>
              <option value="biweekly">Quinzenal</option>
            </select>
          </div>
        }
      >
        <div className="space-y-3">
          {employees.length ? (
            employees.map((employee) => (
              <div
                key={employee.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-red-500/10 bg-black/20 p-4"
              >
                <div>
                  <p className="font-semibold text-white">{employee.name}</p>
                  <p className="text-sm text-zinc-400">
                    {employee.role} • CPF {employee.cpf}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="border border-red-500/20 bg-red-500/10 text-red-100">
                    {employee.employee_type === "clt" ? "CLT" : "Contrato"}
                  </Badge>
                  <Badge className="border border-white/10 bg-black/30 text-zinc-200">
                    {employee.payment_cycle === "biweekly"
                      ? "Quinzenal"
                      : "Mensal"}
                  </Badge>
                  <Badge className="border border-white/10 bg-black/30 text-zinc-200">
                    {currencyFormatter.format(employee.salary || 0)}
                  </Badge>
                  {!!employee.salary_family_amount && (
                    <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-100">
                      SF {currencyFormatter.format(employee.salary_family_amount || 0)}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deactivateEmployee(employee.id)}
                    className="h-9 rounded-xl border border-red-500/20 bg-black/20 px-3 text-xs text-zinc-200 hover:bg-red-500/10"
                  >
                    Demitir
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <CenteredEmptyState
              icon={Users2}
              title="Nenhum funcionário cadastrado"
              description="Cadastre os funcionários para iniciar o controle de ponto e folha."
            />
          )}
        </div>
      </SurfacePanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfacePanel title="Relatório CLT">
          {payrollGroups.clt?.length ? (
            <div className="space-y-3">
              {payrollGroups.clt.map((item) => (
                <InfoRow
                  key={item.employee_id}
                  title={`${item.name} - Faltas: ${item.absent_days} | Atestados: ${item.medical_leave_days || 0}`}
                  subtitle={`INSS ${item.inss_percent}% • Desconto faltas ${currencyFormatter.format(
                    item.absence_discount || 0,
                  )}`}
                  value={currencyFormatter.format(
                    item.net_month_estimated || 0,
                  )}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={CalendarDays}
              title="Sem dados CLT neste período"
              description="Não ha funcionários CLT ou registros para o mês selecionado."
            />
          )}
        </SurfacePanel>
        <SurfacePanel title="Relatório Contrato/Terceirizado">
          {payrollGroups.contract?.length ? (
            <div className="space-y-3">
              {payrollGroups.contract.map((item) => (
                <InfoRow
                  key={item.employee_id}
                  title={`${item.name} - Faltas: ${item.absent_days}`}
                  subtitle={`Diaria ${currencyFormatter.format(item.daily_rate || 0)} • Desconto faltas ${currencyFormatter.format(
                    item.absence_discount || 0,
                  )}`}
                  value={currencyFormatter.format(
                    item.net_month_estimated || 0,
                  )}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={CalendarDays}
              title="Sem dados de contrato neste período"
              description="Não ha terceirizados ou registros para o mês selecionado."
            />
          )}
        </SurfacePanel>
      </div>
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
        eyebrow="Relatórios"
        title="Análises detalhadas e demonstrativos financeiros"
        description="A dinâmica é mais limpa, mas a leitura segue moderna: relatórios, previsões, importação de extrato e economia sugerida."
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
          title="Balanço do período"
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
              Total de transações no período: {report?.transactions_count || 0}.
              Total de contas registradas: {report?.bills_count || 0}.
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel title="Importações recentes">
          {statementImportResult?.preview_rows?.length ? (
            <div className="space-y-3">
              {statementImportResult.preview_rows
                .slice(0, 5)
                .map((row, index) => (
                  <div
                    key={index}
                    className="rounded-[24px] border border-[#eadfd6] bg-[#fffdf9] p-4"
                  >
                    {Object.entries(row)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key} className="text-xs text-[#6d615a]">
                          <span className="font-semibold text-[#9e8f85]">
                            {key}:
                          </span>{" "}
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
        eyebrow="Configurações da Empresa"
        title="Gerencie as informações e preferências da empresa"
        description="A tela segue a organização do Fingu, mas mantendo a estrutura moderna do Nano e a futura expansão para automações."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SurfacePanel title="Informações da empresa">
          <form onSubmit={saveCompanySettings} className="grid gap-4">
            <input
              ref={cnpjCardInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
              className="hidden"
              onChange={handleCnpjCardUpload}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-red-500/12 bg-black/20 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Upload do cartao CNPJ
                </p>
                <p className="text-sm text-zinc-400">
                  O Nano le os dados do cartao, vincula ao workspace atual e ja prepara a empresa para administracao.
                </p>
              </div>
              <Button
                type="button"
                onClick={triggerCnpjCardUpload}
                disabled={uploadingCnpjCard}
                className={`h-11 ${actionButtonClass}`}
              >
                {uploadingCnpjCard ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lendo cartao...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Enviar cartao CNPJ ou PDF
                  </>
                )}
              </Button>
            </div>
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
                placeholder="Subdomínio"
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
                <option value="servicos">Serviços</option>
                <option value="comercio">Comércio</option>
                <option value="industria">Indústria</option>
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
                placeholder="Endereço"
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
                  setCompanyForm({
                    ...companyForm,
                    website: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
            </div>
            <Textarea
              placeholder="Descrição da empresa"
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
                Salvar alterações
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

          <SurfacePanel title="Registros de ações">
            <div className="space-y-3">
              <InfoRow
                title="Ultima atualização do workspace"
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
        eyebrow="Perfil do Usuário"
        title="Gerencie suas informações pessoais e segurança"
        description="A tela fica mais limpa e clara, no mesmo ritmo do Fingu, mas pronta para evoluir junto com as automações do Nano."
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
                placeholder="Nome de exibição"
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
                Salvar alterações
              </Button>
            </div>
          </form>
        </SurfacePanel>

        <SurfacePanel title="Segurança">
          <div className="space-y-4">
            <SecurityCard
              title="Autenticação em dois fatores"
              description="Proteja sua conta com uma segunda camada de segurança."
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
        eyebrow="Configurações"
        title="Rotina, categorias e automações do Nano"
        description="Aqui entra a parte mais moderna da nossa lógica: classificação, alertas, lembretes e preparação do assistente."
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <SurfacePanel title="Preferências da plataforma">
          <form onSubmit={persistPlatformSettings} className="space-y-5">
            <ToggleRow
              label="Notificações do sistema"
              helper="Avisos de vencimento, extratos e movimentações importantes."
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
              helper="Prepara a esteira de cobrança e lembrete automatizado."
              checked={settingsForm.whatsapp_alerts}
              onChange={() =>
                setSettingsForm((current) => ({
                  ...current,
                  whatsapp_alerts: !current.whatsapp_alerts,
                }))
              }
            />

            <div className="rounded-[24px] border border-[#eadfd6] bg-[#fff8f4] p-4">
              <p className="text-sm font-semibold text-[#1f1814]">
                Tema visual
              </p>
              <p className="mt-1 text-sm text-[#857870]">
                O painel agora usa o tema claro com acento vermelho, inspirado
                no ritmo do Fingu.
              </p>
            </div>

            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Salvar preferências
            </Button>
          </form>
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel title="Personalizacao do site">
            <form onSubmit={persistPlatformSettings} className="space-y-5">
              <div className="rounded-[24px] border border-[#eadfd6] bg-[#fff8f4] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1814] text-white">
                    <MousePointer2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#1f1814]">
                      Cursor do site
                    </p>
                    <p className="text-sm text-[#857870]">
                      O cursor customizado agora fica so na pagina inicial e
                      pode ser trocado pelo cursor padrao quando preferir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    id: "custom",
                    title: "Cursor Nano",
                    description:
                      "Ativa o cursor personalizado apenas na home do site.",
                  },
                  {
                    id: "default",
                    title: "Cursor padrao do PC",
                    description:
                      "Mantem o cursor nativo do sistema em todas as paginas.",
                  },
                ].map((option) => {
                  const selected = settingsForm.cursor_mode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setSettingsForm((current) => ({
                          ...current,
                          cursor_mode: option.id,
                        }))
                      }
                      className={`rounded-[24px] border px-5 py-4 text-left transition ${
                        selected
                          ? "border-red-500/45 bg-red-500/10 shadow-[0_12px_30px_rgba(185,28,28,0.12)]"
                          : "border-[#eadfd6] bg-white hover:border-red-300/45"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#1f1814]">
                            {option.title}
                          </p>
                          <p className="mt-1 text-sm text-[#857870]">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? "border-red-600 bg-red-600"
                              : "border-[#d8c9bf] bg-transparent"
                          }`}
                        >
                          {selected ? (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button type="submit" className={`h-12 ${actionButtonClass}`}>
                Salvar personalizacao
              </Button>
            </form>
          </SurfacePanel>

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
                  description="As categorias ajudam o Nano a destacar onde a margem está sendo pressionada."
                />
              )}
            </div>
          </SurfacePanel>

          <SurfacePanel
            title="Lembretes e automações"
            action={
              <Button
                type="button"
                variant="outline"
                onClick={generateRecurringBills}
                className="h-11 rounded-2xl border-[#eadfd6] bg-white px-4 text-[#4b4039] hover:bg-[#fbf4ef]"
              >
                Gerar recorrências
              </Button>
            }
          >
            <form
              onSubmit={submitReminder}
              className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]"
            >
              <Input
                placeholder="Título do lembrete"
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
                  description="Use esta área para estruturar a agenda financeira do Nano."
                />
              )}

              {[...automationInsights].slice(0, 2).map((item, index) => (
                <AlertRow
                  key={`${item.type || "auto"}-${index}`}
                  title={item.label || "Automação sugerida"}
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

  const renderAutomations = () => (
    <SectionLayout>
      <PageHeader
        eyebrow="Automações"
        title="Rotinas e histórico operacional do Nano"
        description="Acompanhe sinais automáticos, tarefas criadas pelo agente e execuções realizadas no workspace."
        action={
          <Button
            type="button"
            onClick={() => currentWorkspace?.id && loadNanoOpsData(currentWorkspace.id)}
            className={`h-12 ${actionButtonClass}`}
          >
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SurfacePanel title="Base de automações">
          {nanoOpsLoading ? (
            <p className="text-sm text-zinc-400">Carregando automações...</p>
          ) : nanoOpsAutomations.length ? (
            <div className="space-y-3">
              {nanoOpsAutomations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.title}
                      </p>
                      <p className="text-sm text-zinc-400">{item.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant={item.enabled ? "outline" : "default"}
                      onClick={() => toggleNanoAutomation(item.id, !item.enabled)}
                      className={`h-10 rounded-2xl px-4 ${
                        item.enabled
                          ? "border border-white/12 bg-black/20 text-zinc-100 hover:bg-white/5"
                          : actionButtonClass
                      }`}
                    >
                      {item.enabled ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <StatMiniCard
                      label="Status"
                      value={item.enabled ? "Ativa" : "Pausada"}
                    />
                    <StatMiniCard
                      label="Sinal"
                      value={String(item.signal || 0)}
                    />
                    <StatMiniCard
                      label="Horario"
                      value={`${String(item.trigger_hour ?? 8).padStart(2, "0")}:00`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={BrainCircuit}
              title="Nenhuma automação carregada"
              description="A base operacional do Nano aparece aqui."
            />
          )}
        </SurfacePanel>

        <SurfacePanel title="Histórico de ações do Nano">
          {nanoOpsTasks.length ? (
            <div className="space-y-3">
              {nanoOpsTasks.slice(0, 12).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.type} • ${item.source_channel} • ${item.status}`}
                  value={item.risk_level || "low_risk"}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={CalendarDays}
              title="Sem histórico operacional"
              description="As ações do Nano via web e WhatsApp aparecem aqui."
            />
          )}
        </SurfacePanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfacePanel title="Trilha de auditoria">
          {nanoOpsAudits.length ? (
            <div className="space-y-3">
              {nanoOpsAudits.slice(0, 12).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.message || item.event_type}
                  subtitle={`${item.event_type} • ${item.source_channel} • ${new Date(item.created_at).toLocaleString("pt-BR")}`}
                  value={`${item.risk_level || "low_risk"} • ${item.status}`}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={ShieldCheck}
              title="Sem auditoria ainda"
              description="Pedidos, confirmações e execuções do Nano passam a aparecer aqui."
            />
          )}
        </SurfacePanel>

        <SurfacePanel title="Leitura operacional">
          <div className="space-y-3">
            <InfoRow
              title="Canal principal"
              subtitle="As automações configuradas aqui usam o mesmo AgentOrchestrator do chat web."
              value="WhatsApp + painel"
            />
            <InfoRow
              title="Ações sensíveis"
              subtitle="Tudo o que exigir confirmação ou executar mudança real entra na trilha de auditoria."
              value={`${nanoOpsConfirmations.length} pendente(s)`}
            />
            <InfoRow
              title="Rotina ativa"
              subtitle="Desative individualmente qualquer automação para o workspace sem desligar o Nano."
              value={`${nanoOpsAutomations.filter((item) => item.enabled).length} ativa(s)`}
            />
          </div>
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const renderActivities = () => (
    <SectionLayout>
      <PageHeader
        eyebrow="Atividades"
        title="Rotinas pessoais e da empresa com acompanhamento do Nano"
        description="Crie atividades recorrentes, escolha o escopo e deixe o Nano avisar no painel e no WhatsApp com antecedencia."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfacePanel title="Nova atividade">
          <form onSubmit={submitActivity} className="grid gap-3">
            <Input
              placeholder="Ex.: Academia, revisar caixa, estudar ingles"
              value={activityForm.title}
              onChange={(event) =>
                setActivityForm({
                  ...activityForm,
                  title: event.target.value,
                })
              }
              className={pageFieldClass}
            />
            <Textarea
              placeholder="Detalhes opcionais"
              value={activityForm.description}
              onChange={(event) =>
                setActivityForm({
                  ...activityForm,
                  description: event.target.value,
                })
              }
              className={textAreaClass}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={activityForm.account_scope}
                onChange={(event) =>
                  setActivityForm({
                    ...activityForm,
                    account_scope: event.target.value,
                  })
                }
                className={pageFieldClass}
              >
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
              <select
                value={activityForm.recurrence}
                onChange={(event) =>
                  setActivityForm({
                    ...activityForm,
                    recurrence: event.target.value,
                  })
                }
                className={pageFieldClass}
              >
                <option value="once">Uma vez</option>
                <option value="daily">Todos os dias</option>
                <option value="weekdays">Dias uteis</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={activityForm.start_at}
                onChange={(event) =>
                  setActivityForm({
                    ...activityForm,
                    start_at: event.target.value,
                  })
                }
                className={pageFieldClass}
              />
              <select
                value={String(activityForm.reminder_minutes_before)}
                onChange={(event) =>
                  setActivityForm({
                    ...activityForm,
                    reminder_minutes_before: Number(event.target.value),
                  })
                }
                className={pageFieldClass}
              >
                <option value="30">Avisar 30 min antes</option>
                <option value="60">Avisar 1h antes</option>
                <option value="120">Avisar 2h antes</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={activityForm.notify_web}
                  onChange={(event) =>
                    setActivityForm({
                      ...activityForm,
                      notify_web: event.target.checked,
                    })
                  }
                />
                Avisar no painel
              </label>
              <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={activityForm.notify_whatsapp}
                  onChange={(event) =>
                    setActivityForm({
                      ...activityForm,
                      notify_whatsapp: event.target.checked,
                    })
                  }
                />
                Avisar no WhatsApp
              </label>
            </div>
            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Salvar atividade
            </Button>
          </form>
        </SurfacePanel>

        <SurfacePanel title="Agenda de atividades">
          {activities.length ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-100">
                        {activity.title}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {activity.description || "Sem detalhes adicionais"}
                      </p>
                    </div>
                    <Badge className="border border-white/10 bg-black/30 text-zinc-200">
                      {activity.account_scope === "business" ? "Empresa" : "Pessoal"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatMiniCard
                      label="Inicio"
                      value={new Date(activity.start_at).toLocaleString("pt-BR")}
                    />
                    <StatMiniCard
                      label="Recorrencia"
                      value={
                        activity.recurrence === "weekdays"
                          ? "Dias uteis"
                          : activity.recurrence === "daily"
                            ? "Diaria"
                            : activity.recurrence === "weekly"
                              ? "Semanal"
                              : "Uma vez"
                      }
                    />
                    <StatMiniCard
                      label="Proxima execucao"
                      value={
                        activity.next_occurrence_at
                          ? new Date(activity.next_occurrence_at).toLocaleString("pt-BR")
                          : "-"
                      }
                    />
                    <StatMiniCard
                      label="Aviso"
                      value={`${activity.reminder_minutes_before || 60} min antes`}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleActivity(activity)}
                      className="h-10 rounded-2xl border border-white/12 bg-black/20 px-4 text-sm text-zinc-100 hover:bg-white/5"
                    >
                      {activity.is_active ? "Pausar" : "Ativar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeActivity(activity.id)}
                      className="h-10 rounded-2xl border border-red-500/18 bg-red-500/10 px-4 text-sm text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={Clock3}
              title="Nenhuma atividade cadastrada"
              description="Crie rotinas pessoais ou da empresa para o Nano acompanhar e lembrar."
            />
          )}
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const renderNanoWhatsapp = () => (
    <SectionLayout>
      <PageHeader
        eyebrow="WhatsApp do Nano"
        title="Canal operacional do agente"
        description="Conecte o número, monitore confirmações pendentes e acompanhe o uso multicanal do mesmo orquestrador."
        action={
          <Button
            type="button"
            onClick={() => currentWorkspace?.id && loadNanoOpsData(currentWorkspace.id)}
            className={`h-12 ${actionButtonClass}`}
          >
            Atualizar canal
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1fr]">
        <SurfacePanel title="Número conectado">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatMiniCard
              label="Status"
              value={nanoOpsStatus?.whatsapp_connected ? "Conectado" : "Desconectado"}
            />
            <StatMiniCard
              label="Pendências"
              value={String(nanoOpsStatus?.pending_confirmations || 0)}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatMiniCard
              label="Código atual"
              value={whatsappLinkCode?.code || "Nenhum"}
            />
            <StatMiniCard
              label="Expira"
              value={
                whatsappLinkCode?.expires_at
                  ? `${new Date(whatsappLinkCode.expires_at).toLocaleTimeString("pt-BR")} ${whatsappLinkCountdown ? `• ${whatsappLinkCountdown}` : ""}`
                  : "-"
              }
            />
          </div>
          <form onSubmit={submitWhatsappLink} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={whatsappLinkPhone}
              onChange={(event) => setWhatsappLinkPhone(event.target.value)}
              placeholder="Número do WhatsApp com DDD"
              className={pageFieldClass}
            />
            <Button type="submit" className={`h-12 ${actionButtonClass}`}>
              Salvar número
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            onClick={generateWhatsappLinkCode}
            className="mt-3 h-11 rounded-2xl border border-white/12 bg-black/20 px-4 text-sm text-zinc-100 hover:bg-white/5"
          >
            Gerar código de conexão
          </Button>
          <p className="mt-3 text-sm text-zinc-400">
            Gere o código no painel e envie esse código para o WhatsApp do Nano para concluir a conexão pelo celular.
          </p>
          {!!whatsappLinkCode?.code && (
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              Aguardando envio do código {whatsappLinkCode.code}
            </p>
          )}
        </SurfacePanel>

        <SurfacePanel title="Confirmações pendentes">
          {nanoOpsConfirmations.length ? (
            <div className="space-y-3">
              {nanoOpsConfirmations.slice(0, 12).map((item) => (
                <InfoRow
                  key={item.id}
                  title={item.action?.message || "Ação pendente"}
                  subtitle={`${item.source_channel} • expira em ${new Date(item.expires_at).toLocaleString("pt-BR")}`}
                  value={item.status}
                />
              ))}
            </div>
          ) : (
            <CenteredEmptyState
              icon={ShieldCheck}
              title="Nenhuma confirmação pendente"
              description="Ações sensíveis do Nano aparecem aqui antes da execução."
            />
          )}
        </SurfacePanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1fr]">
        <SurfacePanel title="O que falta para finalizar">
          <div className="space-y-3">
            {whatsappSetupChecklist.map((item) => (
              <InfoRow
                key={item.label}
                title={item.label}
                subtitle="Checklist operacional do WhatsApp do Nano"
                value={item.done ? "OK" : "Pendente"}
              />
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel title="Leitura do canal">
          <div className="space-y-3">
            <InfoRow
              title="Provider atual"
              subtitle="Detectado a partir das variaveis de ambiente do backend."
              value={nanoOpsStatus?.whatsapp_setup?.provider || "generic"}
            />
            <InfoRow
              title="Envio para o usuario"
              subtitle="As atividades e automacoes podem avisar no WhatsApp quando o canal estiver pronto."
              value={nanoOpsStatus?.whatsapp_setup?.outbound_ready ? "Pronto" : "Bloqueado"}
            />
            <InfoRow
              title="Numero vinculado"
              subtitle="O usuario precisa concluir o codigo enviado pelo painel para operar pelo celular."
              value={nanoOpsStatus?.whatsapp_connected ? "Vinculado" : "Aguardando"}
            />
            <InfoRow
              title="Credenciais faltando"
              subtitle="Variaveis de ambiente ainda ausentes no backend para colocar o canal em producao."
              value={
                nanoOpsStatus?.whatsapp_setup?.missing_env?.length
                  ? nanoOpsStatus.whatsapp_setup.missing_env.join(", ")
                  : "Nenhuma"
              }
            />
          </div>
        </SurfacePanel>
      </div>
    </SectionLayout>
  );

  const sectionContent = {
    overview: <DashboardOverview content={renderOverview()} />,
    transactions: <DashboardTransactions content={renderTransactions()} />,
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
        openFinanceConnections={openFinanceConnections}
        openFinanceAccounts={openFinanceAccounts}
        openFinanceSyncingId={openFinanceSyncingId}
        openFinanceEnabled={OPEN_FINANCE_ENABLED}
        onOpenFinanceConnect={handleOpenFinanceConnect}
        onOpenFinanceSync={handleOpenFinanceSync}
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
    employees: renderEmployees(),
    activities: renderActivities(),
    automations: <DashboardAutomations content={renderAutomations()} />,
    nano_whatsapp: <DashboardWhatsapp content={renderNanoWhatsapp()} />,
    reports: <DashboardReports content={(
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
    )} />,
    company: renderCompany(),
    profile: renderProfile(),
    settings: <DashboardSettings content={renderSettings()} />,
    assistant: (
      <DashboardAssistant
        bills={bills}
        financialView={financialView}
        navigate={navigate}
        onAfterMessage={refreshAfterAssistantMessage}
        reminders={reminders}
        setActiveSection={setActiveSection}
        transactions={transactions}
        userName={user?.name}
      />
    ),
  };

  const subscriptionAccess = billingStatus?.access;
  const subscriptionRecord = billingStatus?.subscription;
  const shouldShowBillingCta =
    Boolean(currentWorkspace?.id) &&
    !billingLoading &&
    !subscriptionAccess?.has_access;
  const billingHeadline = subscriptionAccess?.status
    ? `Status atual: ${
        billingStatusLabels[subscriptionAccess.status] ||
        subscriptionAccess.status
      }`
    : "Ative seu plano para liberar o uso completo do Nano.";
  const billingDescription = subscriptionRecord
    ? "Seu workspace ja iniciou um fluxo de assinatura, mas o acesso total ainda depende da confirmacao real do pagamento via webhook."
    : "Seu workspace ja foi criado. O proximo passo e ativar a assinatura para liberar o plano no backend e manter o acesso regular.";

  if (!currentWorkspace) {
    return (
      <div
        className={`theme-dashboard-${themeMode} min-h-screen ${dashboardTheme.layout} px-6 py-10 text-zinc-100`}
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Workspace
            </p>
            <h1 className="text-4xl font-semibold text-white">
              Crie ou selecione uma empresa para começar
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400">
              O novo layout do Nano fica muito melhor quando o workspace já está
              criado, porque aí o painel monta dashboard, movimentações e
              relatórios com base no seu contexto.
            </p>
          </div>

          <Card className={`${dashboardTheme.panel} p-6`}>
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
                placeholder="Subdomínio"
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
                placeholder="Descrição"
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
      className={`theme-dashboard-${themeMode}`}
    >
    <div
      className={`${dashboardTheme.layout} text-zinc-100 ${
        activeSection === "assistant"
          ? "h-screen overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <Sidebar
        items={visibleNavigationItems}
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

      <main
        className={`lg:pl-[108px] ${activeSection === "assistant" ? "h-full overflow-hidden" : ""}`}
      >
        <div
          className={`mx-auto max-w-[1720px] px-4 py-4 sm:px-6 lg:px-8 ${
            activeSection === "assistant"
              ? "h-full max-w-none overflow-hidden"
              : ""
          }`}
        >
          {activeSection !== "assistant" && (
            <DashboardHeader
              ShieldCheckIcon={ShieldCheck}
              SparklesIcon={Sparkles}
              TopIconButton={TopIconButton}
              SearchIcon={Search}
              BellIcon={Bell}
              ThemeIcon={themeMode === "light" ? Sun : Moon}
              ScopeSwitcher={ScopeSwitcher}
              activeSectionMeta={activeSectionMeta}
              billingDescription={billingDescription}
              billingHeadline={billingHeadline}
              billingStatusLabels={billingStatusLabels}
              navigate={navigate}
              setFinancialView={setFinancialView}
              shouldShowBillingCta={shouldShowBillingCta}
              subscriptionAccess={subscriptionAccess}
              themeMode={themeMode}
              toggleThemeMode={toggleThemeMode}
              topNanoInsights={topNanoInsights}
              financialView={financialView}
            />
          )}

          {loading ? (
            <div
              className={`${dashboardTheme.panel} px-6 py-16 text-center text-zinc-400`}
            >
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

      {OPEN_FINANCE_ENABLED ? (
        <PluggyConnectDialog
          open={Boolean(pluggyWidgetSession?.connectToken)}
          connectToken={pluggyWidgetSession?.connectToken}
          updateItem={pluggyWidgetSession?.updateItem || undefined}
          includeSandbox={Boolean(pluggyWidgetSession?.includeSandbox)}
          onClose={closePluggyWidget}
          onSuccess={handlePluggySuccess}
          onError={handlePluggyError}
        />
      ) : null}
    </div>
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
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-red-200/65">
        {eyebrow}
      </p>
      <div>
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-[2.9rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          {description}
        </p>
      </div>
    </div>
    {action}
  </div>
);

const SurfacePanel = ({ title, action, children }) => (
  <Card className={`${dashboardTheme.panel} ${dashboardTheme.glow} p-6`}>
    {(title || action) && (
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          {title && (
            <h3 className="text-[18px] font-semibold tracking-tight text-white">
              {title}
            </h3>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </Card>
);

const TopIconButton = ({ icon: Icon, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`flex h-12 w-12 items-center justify-center ${dashboardTheme.panelSecondary} text-slate-400 transition hover:-translate-y-0.5 hover:text-red-200`}
  >
    <Icon className="h-4.5 w-4.5" />
  </button>
);

const ScopeSwitcher = ({ options, value, onChange }) => (
  <div className="flex items-center rounded-2xl border border-slate-700/30 bg-slate-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={`rounded-[14px] px-4 py-2 text-sm font-medium transition ${
          value === option.id
            ? "bg-[linear-gradient(135deg,rgba(127,29,29,0.42),rgba(15,23,42,0.88))] text-red-50 shadow-[0_8px_20px_rgba(127,29,29,0.18)]"
            : "text-slate-400 hover:bg-white/[0.05]"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const StatCard = ({ title, value, direction, trendData = [] }) => {
  const icon =
    direction === "up" ? (
      <ArrowUpRight className="h-4.5 w-4.5 text-emerald-300" />
    ) : direction === "down" ? (
      <ArrowDownRight className="h-4.5 w-4.5 text-rose-300" />
    ) : (
      <Wallet className="h-4.5 w-4.5 text-amber-300" />
    );

  const sparkline = trendData
    .slice(-6)
    .map((item) => (direction === "down" ? item.expense : item.income));
  const maxSpark = Math.max(...sparkline, 1);
  return (
    <Card
      className={`${dashboardTheme.panel} ${dashboardTheme.glow} p-5 transition duration-300 hover:-translate-y-1`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(239,68,68,0.14),rgba(251,191,36,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {icon}
        </span>
      </div>
      <div className="mt-4 h-8">
        <svg viewBox="0 0 100 20" className="h-full w-full">
          <polyline
            fill="none"
            stroke={direction === "down" ? "#f97316" : "#34d399"}
            strokeWidth="2"
            points={sparkline
              .map((point, index) => {
                const x = (index / Math.max(sparkline.length - 1, 1)) * 100;
                const y = 20 - ((point || 0) / maxSpark) * 18;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>
      </div>
    </Card>
  );
};

const StatMiniCard = ({ label, value }) => (
  <div
    className={`${dashboardTheme.panelSecondary} ${dashboardTheme.glow} p-4`}
  >
    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const GhostChip = ({ children }) => (
  <span
    className={`inline-flex h-11 items-center ${dashboardTheme.panelSecondary} px-4 text-sm font-medium text-zinc-300`}
  >
    {children}
  </span>
);

const TrendChart = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className={`${dashboardTheme.panelSecondary} h-[300px] p-4`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.10)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                background: "rgba(2,6,23,0.82)",
                border: "1px solid rgba(148,163,184,0.18)",
                borderRadius: "14px",
                backdropFilter: "blur(16px)",
              }}
              labelStyle={{ color: "#f4f4f5" }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#34d399"
              strokeWidth={2.5}
              fill="url(#incomeGradient)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#fb7185"
              strokeWidth={2.5}
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-5 text-sm">
          <span className="flex items-center gap-2 text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Receitas
          </span>
          <span className="flex items-center gap-2 text-rose-300">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
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

const CategoryChart = ({ data }) => (
  <div className={`${dashboardTheme.panelSecondary} h-[300px] p-4`}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="rgba(148,163,184,0.10)"
        />
        <XAxis
          dataKey="category"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip
          contentStyle={{
            background: "rgba(2,6,23,0.82)",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: "14px",
            backdropFilter: "blur(16px)",
          }}
          labelStyle={{ color: "#f4f4f5" }}
        />
        <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const CashflowChart = ({ data }) => (
  <div className={`${dashboardTheme.panelSecondary} h-[300px] p-4`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="rgba(148,163,184,0.10)"
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip
          contentStyle={{
            background: "rgba(2,6,23,0.82)",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: "14px",
            backdropFilter: "blur(16px)",
          }}
          labelStyle={{ color: "#f4f4f5" }}
        />
        <Area
          type="monotone"
          dataKey="projected"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fillOpacity={0.25}
          fill="#f59e0b"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const CalendarPanel = ({ days, selectedDate, onDaySelect, formatter }) => (
  <div>
    <div className="mb-4 grid grid-cols-7 gap-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
        <span key={day}>{day}</span>
      ))}
    </div>
    <div className="grid grid-cols-7 gap-3">
      {days.map((day, index) => (
        <div
          key={index}
          onClick={() => onDaySelect(day.date)}
          className={`min-h-[110px] cursor-pointer rounded-[20px] border p-3 text-sm transition ${
            day.isCurrentMonth
              ? "border-slate-700/30 bg-slate-950/55 text-zinc-200 backdrop-blur-sm"
              : "border-slate-800/60 bg-slate-950/25 text-slate-600"
          } ${day.isToday ? "bg-[linear-gradient(180deg,rgba(127,29,29,0.34),rgba(15,23,42,0.7))] shadow-[0_18px_36px_rgba(127,29,29,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]" : ""} ${selectedDate === day.date ? "ring-1 ring-red-300/40" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span
              className={
                day.isToday ? "font-semibold text-red-100" : "text-slate-200"
              }
            >
              {day.label}
            </span>
            {day.dueCount > 0 && (
              <span className="rounded-full bg-red-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                {day.dueCount}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1.5 text-[10px] leading-none">
            <div className="flex items-center justify-between text-emerald-300">
              <span>Entradas</span>
              <span>{formatter.format(day.income || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-rose-300">
              <span>Saidas</span>
              <span>{formatter.format(day.expense || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Liq.</span>
              <span>{formatter.format(day.net || 0)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px]">
            {day.hasReminder && (
              <span className="rounded-full bg-amber-500/25 px-1 text-amber-300">
                L
              </span>
            )}
            {day.hasActivity && (
              <span className="rounded-full bg-emerald-500/25 px-1 text-emerald-300">
                A
              </span>
            )}
            {day.hasDue && (
              <span className="rounded-full bg-rose-500/25 px-1 text-rose-300">
                V
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CalendarDaySummary = ({ day, formatter }) => {
  if (!day) {
    return (
      <p className="text-sm text-zinc-400">
        Selecione um dia no calendário para ver movimentações e lembretes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatMiniCard
          label="Entradas"
          value={formatter.format(day.income || 0)}
        />
        <StatMiniCard
          label="Saidas"
          value={formatter.format(day.expense || 0)}
        />
        <StatMiniCard
          label="Saldo liquido"
          value={formatter.format(day.net || 0)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className={`${dashboardTheme.panelSecondary} p-4`}>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Movimentações
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {day.transactions?.length || 0}
          </p>
        </div>
        <div className={`${dashboardTheme.panelSecondary} p-4`}>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Lembretes
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {day.reminders?.length || 0}
          </p>
        </div>
        <div className={`${dashboardTheme.panelSecondary} p-4`}>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Contas vencendo
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {day.bills?.length || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({
  label,
  value,
  valueClass = "text-white",
  strong = false,
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 py-4 last:border-b-0">
    <span className="text-sm font-medium text-zinc-300">{label}</span>
    <span
      className={`${strong ? "text-3xl" : "text-lg"} font-semibold ${valueClass}`}
    >
      {value}
    </span>
  </div>
);

const InfoRow = ({ title, subtitle, value }) => (
  <div
    className={`flex items-center justify-between gap-4 ${dashboardTheme.panelSecondary} px-4 py-4`}
  >
    <div>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
    <span className="text-right text-sm font-semibold text-white">{value}</span>
  </div>
);

const AlertRow = ({ title, message, tone }) => {
  const toneClass =
    tone === "positive"
      ? "border-emerald-500/22 bg-[linear-gradient(135deg,rgba(6,78,59,0.32),rgba(2,6,23,0.72))] text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/22 bg-[linear-gradient(135deg,rgba(120,53,15,0.3),rgba(2,6,23,0.72))] text-amber-200"
        : "border-slate-700/30 bg-[linear-gradient(135deg,rgba(69,10,10,0.28),rgba(2,6,23,0.72))] text-zinc-200";

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-7">{message}</p>
    </div>
  );
};

const CenteredEmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-700/30 bg-[linear-gradient(180deg,rgba(2,6,23,0.56),rgba(9,9,11,0.38))] px-6 py-10 text-center backdrop-blur-sm">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(239,68,68,0.16),rgba(251,191,36,0.08))] text-red-200">
      <Icon className="h-7 w-7" />
    </div>
    <h4 className="mt-5 text-[28px] font-semibold text-white">{title}</h4>
    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
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
  <div className="rounded-[28px] border border-dashed border-slate-700/30 bg-[linear-gradient(180deg,rgba(2,6,23,0.56),rgba(9,9,11,0.38))] px-6 py-14 text-center backdrop-blur-sm">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(239,68,68,0.16),rgba(251,191,36,0.08))] text-red-200">
      <Icon className="h-7 w-7" />
    </div>
    <h4 className="mt-6 text-[34px] font-semibold text-white">{title}</h4>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
      {description}
    </p>
    <div className="mx-auto mt-6 max-w-lg rounded-[24px] border border-slate-700/30 bg-slate-950/55 p-5 backdrop-blur-sm">
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
  <Card
    className={`${dashboardTheme.panel} ${dashboardTheme.glow} sticky top-4 p-5`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-200">
          <Target className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="font-semibold text-white">Primeiros passos</p>
          <p className="text-sm text-slate-400">
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
          className="rounded-[22px] border border-slate-700/30 bg-slate-950/55 p-4 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                step.done
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-slate-700/30 bg-slate-950/60 text-slate-600"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            <div>
              <p className="font-medium text-white">{step.label}</p>
              {!step.done && (
                <p className="mt-1 text-sm text-slate-400">
                  Esse ponto ainda está pendente.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
        <span>Navegue entre as etapas</span>
        <span>
          {completedSteps} de {steps.length}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800/80">
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
    <span className="text-[#166534]">
      {currencyFormatter.format(income || 0)}
    </span>
    <span className="text-[#b91c1c]">
      {currencyFormatter.format(expense || 0)}
    </span>
    <span className={negative ? "text-[#b91c1c]" : "text-[#166534]"}>
      {currencyFormatter.format(balance || 0)}
    </span>
    <span className={negative ? "text-[#b91c1c]" : "text-white"}>
      {currencyFormatter.format(Math.abs(balance || income || expense || 0))}
    </span>
  </div>
);

const SecurityCard = ({ title, description, actionLabel }) => (
  <div className="rounded-[24px] border border-slate-700/30 bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
      </div>
      <Button type="button" className={`h-10 ${actionButtonClass}`}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  </div>
);

const ToggleRow = ({ label, helper, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-700/30 bg-slate-950/55 p-4 backdrop-blur-sm">
    <div>
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-400">{helper}</p>
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
