import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

const openFinanceService = {
  createConnectToken(workspaceId, payload = {}) {
    return axios
      .post(`${API}/open-finance/connect/token`, payload, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  connectCallback(workspaceId, payload) {
    return axios
      .post(`${API}/open-finance/connect/callback`, payload, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  getConnections(workspaceId) {
    return axios
      .get(`${API}/open-finance/connections`, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  syncConnection(workspaceId, connectionId, payload = {}) {
    return axios
      .post(`${API}/open-finance/connections/${connectionId}/sync`, { payload }, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  getAccounts(workspaceId) {
    return axios
      .get(`${API}/open-finance/accounts`, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  getTransactions(workspaceId, params = {}) {
    return axios
      .get(`${API}/open-finance/transactions`, {
        params: withWorkspace(workspaceId, params),
      })
      .then((response) => response.data);
  },

  deleteConnection(workspaceId, connectionId) {
    return axios
      .delete(`${API}/open-finance/connections/${connectionId}`, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },
};

export default openFinanceService;

