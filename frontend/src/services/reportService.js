import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

export const reportService = {
  getOverview(workspaceId, params = {}) {
    return axios
      .get(`${API}/reports/overview`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getMonthly(workspaceId, params = {}) {
    return axios
      .get(`${API}/reports/monthly`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getByCategory(workspaceId, params = {}) {
    return axios
      .get(`${API}/reports/by-category`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getByAccount(workspaceId, params = {}) {
    return axios
      .get(`${API}/reports/by-account`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getCashflow(workspaceId, params = {}) {
    return axios
      .get(`${API}/reports/cashflow`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },
};

export default reportService;
