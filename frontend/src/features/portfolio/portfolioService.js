import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

async function uploadPortfolio(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await apiClient.post("/feature/portfolio-xray", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to analyze portfolio.";
    throw new Error(message);
  }
}

export default {
  uploadPortfolio,
};
