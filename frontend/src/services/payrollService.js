import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
};

export default payrollService;
