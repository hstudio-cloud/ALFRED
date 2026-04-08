import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

export const financeService = {
  getOverview(workspaceId, params = {}) {
    return axios
      .get(`${API}/finance/overview`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getAccounts(workspaceId, params = {}) {
    return axios
      .get(`${API}/accounts`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createAccount(workspaceId, payload) {
    return axios
      .post(`${API}/accounts`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateAccount(workspaceId, accountId, payload) {
    return axios
      .put(`${API}/accounts/${accountId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteAccount(workspaceId, accountId) {
    return axios
      .delete(`${API}/accounts/${accountId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getCards(workspaceId, params = {}) {
    return axios
      .get(`${API}/accounts/cards`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createCard(workspaceId, payload) {
    return axios
      .post(`${API}/accounts/cards`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateCard(workspaceId, cardId, payload) {
    return axios
      .put(`${API}/accounts/cards/${cardId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteCard(workspaceId, cardId) {
    return axios
      .delete(`${API}/accounts/cards/${cardId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getTransactions(workspaceId, params = {}) {
    return axios
      .get(`${API}/transactions`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createTransaction(workspaceId, payload) {
    return axios
      .post(`${API}/transactions`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateTransaction(workspaceId, transactionId, payload) {
    return axios
      .put(`${API}/transactions/${transactionId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteTransaction(workspaceId, transactionId) {
    return axios
      .delete(`${API}/transactions/${transactionId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getCategories(workspaceId, params = {}) {
    return axios
      .get(`${API}/finances/categories`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createCategory(workspaceId, payload) {
    return axios
      .post(`${API}/finances/categories`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateCategory(workspaceId, categoryId, payload) {
    return axios
      .put(`${API}/finances/categories/${categoryId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteCategory(workspaceId, categoryId) {
    return axios
      .delete(`${API}/finances/categories/${categoryId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getBills(workspaceId, params = {}) {
    return axios
      .get(`${API}/finances/bills`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createBill(workspaceId, payload) {
    return axios
      .post(`${API}/finances/bills`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateBill(workspaceId, billId, payload) {
    return axios
      .put(`${API}/finances/bills/${billId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteBill(workspaceId, billId) {
    return axios
      .delete(`${API}/finances/bills/${billId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  generateRecurringBills(workspaceId) {
    return axios
      .post(`${API}/finances/bills/generate-recurring`, null, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getReminders(workspaceId) {
    return axios
      .get(`${API}/finances/reminders`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  createReminder(workspaceId, payload) {
    return axios
      .post(`${API}/finances/reminders`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateReminder(workspaceId, reminderId, payload) {
    return axios
      .put(`${API}/finances/reminders/${reminderId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteReminder(workspaceId, reminderId) {
    return axios
      .delete(`${API}/finances/reminders/${reminderId}`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },
};

export default financeService;
