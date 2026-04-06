import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const assistantService = {
  sendMessage(content) {
    return axios.post(`${API}/assistant/message`, { content }).then((response) => response.data);
  },

  getHistory() {
    return axios.get(`${API}/assistant/history`).then((response) => response.data);
  },

  getStatus() {
    return axios.get(`${API}/assistant/voice-status`).then((response) => response.data);
  },

  synthesizeSpeech(payload) {
    return axios.post(`${API}/assistant/speech`, payload, { responseType: "blob" });
  },

  transcribeAudio(formData) {
    return axios
      .post(`${API}/assistant/transcribe`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => response.data);
  },

  clearHistory() {
    return axios.delete(`${API}/assistant/clear`).then((response) => response.data);
  },
};

export default assistantService;
