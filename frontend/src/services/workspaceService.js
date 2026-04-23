import axios from "axios";
import { API_BASE_URL } from "../config/env";

const API = API_BASE_URL;

const workspaceService = {
  async extractCnpjCard(workspaceId, file) {
    const formData = new FormData();
    formData.append("document", file);

    const response = await axios.post(
      `${API}/workspaces/${workspaceId}/extract-cnpj-card`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },
};

export default workspaceService;
