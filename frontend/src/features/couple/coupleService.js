import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function generatePlan(formData) {
  try {
    const response = await apiClient.post("/api/couple-plan", formData);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to generate couple plan.";
    throw new Error(message);
  }
}

export default {
  generatePlan,
};
