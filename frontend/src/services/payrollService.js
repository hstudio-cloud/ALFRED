import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const withWorkspace = (workspaceId, params = {}) => ({
  ...params,
  workspace_id: workspaceId,
});

export const payrollService = {
  getEmployees(workspaceId, params = {}) {
    return axios
      .get(`${API}/payroll/employees`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  createEmployee(workspaceId, payload) {
    return axios
      .post(`${API}/payroll/employees`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateEmployee(workspaceId, employeeId, payload) {
    return axios
      .put(`${API}/payroll/employees/${employeeId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  deleteEmployee(workspaceId, employeeId, hardDelete = false) {
    return axios
      .delete(`${API}/payroll/employees/${employeeId}`, { params: withWorkspace(workspaceId, { hard_delete: hardDelete }) })
      .then((response) => response.data);
  },

  getAttendance(workspaceId, params = {}) {
    return axios
      .get(`${API}/payroll/attendance`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  registerAttendance(workspaceId, payload) {
    return axios
      .post(`${API}/payroll/attendance`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  updateAttendance(workspaceId, attendanceId, payload) {
    return axios
      .put(`${API}/payroll/attendance/${attendanceId}`, payload, { params: withWorkspace(workspaceId) })
      .then((response) => response.data);
  },

  getPayrollReport(workspaceId, params = {}) {
    return axios
      .get(`${API}/payroll/report`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  getPayrollEstimate(workspaceId, params = {}) {
    return axios
      .get(`${API}/payroll/estimate`, { params: withWorkspace(workspaceId, params) })
      .then((response) => response.data);
  },

  importPayrollSheet(workspaceId, file) {
    const formData = new FormData();
    formData.append("document", file);
    return axios
      .post(`${API}/payroll/import-sheet`, formData, {
        params: withWorkspace(workspaceId),
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => response.data);
  },
};

export default payrollService;
