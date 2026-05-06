import { useCallback, useState } from "react";
import axios from "axios";

import activityService from "../../services/activityService";
import financeService from "../../services/financeService";
import openFinanceService from "../../services/openFinanceService";
import reportService from "../../services/reportService";

const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = (promise, timeoutMs = REQUEST_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
    ),
  ]);

export default function useDashboardData({
  activeSectionRef,
  apiBaseUrl,
  financialView,
  logout,
  openFinanceEnabled,
  navigate,
  reportPeriod,
  toast,
  setOpenFinanceAccounts,
  setOpenFinanceConnections,
}) {
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
  const [activities, setActivities] = useState([]);
  const [statementImports, setStatementImports] = useState([]);

  const loadAll = useCallback(async (workspaceId) => {
    if (!workspaceId) return;

    const shouldBlockUi = activeSectionRef.current !== "assistant";
    if (shouldBlockUi) {
      setLoading(true);
    }

    try {
      const tasks = [
        withTimeout(
          axios.get(
            `${apiBaseUrl}/dashboard/stats?workspace_id=${workspaceId}&account_scope=${financialView}`,
          ),
        ),
        withTimeout(
          financeService.getOverview(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
        ),
        withTimeout(
          financeService.getTransactions(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
        ),
        withTimeout(
          financeService.getBills(workspaceId, {
            account_scope: financialView,
          }),
        ),
        withTimeout(
          financeService.getCategories(workspaceId, {
            account_scope: financialView,
          }),
        ),
        withTimeout(financeService.getReminders(workspaceId)),
        withTimeout(
          activityService.getActivities(
            workspaceId,
            financialView === "general" ? {} : { account_scope: financialView },
          ),
        ),
        withTimeout(
          financeService.getAccounts(workspaceId, {
            account_scope: financialView,
          }),
        ),
        withTimeout(
          financeService.getCards(workspaceId, {
            account_scope: financialView,
          }),
        ),
        withTimeout(
          reportService.getOverview(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
        ),
        withTimeout(
          reportService.getMonthly(workspaceId, {
            account_scope: financialView,
            months: 6,
          }),
        ),
        withTimeout(
          reportService.getByCategory(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
        ),
        withTimeout(
          reportService.getByAccount(workspaceId, {
            account_scope: financialView,
            period: reportPeriod,
          }),
        ),
        withTimeout(
          reportService.getCashflow(workspaceId, {
            account_scope: financialView,
          }),
        ),
        withTimeout(axios.get(`${apiBaseUrl}/finances/imports?workspace_id=${workspaceId}`)),
        withTimeout(
          axios.get(
            `${apiBaseUrl}/dashboard/insights?workspace_id=${workspaceId}&account_scope=${financialView}`,
          ),
        ),
        ...(openFinanceEnabled
          ? [
              withTimeout(openFinanceService.getConnections(workspaceId)),
              withTimeout(openFinanceService.getAccounts(workspaceId)),
            ]
          : []),
      ];

      const results = await Promise.allSettled(tasks);
      const getValue = (index, fallback) =>
        results[index]?.status === "fulfilled" ? results[index].value : fallback;
      const hasUnauthorized = results.some(
        (item) =>
          item.status === "rejected" &&
          (item.reason?.response?.status === 401 || item.reason?.status === 401),
      );
      if (hasUnauthorized) {
        logout();
        navigate("/login");
        toast({
          title: "Sessão expirada",
          description: "Sua autenticação expirou no backend. Faça login novamente para carregar o painel.",
          variant: "destructive",
        });
        return;
      }

      const statsRes = getValue(0, { data: {} });
      const financeOverview = getValue(1, {});
      const transactionRes = getValue(2, []);
      const billRes = getValue(3, []);
      const categoryRes = getValue(4, []);
      const reminderRes = getValue(5, []);
      const activityRes = getValue(6, { items: [] });
      const accountRes = getValue(7, []);
      const cardRes = getValue(8, []);
      const reportOverviewRes = getValue(9, null);
      const monthlyReportRes = getValue(10, { months: [] });
      const categoryReportRes = getValue(11, { categories: [] });
      const accountReportRes = getValue(12, { accounts: [] });
      const cashflowRes = getValue(13, null);
      const statementImportsRes = getValue(14, { data: [] });
      const dashboardInsightsRes = getValue(15, { data: { insights: [] } });
      const openFinanceConnectionsRes = getValue(16, { items: [] });
      const openFinanceAccountsRes = getValue(17, { items: [] });

      const normalizeCollection = (value) => {
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.items)) return value.items;
        if (Array.isArray(value?.connections)) return value.connections;
        if (Array.isArray(value?.accounts)) return value.accounts;
        return [];
      };

      setStats(statsRes?.data || {});
      setSummary(financeOverview?.summary || null);
      setReport(financeOverview?.report || null);
      setForecast(financeOverview?.forecast || null);
      setAutomationInsights(financeOverview?.alerts?.insights || []);
      setTransactions(transactionRes || []);
      setBills(billRes || []);
      setCategories(categoryRes || []);
      setReminders(reminderRes || []);
      setActivities(activityRes?.items || []);
      setAccounts(accountRes || []);
      setCards(cardRes || []);
      setReportOverview(reportOverviewRes || null);
      setMonthlyReport(monthlyReportRes?.months || []);
      setCategoryReport(categoryReportRes?.categories || []);
      setAccountReport(accountReportRes?.accounts || []);
      setCashflowReport(cashflowRes || null);
      setStatementImports(statementImportsRes?.data || []);
      setInsights(dashboardInsightsRes?.data?.insights || []);
      setOpenFinanceConnections(
        openFinanceEnabled ? normalizeCollection(openFinanceConnectionsRes) : [],
      );
      setOpenFinanceAccounts(
        openFinanceEnabled ? normalizeCollection(openFinanceAccountsRes) : [],
      );

      const failedRequests = results.filter((item) => item.status === "rejected");
      if (failedRequests.length > 0) {
        toast({
          title: "Painel carregado parcialmente",
          description: "Alguns blocos não responderam a tempo. O Nano abriu o dashboard com os dados disponíveis.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Não consegui carregar o painel",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      if (shouldBlockUi) {
        setLoading(false);
      }
    }
  }, [
    activeSectionRef,
    apiBaseUrl,
    financialView,
    logout,
    openFinanceEnabled,
    navigate,
    reportPeriod,
    setOpenFinanceAccounts,
    setOpenFinanceConnections,
    toast,
  ]);

  return {
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
    setLoading,
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
  };
}
