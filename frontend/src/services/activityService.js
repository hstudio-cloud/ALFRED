import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

const activityService = {
  getActivities(workspaceId, params = {}) {
    return axios
      .get(`${API}/activities`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createActivity(workspaceId, payload) {
    return axios
      .post(`${API}/activities`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateActivity(workspaceId, activityId, payload) {
    return axios
      .put(`${API}/activities/${activityId}`, payload, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },

  deleteActivity(workspaceId, activityId) {
    return axios
      .delete(`${API}/activities/${activityId}`, {
        params: withWorkspace(workspaceId),
      })
      .then((response) => response.data);
  },
};

export default activityService;
