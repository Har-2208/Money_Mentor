import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function calculateTax(formData) {
  try {
    const response = await apiClient.post("/api/tax-calculate", formData);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to calculate tax.";
    throw new Error(message);
  }
}

export default {
  calculateTax,
};
