import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

const nanoOpsService = {
  getStatus(workspaceId) {
    return axios
      .get(`${API}/nano-ops/status`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getTasks(workspaceId, params = {}) {
    return axios
      .get(`${API}/nano-ops/tasks`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getConfirmations(workspaceId) {
    return axios
      .get(`${API}/nano-ops/confirmations`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getAutomations(workspaceId) {
    return axios
      .get(`${API}/nano-ops/automations`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateAutomation(workspaceId, automationId, payload) {
    return axios
      .patch(`${API}/nano-ops/automations/${automationId}`, payload, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  getAudits(workspaceId) {
    return axios
      .get(`${API}/nano-ops/audits`, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  linkWhatsapp(workspaceId, payload) {
    return axios
      .post(`${API}/nano-ops/whatsapp/link`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  createWhatsappLinkCode(workspaceId) {
    return axios
      .post(`${API}/nano-ops/whatsapp/link-code`, {}, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },
};

export default nanoOpsService;
