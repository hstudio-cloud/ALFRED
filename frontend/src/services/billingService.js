import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

export const billingService = {
  getSubscription(workspaceId) {
    return axios
      .get(`${API}/billing/subscription`, { params: workspaceId ? { workspace_id: workspaceId } : {} })
      .then((response) => response.data);
  },

  createCheckout(payload) {
    return axios.post(`${API}/billing/checkout`, payload).then((response) => response.data);
  },

  createStripePortal(payload) {
    return axios.post(`${API}/billing/stripe/customer-portal`, payload).then((response) => response.data);
  },
};

export default billingService;
